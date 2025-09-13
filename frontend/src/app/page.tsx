'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ClaimCard } from '@/components/ClaimCard';
import { ClaimDetailsPanel } from '@/components/ClaimDetailsPanel';
import { ClassificationStats } from '@/components/ClassificationStats';
import { MOCK_CLAIM_RESPONSES, ClaimResponse } from '@/lib/mock-data';

export default function Dashboard() {
  const [url, setUrl] = useState('');
  const [selected, setSelected] = useState<ClaimResponse | null>(null);
  const videoId = useMemo(() => extractYouTubeId(url), [url]);
  const embedUrl = useMemo(() => {
    if (!videoId) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${encodeURIComponent(origin)}`;
  }, [videoId]);
  const playerRef = useRef<any>(null);

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

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-900 overflow-hidden">
      {/* Decorative gradient glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-rose-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-gradient-to-tr from-rose-500/20 via-fuchsia-500/20 to-indigo-500/30 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 bg-gradient-to-r from-indigo-200 via-fuchsia-300 to-rose-200 bg-clip-text text-transparent drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
          YouTube Fact‑Checker
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left column: existing fields */}
          <div>
            <div className="mb-8 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-xl transition-transform duration-300 hover:-translate-y-0.5">
              <div className="p-6">
                <label htmlFor="yt-url" className="block text-sm font-medium text-indigo-100 mb-2">
                  Paste a YouTube URL
                </label>
                <input
                  id="yt-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2 rounded-lg bg-white/5 text-white placeholder-white/50 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400/40"
                  inputMode="url"
                />
                <p className="text-xs text-indigo-200/70 mt-2">
                  As soon as a valid YouTube URL is detected, the video will appear below.
                </p>
              </div>
            </div>

            {embedUrl ? (
              <div className="relative group rounded-2xl p-[2px] bg-gradient-to-br from-indigo-500/40 via-fuchsia-500/30 to-rose-500/30 shadow-2xl">
                <div className="aspect-video w-full rounded-[14px] overflow-hidden bg-black ring-1 ring-white/10 group-hover:ring-indigo-400/30 transition">
                  <iframe
                    title="YouTube video"
                    id="yt-iframe"
                    src={embedUrl}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition duration-500 blur-2xl bg-gradient-to-r from-indigo-500/10 via-fuchsia-500/10 to-rose-500/10" />
              </div>
            ) : (
              <div className="text-indigo-100/70 text-sm">Enter a valid YouTube URL to preview the video.</div>
            )}

            <div className="mt-10">
              <div className="mb-4 flex items-center gap-3">
                <div className="h-6 w-1 rounded bg-gradient-to-b from-indigo-400 to-fuchsia-400" />
                <h2 className="text-lg font-semibold text-indigo-100 tracking-tight">Claims</h2>
              </div>
            </div>

            <div className="space-y-3">
              {MOCK_CLAIM_RESPONSES.slice(0, 4).map((cr, idx) => (
                <ClaimCard
                  key={idx}
                  data={cr}
                  selected={selected?.claim.claim === cr.claim.claim && selected?.claim.start === cr.claim.start}
                  onSelect={handleSelectClaim}
                />
              ))}
            </div>
          </div>

          {/* Right column: stats + claim details */}
          <div>
            <div className="space-y-6">
              <ClassificationStats data={MOCK_CLAIM_RESPONSES} />
              <ClaimDetailsPanel data={selected} />
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