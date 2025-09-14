'use client';

import { ClaimResponse, ClaimStatus } from '@/lib/mock-data';

interface Props {
  data: ClaimResponse;
  selected?: boolean;
  onSelect?: (data: ClaimResponse) => void;
}

export function ClaimCard({ data, selected = false, onSelect }: Props) {
  const { claim, status } = data;

  return (
    <button
      type="button"
      onClick={() => onSelect && onSelect(data)}
      className={`w-full text-left glass-card ring-glow p-4 transition ${
        selected ? 'ring-2 ring-indigo-400/40 border-white/20' : 'hover:border-white/20'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs text-slate-400 mb-1">
            {formatTime(claim.start)} - {formatTime(claim.end)}
          </div>
          <p className="text-slate-100 leading-relaxed">{claim.claim}</p>
        </div>
        <span className={`ml-4 inline-flex items-center px-3.5 py-1.5 rounded-full text-sm font-semibold tracking-wide shadow ${statusColor(status)}`}>
          {statusLabel(status)}
        </span>
      </div>
    </button>
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


