'use client';

import { ClaimResponse } from '@/lib/mock-data';
import { calculateClassificationRates } from '@/lib/stats';

interface Props {
  data: ClaimResponse[];
}

export function ClassificationStats({ data }: Props) {
  const rates = calculateClassificationRates(data);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-indigo-100">Classification Rates</h2>
      <p className="text-sm text-indigo-200/70">Based on {rates.total} claims</p>

      <div className="mt-5 space-y-4 text-sm">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-indigo-200/90">Verified</span>
            <span className="font-semibold text-emerald-300">{rates.verifiedPct}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded bg-white/10 overflow-hidden">
            <div
              className="h-full rounded bg-gradient-to-r from-emerald-400 to-emerald-300"
              style={{ width: `${rates.verifiedPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-indigo-200/90">False</span>
            <span className="font-semibold text-rose-300">{rates.falsePct}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded bg-white/10 overflow-hidden">
            <div
              className="h-full rounded bg-gradient-to-r from-rose-400 to-rose-300"
              style={{ width: `${rates.falsePct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-indigo-200/90">Disputed</span>
            <span className="font-semibold text-amber-300">{rates.disputedPct}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded bg-white/10 overflow-hidden">
            <div
              className="h-full rounded bg-gradient-to-r from-amber-400 to-amber-300"
              style={{ width: `${rates.disputedPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-indigo-200/90">Inconclusive</span>
            <span className="font-semibold text-slate-300">{rates.inconclusivePct}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded bg-white/10 overflow-hidden">
            <div
              className="h-full rounded bg-gradient-to-r from-slate-400 to-slate-300"
              style={{ width: `${rates.inconclusivePct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


