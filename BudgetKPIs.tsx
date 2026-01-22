import React, { useMemo } from 'react';
import { PieChart, ShieldCheck, TrendingUp } from 'lucide-react';
import { BudgetEnvelope, EnvelopeType } from './types';

// Utils
const formatCurrency = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

interface BudgetKPIsProps {
  envelopes: BudgetEnvelope[];
}

export default function BudgetKPIs({ envelopes }: BudgetKPIsProps) {
  
  // Computed Totals
  const stats = useMemo(() => {
    const totalRun = envelopes.filter(e => e.type === EnvelopeType.RUN).reduce((sum, e) => sum + e.amount, 0);
    const totalChange = envelopes.filter(e => e.type === EnvelopeType.CHANGE).reduce((sum, e) => sum + e.amount, 0);
    const total = totalRun + totalChange;
    return { totalRun, totalChange, total };
  }, [envelopes]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <PieChart className="w-6 h-6" />
          </div>
          <h3 className="text-slate-500 font-medium">Total Budget</h3>
        </div>
        <p className="text-3xl font-bold text-slate-800">{formatCurrency(stats.total)}</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-slate-500 font-medium">Total RUN</h3>
        </div>
        <p className="text-3xl font-bold text-slate-800">{formatCurrency(stats.totalRun)}</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${stats.total ? (stats.totalRun / stats.total) * 100 : 0}%` }} />
          </div>
          <span className="text-xs text-slate-500 font-medium">{stats.total ? Math.round((stats.totalRun / stats.total) * 100) : 0}%</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-slate-500 font-medium">Total CHANGE</h3>
        </div>
        <p className="text-3xl font-bold text-slate-800">{formatCurrency(stats.totalChange)}</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${stats.total ? (stats.totalChange / stats.total) * 100 : 0}%` }} />
          </div>
          <span className="text-xs text-slate-500 font-medium">{stats.total ? Math.round((stats.totalChange / stats.total) * 100) : 0}%</span>
        </div>
      </div>
    </div>
  );
}
