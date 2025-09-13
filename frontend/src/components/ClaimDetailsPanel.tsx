'use client';

import { ClaimResponse, ClaimStatus } from '@/lib/mock-data';

interface Props {
  data?: ClaimResponse | null;
}

export function ClaimDetailsPanel({ data }: Props) {
  if (!data) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-indigo-100">Details</h2>
        <p className="text-sm text-indigo-200/70 mt-2">Select a claim to view its details.</p>
      </div>
    );
  }

  const { claim, status, summary, evidence } = data;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-xl">
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold text-indigo-100">Claim Details</h2>
        <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

      <div className="mt-4">
        <div className="text-xs text-indigo-200/80">Timestamp</div>
        <div className="text-sm text-indigo-100">
          {formatTime(claim.start)} - {formatTime(claim.end)}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-indigo-200/80">Claim</div>
        <p className="text-indigo-50 leading-relaxed mt-1">{claim.claim}</p>
      </div>

      <div className="mt-6">
        <div className="text-xs text-indigo-200/80">Reasoning Summary</div>
        <p className="text-indigo-50 leading-relaxed mt-1 text-sm">{summary}</p>
      </div>

      {evidence && evidence.length > 0 && (
        <div className="mt-6">
          <div className="text-xs text-indigo-200/80">Sources</div>
          <ul className="mt-2 space-y-3">
            {evidence.map((e, idx) => (
              <li key={idx} className="text-sm">
                <a
                  href={e.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-200 hover:text-white font-medium"
                >
                  {e.source_title}
                </a>
                <p className="text-indigo-200/80 mt-1 leading-relaxed">{e.excerpt}</p>
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
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    case ClaimStatus.FALSE:
      return 'bg-rose-100 text-rose-800 border border-rose-200';
    case ClaimStatus.DISPUTED:
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    case ClaimStatus.INCONCLUSIVE:
    default:
      return 'bg-slate-100 text-slate-800 border border-slate-200';
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


