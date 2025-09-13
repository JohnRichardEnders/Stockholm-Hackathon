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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">YouTube Fact-Checker</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Left column: existing fields */}
          <div>
            <div className="bg-white p-6 rounded-lg shadow mb-8">
              <label htmlFor="yt-url" className="block text-sm font-medium text-gray-700 mb-2">
                Paste a YouTube URL
              </label>
              <input
                id="yt-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                inputMode="url"
              />
              <p className="text-xs text-gray-500 mt-2">
                As soon as a valid YouTube URL is detected, the video will appear below.
              </p>
            </div>

            {embedUrl ? (
              <div className="aspect-video w-full bg-black rounded-lg overflow-hidden shadow">
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
              <div className="text-gray-500 text-sm">Enter a valid YouTube URL to preview the video.</div>
            )}

            <div className="mt-8 space-y-3">
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