'use client';

import { ClaimResponse } from '@/lib/mock-data';
import { calculateClassificationRates } from '@/lib/stats';

interface Props {
  data: ClaimResponse[];
}

export function ClassificationStats({ data }: Props) {
  const rates = calculateClassificationRates(data);

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900">Classification Rates</h2>
      <p className="text-sm text-gray-500">Based on {rates.total} claims</p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-700">Verified</span>
          <span className="font-semibold text-green-700">{rates.verifiedPct}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-700">False</span>
          <span className="font-semibold text-red-700">{rates.falsePct}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-700">Disputed</span>
          <span className="font-semibold text-yellow-700">{rates.disputedPct}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-700">Inconclusive</span>
          <span className="font-semibold text-gray-700">{rates.inconclusivePct}%</span>
        </div>
      </div>
    </div>
  );
}


