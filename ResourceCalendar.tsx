import React, { useState, useMemo } from 'react';
import { ArrowLeft, Gift, Layers, Check, Download, ChevronLeft, ChevronRight, Calculator, Banknote, Loader2, CalendarRange } from 'lucide-react';
import { format, endOfMonth, eachDayOfInterval, isWeekend, addDays, startOfMonth } from 'date-fns';
import { Resource, OverrideValue, Country } from './types';
import { calculateDayStatus } from './utils';

const formatCurrency = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

// Helper to format string date YYYY-MM-DD to DD/MM/YYYY for display
const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

interface ResourceCalendarProps {
  resource: Resource;
  onUpdateOverride: (date: string, value: OverrideValue | undefined) => void;
  onBulkUpdate: (start: Date, end: Date, value: OverrideValue | undefined) => void;
  onUpdateResource: (id: string, updates: Partial<Resource>) => void;
  onApplyHolidays: (id: string, year: number, holidays: string[]) => void;
  onBack: () => void;
}

export default function ResourceCalendar({ resource, onUpdateOverride, onBulkUpdate, onUpdateResource, onApplyHolidays, onBack }: ResourceCalendarProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statsMode, setStatsMode] = useState<'days' | 'cost'>('days');
  const [isLoadingHolidays, setIsLoadingHolidays] = useState(false);
  
  // Bulk Edit State
  const [bulkStart, setBulkStart] = useState('');
  const [bulkEnd, setBulkEnd] = useState('');
  const [bulkValue, setBulkValue] = useState<string>('0');

  const handleDayClick = (date: Date) => {
    const { isOutOfBounds, val, defaultVal } = calculateDayStatus(date, resource);
    if (isOutOfBounds) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    let nextVal: OverrideValue = val === 1 ? 0.5 : val === 0.5 ? 0 : 1;
    onUpdateOverride(dateStr, nextVal === defaultVal ? undefined : nextVal);
  };

  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = e.target.value;
    setBulkStart(newStart);
    
    // Automatically set End Date to Start Date + 1 day for convenience
    if (newStart) {
        try {
            const startDate = parseLocalDate(newStart);
            const nextDay = addDays(startDate, 1);
            setBulkEnd(format(nextDay, 'yyyy-MM-dd'));
        } catch (error) {
            // If date is invalid, ignore auto-set
        }
    }
  };

  const toggleStatsMode = () => setStatsMode(prev => prev === 'days' ? 'cost' : 'days');

  const handleBulkApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkStart || !bulkEnd) return;
    
    const start = parseLocalDate(bulkStart);
    const end = parseLocalDate(bulkEnd);
    
    if (start > end) {
        alert("Start date must be before end date");
        return;
    }

    onBulkUpdate(start, end, bulkValue === 'default' ? undefined : parseFloat(bulkValue) as OverrideValue);
    setSelectedYear(start.getFullYear());
  };

  const handleLoadHolidays = async () => {
    setIsLoadingHolidays(true);
    try {
        // Fetch from Public API
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${selectedYear}/${resource.country}`);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        // Extract date strings (YYYY-MM-DD)
        const holidays: string[] = data.map((h: any) => h.date);

        setIsLoadingHolidays(false);

        if (holidays.length === 0) {
            alert(`No holidays returned from API for ${resource.country} in ${selectedYear}.`);
            return;
        }

        if (window.confirm(`Found ${holidays.length} public holidays for ${resource.country} in ${selectedYear} via API.\n\nLoad them into the calendar as 'Off' days?`)) {
            onApplyHolidays(resource.id, selectedYear, holidays);
        }

    } catch (error) {
        setIsLoadingHolidays(false);
        console.error("Failed to load holidays:", error);
        alert(`Failed to load holidays: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Yearly Stats Calculation
  const yearlyStats = useMemo(() => {
    let total = 0;
    const start = new Date(selectedYear, 0, 1);
    const end = new Date(selectedYear, 11, 31);
    const days = eachDayOfInterval({ start, end });
    
    days.forEach(day => {
        const { val, isOutOfBounds } = calculateDayStatus(day, resource);
        if (!isOutOfBounds) {
            total += val;
        }
    });
    return total;
  }, [selectedYear, resource.overrides, resource.country, resource.startDate, resource.endDate]);

  const yearlyCost = yearlyStats * resource.tjm;

  // Monthly Stats Calculation Helper
  // Optimized: Calculate all months at once in a memo if needed, but here simple usage is fine.
  // For better performance, we could compute all monthly stats in one loop, but let's keep it simple for now as per plan.
  const getMonthlyStats = (monthIndex: number) => {
    let total = 0;
    const start = startOfMonth(new Date(selectedYear, monthIndex, 1));
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });
    
    days.forEach(day => {
        const { val, isOutOfBounds } = calculateDayStatus(day, resource);
        if (!isOutOfBounds) {
            total += val;
        }
    });
    return total;
  };

  // Generate Year Data
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header Toolbar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              {resource.firstName} {resource.lastName}
              <select 
                value={resource.country}
                onChange={(e) => onUpdateResource(resource.id, { country: e.target.value as Country })}
                className="text-sm font-normal bg-slate-100 pl-2 pr-8 py-1 rounded text-slate-600 border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                {Object.values(Country).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <CalendarRange className="w-3 h-3" />
                <span>Contract: {formatDateDisplay(resource.startDate)} to {formatDateDisplay(resource.endDate)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex items-center gap-4 text-xs font-medium text-slate-500 border-r border-slate-200 pr-6">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-white border border-slate-200 rounded-sm"></div> Work (1.0)</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded-sm"></div> Half (0.5)</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-200 border border-slate-300 rounded-sm"></div> Off (0)</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-stripes-red rounded-sm border border-red-200"></div> Holiday</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-300 rounded-sm border border-slate-400"></div> Not Emp.</span>
            </div>

            <div 
                onDoubleClick={toggleStatsMode}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer select-none
                    ${statsMode === 'days' 
                        ? 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                    }
                `}
                title="Double-click to toggle Days / Cost view"
            >
                {statsMode === 'days' ? (
                    <>
                        <Calculator className="w-4 h-4" />
                        <span className="text-sm font-bold">{yearlyStats} days</span>
                    </>
                ) : (
                    <>
                        <Banknote className="w-4 h-4" />
                        <span className="text-sm font-bold">{formatCurrency(yearlyCost)}</span>
                    </>
                )}
                <span className="text-xs opacity-75 ml-1">in {selectedYear}</span>
            </div>

            <button 
                onClick={handleLoadHolidays}
                disabled={isLoadingHolidays}
                className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Load standard holidays for ${resource.country} in ${selectedYear}`}
            >
                {isLoadingHolidays ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isLoadingHolidays ? 'Loading...' : 'Load Holidays'}
            </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Mass Update */}
        <div className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto shrink-0 z-10">
          <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-brand-600" />
              Mass Update
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Select a date range to apply a presence rate to multiple days at once.
            </p>
            <form onSubmit={handleBulkApply} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                <input 
                  type="date" 
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  value={bulkStart}
                  onChange={handleStartDateChange}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                <input 
                  type="date" 
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  value={bulkEnd}
                  onChange={(e) => setBulkEnd(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Value To Apply</label>
                <select 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                >
                  <option value="0">0% (Off / Leave)</option>
                  <option value="0.5">50% (Half Day)</option>
                  <option value="1">100% (Working Day)</option>
                  <option value="default">Reset to Standard</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors mt-2"
              >
                <Check className="w-4 h-4" /> Apply Changes
              </button>
            </form>
          </div>
        </div>

        {/* Main Content: Linear Calendar Grid */}
        <div className="flex-1 overflow-auto bg-white p-6 relative">
             <div className="flex items-center justify-center gap-4 mb-6 sticky left-0">
                <span className="text-xl font-bold text-slate-800">{selectedYear}</span>
            </div>

            <div className="w-full">
                {/* 
                   GRID DEFINITION: 
                   1st Col: 140px fixed for Month Label
                   Rest: 31 columns each taking 1 fraction (1fr) of available space.
                */}
                <div className="grid grid-cols-[140px_repeat(31,1fr)] gap-px bg-slate-200 border border-slate-200 shadow-sm">
                    {/* Header Row */}
                    <div className="bg-slate-100 p-2 font-semibold text-xs text-slate-500 sticky top-0 left-0 z-20 shadow-sm text-center">Month</div>
                    {Array.from({ length: 31 }, (_, i) => (
                        <div key={i} className="bg-slate-50 p-2 text-center text-xs font-semibold text-slate-500 sticky top-0 z-10">
                            {i + 1}
                        </div>
                    ))}

                    {/* Month Rows */}
                    {months.map(monthIndex => {
                        const monthStart = new Date(selectedYear, monthIndex, 1);
                        const daysInMonth = endOfMonth(monthStart).getDate();
                        const monthlyStatsVal = getMonthlyStats(monthIndex);
                        const monthlyCostVal = monthlyStatsVal * resource.tjm;

                        return (
                            <React.Fragment key={monthIndex}>
                                <div className="bg-white p-2 sticky left-0 z-10 border-r border-slate-100 flex flex-col items-center justify-center shadow-[1px_0_3px_rgba(0,0,0,0.05)] overflow-hidden">
                                    <span className="font-bold text-xs text-slate-700 capitalize leading-tight">
                                        {format(monthStart, 'MMM')}
                                    </span>
                                    <div 
                                        onDoubleClick={toggleStatsMode}
                                        className={`
                                            mt-1 flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-md border cursor-pointer select-none transition-all w-full
                                            ${statsMode === 'days' 
                                                ? 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100' 
                                                : 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                                            }
                                        `}
                                        title="Double-click to toggle mode"
                                    >
                                        <span className="text-[10px] font-bold whitespace-nowrap">
                                            {statsMode === 'days' ? (
                                                <div className="flex items-center gap-1">
                                                    <Calculator className="w-3 h-3" />
                                                    {monthlyStatsVal} days
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <Banknote className="w-3 h-3" />
                                                    {formatCurrency(monthlyCostVal)}
                                                </div>
                                            )}
                                        </span>
                                    </div>
                                </div>
                                {Array.from({ length: 31 }, (_, dayIndex) => {
                                    const dayNum = dayIndex + 1;
                                    
                                    if (dayNum > daysInMonth) {
                                        return <div key={dayIndex} className="bg-slate-900 relative" />; 
                                    }

                                    const currentDate = new Date(selectedYear, monthIndex, dayNum);
                                    const { val, isHoliday, isWknd, overrideActive, isOutOfBounds } = calculateDayStatus(currentDate, resource);

                                    // Base Background for Out of Bounds
                                    if (isOutOfBounds) {
                                        return (
                                            <div 
                                                key={dayIndex}
                                                className="bg-slate-50 border-white relative h-10 flex items-center justify-center cursor-not-allowed overflow-hidden"
                                                title="Not employed during this period"
                                                style={{
                                                  backgroundImage: 'repeating-linear-gradient(45deg, #f8fafc, #f8fafc 10px, #f1f5f9 10px, #f1f5f9 20px)'
                                                }}
                                            >
                                            </div>
                                        );
                                    }

                                    let bgClass = 'bg-white';
                                    
                                    if (val === 0) {
                                        if (isHoliday) {
                                            bgClass = 'bg-[linear-gradient(45deg,#fee2e2_25%,#ffffff_25%,#ffffff_50%,#fee2e2_50%,#fee2e2_75%,#ffffff_75%,#ffffff_100%)] bg-[length:8px_8px]';
                                        } else if (isWknd) {
                                            bgClass = 'bg-slate-200';
                                        } else {
                                            bgClass = 'bg-red-100';
                                        }
                                    } else if (val === 0.5) {
                                        bgClass = 'bg-amber-100';
                                    } else if (val === 1) {
                                        bgClass = 'bg-white';
                                        if (isWknd || isHoliday) bgClass = 'bg-green-100';
                                    }

                                    return (
                                        <button 
                                            key={dayIndex}
                                            onClick={() => handleDayClick(currentDate)}
                                            className={`
                                                relative h-10 border-white hover:z-10 hover:ring-2 hover:ring-blue-500 transition-all
                                                flex items-center justify-center group
                                                ${bgClass}
                                            `}
                                            title={`${formatDateDisplay(format(currentDate, 'yyyy-MM-dd'))}: ${val * 100}% ${isHoliday ? '(Holiday)' : ''}`}
                                        >
                                            <span className={`text-[10px] font-medium ${isWknd || val === 0 ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {val === 0.5 ? '½' : ''}
                                                {val === 0 && !isWknd && !isHoliday ? '0' : ''}
                                            </span>
                                            
                                            {isHoliday && (
                                                <Gift className="w-3 h-3 text-red-400 opacity-70" />
                                            )}

                                            {/* Dot Override Indicator */}
                                            {overrideActive && (
                                                <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full z-20 shadow-sm" title="Manual Override Active" />
                                            )}
                                        </button>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}