// ====== config ======
const BACKEND_BASE = "http://localhost:8000";
const STREAM_PATH  = "/api/process-video/stream";
// ====================

let inflightAbort = null;
let streamReader = null;

function getVideoUrl() {
  const u = new URL(location.href);
  return (u.hostname.endsWith("youtube.com") && u.pathname === "/watch" && u.searchParams.get("v"))
    ? u.toString() : null;
}

function getVideoEl() {
  return document.querySelector("video");
}

/* ---------- UI ---------- */
function ensurePanel() {
  if (document.getElementById("yfchecker-panel")) return;

  const panel = document.createElement("div");
  panel.id = "yfchecker-panel";
  panel.innerHTML = `
    <div class="yfc-header">
      <span class="yfc-dot"></span>
      <span class="yfc-title">Fact-Checker (Live)</span>
      <button class="yfc-close" title="Hide">×</button>
    </div>
    <div class="yfc-body">
      <div class="yfc-status">Idle</div>
      <div class="yfc-stream">
        <ul class="yfc-sentences"></ul>
      </div>
    </div>
    <div class="yfc-footer">
      <label class="yfc-inline"><input id="yfc-autoscroll" type="checkbox" checked> Auto-scroll</label>
      <small class="yfc-hint">Streaming transcript & checks</small>
    </div>
  `;
  document.documentElement.appendChild(panel);

  const css = document.createElement("style");
  css.textContent = `
    #yfchecker-panel {
      position: fixed; top: 80px; right: 16px; width: 380px; max-height: 70vh;
      background: #0f0f0f; color: #eee; font-family: system-ui, -apple-system, Segoe UI, Roboto;
      font-size: 13px; border: 1px solid #2a2a2a; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.4);
      display: flex; flex-direction: column; z-index: 2147483647; overflow: hidden;
    }
    .yfc-header{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#1a1a1a;border-bottom:1px solid #2a2a2a;}
    .yfc-dot{width:8px;height:8px;border-radius:50%;background:#666;box-shadow:0 0 0 0 rgba(0,200,0,.7);animation:yfc-pulse 1.6s infinite;}
    @keyframes yfc-pulse{0%{box-shadow:0 0 0 0 rgba(0,200,0,.5);}70%{box-shadow:0 0 0 8px rgba(0,200,0,0);}100%{box-shadow:0 0 0 0 rgba(0,200,0,0);}}
    .yfc-title{font-weight:600}
    .yfc-close{margin-left:auto;background:transparent;border:none;color:#aaa;font-size:16px;cursor:pointer;}
    .yfc-close:hover{color:#fff}
    .yfc-body{padding:8px 10px;overflow:auto;flex:1}
    .yfc-status{color:#bbb;margin-bottom:6px}
    .yfc-stream{overflow:auto;max-height:calc(70vh - 110px)}
    .yfc-sentences{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
    .yfc-sent{border:1px solid #2a2a2a;border-radius:6px;padding:8px;background:#151515}
    .yfc-sent.future{opacity:.45;filter:saturate(.6)}
    .yfc-sent.current{border-color:#3a6ff7}
    .yfc-sent .yfc-time{font-size:12px;color:#aaa;margin-bottom:4px}
    .yfc-claim{margin-top:6px;padding:6px;border-radius:6px;background:#111;border:1px dashed #333}
    .yfc-fc{margin-top:6px;padding:6px;border-radius:6px;background:#101010;border:1px solid #2a2a2a}
    .yfc-badge{padding:1px 6px;border-radius:999px;border:1px solid #333;text-transform:capitalize;margin-left:6px}
    .yfc-badge.verified{background:#0d4429;color:#9ffcc2;border-color:#145a36}
    .yfc-badge.false{background:#4a0e12;color:#ffb3b3;border-color:#7a1a21}
    .yfc-badge.disputed{background:#3a2a00;color:#ffec99;border-color:#5a4300}
    .yfc-badge.inconclusive{background:#1d2a44;color:#c4dcff;border-color:#28406c}
    .yfc-footer{border-top:1px solid #2a2a2a;padding:6px 10px;background:#141414;color:#888;display:flex;justify-content:space-between;align-items:center}
    .yfc-inline{display:flex;align-items:center;gap:6px}
  `;
  document.documentElement.appendChild(css);

  panel.querySelector(".yfc-close").addEventListener("click", () => {
    panel.remove();
    if (inflightAbort) inflightAbort.abort();
  });
}

function setStatus(text) {
  ensurePanel();
  document.querySelector("#yfchecker-panel .yfc-status").textContent = text;
}

/* sentence/claim stores */
const sentences = []; // [{start, text, el, claims:[], factChecks:[]}]
function addSentence(start, text) {
  ensurePanel();
  const list = document.querySelector("#yfchecker-panel .yfc-sentences");

  const li = document.createElement("li");
  li.className = "yfc-sent future";
  li.dataset.start = String(start);
  li.innerHTML = `
    <div class="yfc-time">${formatTime(start)}</div>
    <div class="yfc-text">${escapeHtml(text)}</div>
    <div class="yfc-children"></div>
  `;
  list.appendChild(li);

  const rec = { start, text, el: li, claims: [], factChecks: [] };
  sentences.push(rec);

  autoscrollMaybe(li);
  return rec;
}

function findSentenceForStart(start) {
  // Find the sentence with the closest start time
  return sentences.find(s => Math.abs(s.start - start) < 0.1) || sentences[sentences.length - 1];
}

function addClaim(start, claimText) {
  const s = findSentenceForStart(start);
  const box = document.createElement("div");
  box.className = "yfc-claim";
  box.textContent = `Claim: ${claimText}`;
  (s?.el.querySelector(".yfc-children") || s?.el)?.appendChild(box);
  s?.claims.push({ claim: claimText, el: box });
  autoscrollMaybe(box);
}

function addFactCheck(start, claimText, status, summary, evidence) {
  const s = findSentenceForStart(start);
  const fc = document.createElement("div");
  fc.className = "yfc-fc";
  fc.innerHTML = `
    <div><strong>Fact-check</strong><span class="yfc-badge ${escapeAttr(status)}">${escapeHtml(status)}</span></div>
    <div style="margin-top:4px">${escapeHtml(summary || "")}</div>
    ${renderEvidence(evidence)}
  `;
  (s?.el.querySelector(".yfc-children") || s?.el)?.appendChild(fc);
  s?.factChecks.push({ status, el: fc });
  autoscrollMaybe(fc);
}

function renderEvidence(evidence) {
  if (!Array.isArray(evidence) || !evidence.length) return "";
  const items = evidence.slice(0, 5).map(e =>
    `<li><a href="${escapeAttr(e.url)}" target="_blank" rel="noopener">${escapeHtml(e.title || e.url || "source")}</a><br><small>${escapeHtml(e.snippet || "")}</small></li>`
  ).join("");
  return `<details style="margin-top:6px"><summary>Evidence (${evidence.length})</summary><ul style="margin:6px 0 0 18px">${items}</ul></details>`;
}

/* time syncing */
function tickSync() {
  const v = getVideoEl();
  if (!v) return;
  const now = v.currentTime || 0; // seconds
  const lookahead = 0.75; // show soon-upcoming lines too
  let currentMarked = null;

  for (const s of sentences) {
    const cls = s.el.classList;
    if (s.start <= now + lookahead) {
      cls.remove("future");
      // mark the closest past sentence as current
      if (!currentMarked || (Math.abs(s.start - now) < Math.abs(currentMarked.start - now) && s.start <= now)) {
        currentMarked = s;
      }
    } else {
      cls.add("future");
      cls.remove("current");
    }
  }
  // highlight current
  sentences.forEach(s => s.el.classList.remove("current"));
  if (currentMarked) currentMarked.el.classList.add("current");
}

setInterval(tickSync, 400);

/* streaming */
async function startStream(videoUrl) {
  ensurePanel();
  setStatus("Connecting…");

  // abort previous
  if (inflightAbort) inflightAbort.abort();
  inflightAbort = new AbortController();

  // reset UI store
  sentences.splice(0, sentences.length);
  const list = document.querySelector("#yfchecker-panel .yfc-sentences");
  if (list) list.innerHTML = "";

  const body = JSON.stringify({ url: videoUrl });
  const resp = await fetch(`${BACKEND_BASE}${STREAM_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/jsonl" },
    body,
    signal: inflightAbort.signal
  });

  if (!resp.ok || !resp.body) {
    setStatus(`Error ${resp.status}`);
    return;
  }

  setStatus("Streaming…");
  const reader = resp.body.getReader();
  streamReader = reader;
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      console.log("reading");
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        console.log("line", line);  
        handleLine(line);
      }
    }
  } catch (e) {
    if (e.name !== "AbortError") {
      setStatus("Stream error");
      console.warn("Stream error", e);
    }
  } finally {
    setStatus("Done");
  }
}

function handleLine(line) {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }

  if (msg.type === "start") {
    setStatus("Transcribing…");
    return;
  }
  if (msg.type === "sentence") {
    addSentence(Number(msg.start || 0), String(msg.text || ""));
    return;
  }
  if (msg.type === "claim") {
    addClaim(Number(msg.start || 0), String(msg.claim || ""));
    return;
  }
  if (msg.type === "fact_check") {
    addFactCheck(
      Number(msg.start || 0),
      String(msg.claim || ""),
      String(msg.status || "inconclusive"),
      String(msg.summary || ""),
      Array.isArray(msg.evidence) ? msg.evidence : []
    );
    return;
  }
  if (msg.type === "error") {
    setStatus(`Error: ${msg.message || "unknown"}`);
    return;
  }
  if (msg.type === "done") {
    setStatus("Completed");
    return;
  }
}

/* SPA navigation hooks */
function onNavigate() {
  const url = getVideoUrl();
  if (!url) return;
  startStream(url).catch(err => {
    if (err.name !== "AbortError") {
      setStatus("Failed to start");
      console.error(err);
    }
  });
}
function setupNavHooks() {
  window.addEventListener("yt-navigate-finish", onNavigate);
  const _ps = history.pushState;
  history.pushState = function () { _ps.apply(this, arguments); setTimeout(onNavigate, 50); };
  const _rs = history.replaceState;
  history.replaceState = function () { _rs.apply(this, arguments); setTimeout(onNavigate, 50); };
  window.addEventListener("popstate", () => setTimeout(onNavigate, 50));
  // first load
  onNavigate();
}

/* helpers */
function formatTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`;
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function escapeAttr(s){return String(s).replace(/"/g,"&quot;")}

function autoscrollMaybe(el) {
  const box = document.querySelector("#yfchecker-panel .yfc-body");
  if (!box) return;
  const auto = document.getElementById("yfc-autoscroll");
  if (auto && auto.checked) {
    el.scrollIntoView({ block: "end", behavior: "smooth" });
  }
}

/* boot */
ensurePanel();
setupNavHooks();
