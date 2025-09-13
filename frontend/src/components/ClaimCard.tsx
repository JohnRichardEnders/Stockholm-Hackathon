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
      className={`w-full text-left rounded-xl border shadow-lg p-4 transition group overflow-hidden ${
        selected
          ? 'border-indigo-400 ring-2 ring-indigo-300/40 bg-white'
          : 'border-white/10 bg-white/5 backdrop-blur hover:bg-white/10 hover:border-white/20'
      }`}
    >
      <div className="flex items-start justify-between relative">
        <div className="flex-1">
          <div className="text-xs mb-1 text-indigo-200/80">
            {formatTime(claim.start)} - {formatTime(claim.end)}
          </div>
          <p className={`leading-relaxed ${selected ? 'text-gray-900' : 'text-indigo-50'}`}>{claim.claim}</p>
        </div>
        <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(status)}`}>
          {statusLabel(status)}
        </span>
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-300 bg-gradient-to-r from-indigo-500/0 via-fuchsia-500/5 to-rose-500/0" />
      </div>
    </button>
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


