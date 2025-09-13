'use client';

import { ClaimResponse, ClaimStatus } from '@/lib/mock-data';

interface Props {
  data?: ClaimResponse | null;
}

export function ClaimDetailsPanel({ data }: Props) {
  if (!data) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Details</h2>
        <p className="text-sm text-gray-500 mt-2">Select a claim to view its details.</p>
      </div>
    );
  }

  const { claim, status, summary, evidence } = data;

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Claim Details</h2>
        <span className={`ml-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(status)}`}>
          {statusLabel(status)}
        </span>
      </div>

      <div className="mt-4">
        <div className="text-xs text-gray-500">Timestamp</div>
        <div className="text-sm text-gray-900">
          {formatTime(claim.start)} - {formatTime(claim.end)}
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs text-gray-500">Claim</div>
        <p className="text-gray-900 leading-relaxed mt-1">{claim.claim}</p>
      </div>

      <div className="mt-6">
        <div className="text-xs text-gray-500">Reasoning Summary</div>
        <p className="text-gray-900 leading-relaxed mt-1 text-sm">{summary}</p>
      </div>

      {evidence && evidence.length > 0 && (
        <div className="mt-6">
          <div className="text-xs text-gray-500">Sources</div>
          <ul className="mt-2 space-y-3">
            {evidence.map((e, idx) => (
              <li key={idx} className="text-sm">
                <a
                  href={e.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {e.source_title}
                </a>
                <p className="text-gray-600 mt-1 leading-relaxed">{e.excerpt}</p>
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


