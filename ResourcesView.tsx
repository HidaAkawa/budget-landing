import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, User, X, Check, Globe, CreditCard, Percent, Calendar as CalendarIcon, Calculator, Banknote, CalendarRange } from 'lucide-react';
import { Resource, Country, OverrideValue } from './types';
import ResourceCalendar from './ResourceCalendar';
import { format, eachDayOfInterval, isWeekend, startOfYear, endOfYear } from 'date-fns';
import { HOLIDAYS } from './constants';

// Utils
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatCurrency = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

// Helper to format string date YYYY-MM-DD to DD/MM/YYYY for display
const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

interface ResourcesViewProps {
  resources: Resource[];
  onAdd: (resource: Resource) => void;
  onUpdate: (id: string, resource: Partial<Resource>) => void;
  onDelete: (id: string) => void;
  onUpdateOverride: (resourceId: string, date: string, value: OverrideValue | undefined) => void;
  onBulkUpdateOverride?: (resourceId: string, start: Date, end: Date, value: OverrideValue | undefined) => void;
  onApplyHolidays?: (resourceId: string, year: number, holidays?: string[]) => void;
}

export default function ResourcesView({ resources, onAdd, onUpdate, onDelete, onUpdateOverride, onBulkUpdateOverride, onApplyHolidays }: ResourcesViewProps) {
  // View State: Store ID instead of object to prevent stale data
  const [calendarResourceId, setCalendarResourceId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear();
  const defaultStartDate = `${currentYear}-01-01`;
  const defaultEndDate = `${currentYear}-12-31`;

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [tjm, setTjm] = useState('');
  const [country, setCountry] = useState<Country>(Country.FR);
  const [ratioChange, setRatioChange] = useState<number>(30);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  // Helper to calculate yearly stats for a resource
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

  // Derive the active resource from the latest props
  const calendarResource = useMemo(() => 
    resources.find(r => r.id === calendarResourceId) || null
  , [resources, calendarResourceId]);

  // If a resource is selected for calendar, render the full screen calendar view
  if (calendarResource) {
    return (
        <ResourceCalendar 
            resource={calendarResource}
            onBack={() => setCalendarResourceId(null)}
            onUpdateOverride={(date, val) => onUpdateOverride(calendarResource.id, date, val)}
            onBulkUpdate={(start, end, val) => onBulkUpdateOverride && onBulkUpdateOverride(calendarResource.id, start, end, val)}
            onUpdateResource={onUpdate}
            onApplyHolidays={(id, year, holidays) => onApplyHolidays && onApplyHolidays(id, year, holidays)}
        />
    );
  }

  // --- Normal List View ---

  const handleEditClick = (res: Resource) => {
    setEditingId(res.id);
    setFirstName(res.firstName);
    setLastName(res.lastName);
    setTjm(res.tjm.toString());
    setCountry(res.country);
    setRatioChange(res.ratioChange);
    setStartDate(res.startDate || defaultStartDate);
    setEndDate(res.endDate || defaultEndDate);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setTjm('');
    setCountry(Country.FR);
    setRatioChange(30);
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !tjm || !startDate || !endDate) return;

    if (startDate > endDate) {
        alert("Start date must be before end date.");
        return;
    }

    const numericTjm = parseFloat(tjm);

    if (editingId) {
        onUpdate(editingId, {
            firstName,
            lastName,
            tjm: numericTjm,
            country,
            ratioChange,
            startDate,
            endDate
        });
        setEditingId(null);
    } else {
        onAdd({
            id: generateId(),
            firstName,
            lastName,
            tjm: numericTjm,
            country,
            ratioChange,
            startDate,
            endDate,
            overrides: {}
        });
    }
    
    setFirstName('');
    setLastName('');
    setTjm('');
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
  };

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* List */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
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
                                                onClick={() => setCalendarResourceId(res.id)}
                                                className="text-slate-400 hover:text-purple-600 hover:bg-purple-50 p-1.5 rounded transition-colors flex items-center gap-1"
                                                title="Manage Calendar"
                                            >
                                                <CalendarIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleEditClick(res)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => onDelete(res.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
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

        {/* Form */}
        <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit transition-all ${editingId ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
             <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                {editingId ? (
                    <>
                        <Edit2 className="w-4 h-4 text-blue-600" />
                        Edit Resource
                    </>
                ) : (
                    <>
                        <Plus className="w-4 h-4 text-brand-600" />
                        Add New Resource
                    </>
                )}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">First Name</label>
                        <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="John" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name</label>
                        <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="Doe" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3"/> TJM (€)</label>
                         <input type="number" required min="0" value={tjm} onChange={e => setTjm(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono" placeholder="500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Globe className="w-3 h-3"/> Country</label>
                        <select value={country} onChange={e => setCountry(e.target.value as Country)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
                            {Object.values(Country).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 mt-2">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
                        <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-xs" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
                        <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-xs" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex justify-between">
                        <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> Ratio Change</span>
                        <span className="text-purple-600 font-bold">{ratioChange}%</span>
                    </label>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5" 
                        value={ratioChange} 
                        onChange={e => setRatioChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                </div>

                <div className="flex gap-2 mt-4 pt-2 border-t border-slate-100">
                    {editingId && (
                        <button type="button" onClick={handleCancelEdit} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors">Cancel</button>
                    )}
                    <button type="submit" className={`flex-1 font-medium py-2 rounded-lg text-sm transition-colors text-white ${editingId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                        {editingId ? 'Update' : 'Add Resource'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
}