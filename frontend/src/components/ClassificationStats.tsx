'use client';

import { ClaimResponse } from '@/lib/mock-data';
import { calculateClassificationRates } from '@/lib/stats';

interface Props {
  data: ClaimResponse[];
}

export function ClassificationStats({ data }: Props) {
  const rates = calculateClassificationRates(data);

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-slate-100">Classification Rates</h2>
      <p className="text-sm text-slate-400">Based on {rates.total} claims</p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Verified</span>
          <span className="font-semibold text-emerald-300">{rates.verifiedPct}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">False</span>
          <span className="font-semibold text-rose-300">{rates.falsePct}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Disputed</span>
          <span className="font-semibold text-amber-300">{rates.disputedPct}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Inconclusive</span>
          <span className="font-semibold text-slate-300">{rates.inconclusivePct}%</span>
        </div>
      </div>
    </div>
  );
}


