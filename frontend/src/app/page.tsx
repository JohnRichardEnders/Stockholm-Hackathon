'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ClaimCard } from '@/components/ClaimCard';
import { ClaimDetailsPanel } from '@/components/ClaimDetailsPanel';
import { ClassificationStats } from '@/components/ClassificationStats';
import { ClaimResponse, ClaimStatus } from '@/lib/mock-data';

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [selected, setSelected] = useState<ClaimResponse | null>(null);
  const [results, setResults] = useState<ClaimResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStatuses, setActiveStatuses] = useState<ClaimStatus[]>([
    ClaimStatus.VERIFIED,
    ClaimStatus.FALSE,
    ClaimStatus.DISPUTED,
    ClaimStatus.INCONCLUSIVE,
  ]);
  const videoId = useMemo(() => extractYouTubeId(url), [url]);
  const embedUrl = useMemo(() => {
    if (!videoId) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(origin)}`;
  }, [videoId]);
  const playerRef = useRef<any>(null);

  const filteredResults = useMemo(
    () => results.filter((r) => activeStatuses.includes(r.status as ClaimStatus)),
    [results, activeStatuses]
  );

  useEffect(() => {
    if (!videoId) return;

    let canceled = false;

    function createPlayer() {
      if (canceled) return;
      const YTGlobal: any = (window as any).YT;
      if (!YTGlobal || !YTGlobal.Player) return;
      try {
        playerRef.current = new YTGlobal.Player('yt-iframe', {});
      } catch (err) {
        // Swallow errors during rapid mounts/unmounts
      }
    }

    // Load IFrame API if not present
    const YTGlobal: any = (window as any).YT;
    if (!YTGlobal || !YTGlobal.Player) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
      (window as any).onYouTubeIframeAPIReady = () => {
        createPlayer();
      };
    } else {
      createPlayer();
    }

    return () => {
      canceled = true;
      try {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
        }
      } catch {}
      playerRef.current = null;
    };
  }, [videoId]);

  function handleSelectClaim(d: ClaimResponse) {
    setSelected(d);
    try {
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(d.claim.start, true);
        if (typeof playerRef.current.playVideo === 'function') {
          playerRef.current.playVideo();
        }
      }
    } catch {}
  }

  async function handleAnalyze() {
    if (!url || !videoId) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    setResults([]);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const resp = await fetch(`${base}/api/process-video?video_url=${encodeURIComponent(url)}`);
      if (!resp.ok) {
        throw new Error(`Request failed: ${resp.status}`);
      }
      const data = await resp.json();
      const mapped: ClaimResponse[] = (data?.claim_responses || []).map((cr: any) => ({
        claim: {
          start: Number(cr?.claim?.start ?? 0),
          end: Number(cr?.claim?.start ?? 0), // backend does not provide end; mirror start
          claim: String(cr?.claim?.claim ?? ''),
        },
        status: (cr?.status as ClaimStatus) ?? ClaimStatus.INCONCLUSIVE,
        summary: String(cr?.written_summary ?? cr?.summary ?? ''),
        evidence: (cr?.evidence || []).map((e: any) => ({
          source_url: String(e?.source_url ?? ''),
          source_title: String(e?.source_title ?? ''),
          excerpt: String(e?.snippet ?? e?.excerpt ?? ''),
        })),
      }));
      setResults(mapped);
    } catch (e: any) {
      setError(e?.message || 'Failed to analyze video');
    } finally {
      setLoading(false);
    }
  }

  function toggleStatus(status: ClaimStatus) {
    setActiveStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="aurora-layer" />
      <div className="grid-vignette" />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight heading-gradient">YouTube Fact‑Checker</h1>
          <div className="hidden md:flex items-center gap-2 opacity-80 text-xs">
            <span className="px-2 py-1 rounded-md border border-white/10">ACI</span>
            <span className="px-2 py-1 rounded-md border border-white/10">RunPod</span>
            <span className="px-2 py-1 rounded-md border border-white/10">OpenAI</span>
            <span className="px-2 py-1 rounded-md border border-white/10">Whisper</span>

          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left column: existing fields */}
          <div>
            <div className="glass-card p-6 mb-8 ring-glow">
              <label htmlFor="yt-url" className="block text-sm font-medium text-slate-200 mb-2">
                Paste a YouTube URL
              </label>
              <input
                id="yt-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400/60 transition"
                inputMode="url"
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  disabled={!videoId || loading}
                  onClick={handleAnalyze}
                  className={`px-4 py-2 btn-gradient ${
                    !videoId || loading ? 'cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Analyzing…' : 'Analyze'}
                </button>
                {error && <span className="text-sm text-rose-300">{error}</span>}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                As soon as a valid YouTube URL is detected, the video will appear below.
              </p>
            </div>

            {embedUrl ? (
              <div className="aspect-video w-full video-shell overflow-hidden shadow" style={{ minHeight: '420px' }}>
                <iframe
                  title="YouTube video"
                  id="yt-iframe"
                  src={embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="text-slate-400 text-sm">Enter a valid YouTube URL to preview the video.</div>
            )}

            {/* Filters */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => toggleStatus(ClaimStatus.VERIFIED)}
                aria-pressed={activeStatuses.includes(ClaimStatus.VERIFIED)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${
                  activeStatuses.includes(ClaimStatus.VERIFIED)
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                    : 'bg-emerald-500/10 text-emerald-300/60 border-emerald-400/20'
                }`}
              >
                Verified
              </button>
              <button
                type="button"
                onClick={() => toggleStatus(ClaimStatus.FALSE)}
                aria-pressed={activeStatuses.includes(ClaimStatus.FALSE)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${
                  activeStatuses.includes(ClaimStatus.FALSE)
                    ? 'bg-rose-500/20 text-rose-200 border-rose-400/30'
                    : 'bg-rose-500/10 text-rose-300/60 border-rose-400/20'
                }`}
              >
                False
              </button>
              <button
                type="button"
                onClick={() => toggleStatus(ClaimStatus.DISPUTED)}
                aria-pressed={activeStatuses.includes(ClaimStatus.DISPUTED)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${
                  activeStatuses.includes(ClaimStatus.DISPUTED)
                    ? 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                    : 'bg-amber-500/10 text-amber-300/60 border-amber-400/20'
                }`}
              >
                Disputed
              </button>
              <button
                type="button"
                onClick={() => toggleStatus(ClaimStatus.INCONCLUSIVE)}
                aria-pressed={activeStatuses.includes(ClaimStatus.INCONCLUSIVE)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition ${
                  activeStatuses.includes(ClaimStatus.INCONCLUSIVE)
                    ? 'bg-slate-500/20 text-slate-200 border-slate-400/30'
                    : 'bg-slate-500/10 text-slate-300/60 border-slate-400/20'
                }`}
              >
                Inconclusive
              </button>
              <div className="ml-auto text-xs text-slate-400">
                Showing {filteredResults.length} of {results.length}
              </div>
            </div>

            <div
              className="mt-8 space-y-3 overflow-y-auto overscroll-auto pr-2 scroll-soft perf-layer scroll-prepaint"
              style={{ maxHeight: '70vh' }}
              tabIndex={0}
              aria-label="Claims list"
            >
              {results.length === 0 ? (
                <div className="text-slate-400 text-sm">{loading ? 'Finding claims…' : 'No claims yet. Run an analysis.'}</div>
              ) : filteredResults.length === 0 ? (
                <div className="text-slate-400 text-sm">No claims match current filters.</div>
              ) : (
                filteredResults.map((cr) => (
                  <div
                    key={`${cr.claim.start}-${cr.claim.claim}`}
                    className="transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <ClaimCard
                      data={cr}
                      selected={selected?.claim.claim === cr.claim.claim && selected?.claim.start === cr.claim.start}
                      onSelect={handleSelectClaim}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right column: stats + claim details */}
          <div>
            <div className="space-y-6">
              <div className="glass-card p-6 ring-glow">
                <ClassificationStats data={results} />
              </div>
              <div className="glass-card p-6 ring-glow">
                <ClaimDetailsPanel data={selected} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function extractYouTubeId(input: string): string | null {
  if (!input || input.trim().length === 0) return null;

  // Accept plain IDs
  const plainId = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(plainId)) return plainId;

  try {
    const url = new URL(input);

    if (url.hostname === 'youtu.be') {
      const id = url.pathname.replace('/', '');
      return id || null;
    }

    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v) return v;

      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
      if (embedMatch) return embedMatch[1];

      const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{6,})/);
      if (shortsMatch) return shortsMatch[1];
    }
  } catch {
    // not a URL
  }

  return null;
}