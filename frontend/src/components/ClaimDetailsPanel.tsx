'use client';

import { ClaimResponse, ClaimStatus } from '@/lib/mock-data';

interface Props {
  data?: ClaimResponse | null;
}

export function ClaimDetailsPanel({ data }: Props) {
  if (!data) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-slate-100">Details</h2>
        <p className="text-sm text-slate-400 mt-2">Select a claim to view its details.</p>
      </div>
    );
  }

  const { claim, status, summary, evidence } = data;

  return (
    <div>
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Claim Details</h2>
        <span className={`ml-4 inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-semibold tracking-wide shadow ${statusColor(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

      <div className="mt-4">
        <div className="text-xs text-slate-400">Timestamp</div>
        <div className="text-sm text-slate-100">
          {formatTime(claim.start)} - {formatTime(claim.end)}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-slate-400">Claim</div>
        <p className="text-slate-100 leading-relaxed mt-1">{claim.claim}</p>
      </div>

      <div className="mt-6">
        <div className="text-xs text-slate-400">Reasoning Summary</div>
        <p className="text-slate-100 leading-relaxed mt-1 text-sm">{summary}</p>
      </div>

      {evidence && evidence.length > 0 && (
        <div className="mt-6">
          <div className="text-xs text-slate-400">Sources</div>
          <ul className="mt-2 space-y-3">
            {evidence.map((e, idx) => (
              <li key={idx} className="text-sm">
                <a
                  href={e.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-300 hover:text-indigo-200 font-medium"
                >
                  {e.source_title}
                </a>
                <p className="text-slate-300/80 mt-1 leading-relaxed">{e.excerpt}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function statusColor(status: ClaimStatus) {
  switch (status) {
    case ClaimStatus.VERIFIED:
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30';
    case ClaimStatus.FALSE:
      return 'bg-rose-500/20 text-rose-300 border border-rose-400/30';
    case ClaimStatus.DISPUTED:
      return 'bg-amber-500/20 text-amber-300 border border-amber-400/30';
    case ClaimStatus.INCONCLUSIVE:
    default:
      return 'bg-slate-500/20 text-slate-300 border border-slate-400/30';
  }
}

function statusLabel(status: ClaimStatus) {
  return status.toString();
}

function formatTime(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mins}:${ss}`;
}


