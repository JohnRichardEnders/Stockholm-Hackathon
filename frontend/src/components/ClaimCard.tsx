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
      className={`w-full text-left bg-white rounded-lg border shadow p-4 transition ${
        selected ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">
            {formatTime(claim.start)} - {formatTime(claim.end)}
          </div>
          <p className="text-gray-900 leading-relaxed">{claim.claim}</p>
        </div>
        <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(status)}`}>
          {statusLabel(status)}
        </span>
      </div>
    </button>
  );
}

function statusColor(status: ClaimStatus) {
  switch (status) {
    case ClaimStatus.VERIFIED:
      return 'bg-green-100 text-green-800 border border-green-200';
    case ClaimStatus.FALSE:
      return 'bg-red-100 text-red-800 border border-red-200';
    case ClaimStatus.DISPUTED:
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case ClaimStatus.INCONCLUSIVE:
    default:
      return 'bg-gray-100 text-gray-800 border border-gray-200';
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


