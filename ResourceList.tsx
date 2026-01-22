import React, { useMemo } from 'react';
import { Trash2, Edit2, User, Calendar as CalendarIcon, Calculator, CalendarRange } from 'lucide-react';
import { Resource } from './types';
import { format, eachDayOfInterval, isWeekend, startOfYear, endOfYear } from 'date-fns';
import { HOLIDAYS } from './constants';

// Utils
const formatCurrency = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

interface ResourceListProps {
  resources: Resource[];
  onEdit: (resource: Resource) => void;
  onDelete: (id: string) => void;
  onCalendarClick: (id: string) => void;
  editingId: string | null;
  isReadOnly?: boolean;
}

export default function ResourceList({ resources, onEdit, onDelete, onCalendarClick, editingId, isReadOnly = false }: ResourceListProps) {
  const currentYear = new Date().getFullYear();
  const defaultStartDate = `${currentYear}-01-01`;
  const defaultEndDate = `${currentYear}-12-31`;

  // Helper to calculate yearly stats for a resource
  // TODO: Move this to a dedicated utility or hook in Phase 2
  const getResourceYearlyStats = useMemo(() => (res: Resource) => {
    let totalDays = 0;
    const start = startOfYear(new Date(currentYear, 0, 1));
    const end = endOfYear(start);
    const days = eachDayOfInterval({ start, end });
    
    const resStart = res.startDate || defaultStartDate;
    const resEnd = res.endDate || defaultEndDate;

    days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');

        // Check contract bounds
        if (dateStr < resStart || dateStr > resEnd) {
            return;
        }

        const isHoliday = HOLIDAYS[res.country]?.includes(dateStr);
        const isWknd = isWeekend(day);
        const defaultVal = (isHoliday || isWknd) ? 0 : 1;
        const override = res.overrides[dateStr];
        const val = override !== undefined ? override : defaultVal;
        totalDays += val;
    });

    return {
        days: totalDays,
        cost: totalDays * res.tjm
    };
  }, [currentYear]);

  return (
    <div className={`${isReadOnly ? 'lg:col-span-4' : 'lg:col-span-3'} bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col`}>
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-slate-500" />
                    Team Resources
                </h3>
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Pilotage {currentYear}</span>
            </div>
            <span className="bg-brand-100 text-brand-700 px-2 py-1 rounded text-xs font-medium">{resources.length} people</span>
        </div>
        
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Country</th>
                        <th className="px-6 py-4 text-right">TJM</th>
                        <th className="px-6 py-4 text-center">Days ({currentYear})</th>
                        <th className="px-6 py-4 text-right">Cost ({currentYear})</th>
                        <th className="px-6 py-4">Allocation (R/C)</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {resources.map(res => {
                        const stats = getResourceYearlyStats(res);
                        return (
                            <tr key={res.id} className={`hover:bg-slate-50 transition-colors group ${editingId === res.id ? 'bg-blue-50/50' : ''}`}>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-800">{res.firstName} {res.lastName}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 flex gap-1 items-center">
                                        <CalendarRange className="w-3 h-3" />
                                        {formatDateDisplay(res.startDate)} → {formatDateDisplay(res.endDate)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                        {res.country}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-xs text-slate-600">
                                    {formatCurrency(res.tjm)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                        <Calculator className="w-3 h-3" />
                                        {stats.days}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 font-mono">
                                        {formatCurrency(stats.cost)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 min-w-[120px]">
                                    <div className="flex flex-col gap-1">
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                            <div className="bg-orange-400 h-full" style={{ width: `${100 - res.ratioChange}%` }}></div>
                                            <div className="bg-purple-500 h-full" style={{ width: `${res.ratioChange}%` }}></div>
                                        </div>
                                        <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                            <span>R {100 - res.ratioChange}%</span>
                                            <span>C {res.ratioChange}%</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => onCalendarClick(res.id)}
                                            className="text-slate-400 hover:text-purple-600 hover:bg-purple-50 p-1.5 rounded transition-colors flex items-center gap-1"
                                            title="Manage Calendar"
                                        >
                                            <CalendarIcon className="w-4 h-4" />
                                        </button>
                                        {!isReadOnly && (
                                            <>
                                                <button onClick={() => onEdit(res)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => onDelete(res.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {resources.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No resources defined yet.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
}
