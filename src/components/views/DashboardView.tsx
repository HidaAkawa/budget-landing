import { useMemo } from 'react';
import { TrendingDown, TrendingUp, AlertCircle, CheckCircle, PieChart, Wallet } from 'lucide-react';
import { BudgetEnvelope, EnvelopeType, Resource } from '@/types';
import { startOfYear, endOfYear, eachDayOfInterval } from 'date-fns';
import { calculateDayStatus } from '@/utils';

const formatCurrency = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
const formatCompact = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 1, notation: "compact" }).format(val);

interface DashboardViewProps {
  envelopes: BudgetEnvelope[];
  resources: Resource[];
}

export default function DashboardView({ envelopes, resources }: DashboardViewProps) {
  const currentYear = new Date().getFullYear();

  // --- Calculation Logic ---
  const stats = useMemo(() => {
    // 1. Calculate Envelope Totals (Budget)
    const budgetRun = envelopes.filter(e => e.type === EnvelopeType.RUN).reduce((sum, e) => sum + e.amount, 0);
    const budgetChange = envelopes.filter(e => e.type === EnvelopeType.CHANGE).reduce((sum, e) => sum + e.amount, 0);
    const budgetTotal = budgetRun + budgetChange;

    // 2. Calculate Resource Totals (Forecast/Actuals)
    let forecastRun = 0;
    let forecastChange = 0;

    const start = startOfYear(new Date(currentYear, 0, 1));
    const end = endOfYear(start);
    const daysInterval = eachDayOfInterval({ start, end });

    resources.forEach(res => {
        // Calculate total days for this resource in current year
        let workingDays = 0;
        
        daysInterval.forEach(day => {
            const { val } = calculateDayStatus(day, res);
            workingDays += val;
        });

        const totalCost = workingDays * res.tjm;
        
        // Split based on Ratio
        const changePart = totalCost * (res.ratioChange / 100);
        const runPart = totalCost * ((100 - res.ratioChange) / 100);

        forecastRun += runPart;
        forecastChange += changePart;
    });

    const forecastTotal = forecastRun + forecastChange;

    // 3. Deltas
    const deltaTotal = budgetTotal - forecastTotal;
    const deltaRun = budgetRun - forecastRun;
    const deltaChange = budgetChange - forecastChange;

    // 4. Percentages
    const pctTotal = budgetTotal > 0 ? (forecastTotal / budgetTotal) * 100 : 0;
    const pctRun = budgetRun > 0 ? (forecastRun / budgetRun) * 100 : 0;
    const pctChange = budgetChange > 0 ? (forecastChange / budgetChange) * 100 : 0;

    return {
        budgetRun, budgetChange, budgetTotal,
        forecastRun, forecastChange, forecastTotal,
        deltaTotal, deltaRun, deltaChange,
        pctTotal, pctRun, pctChange
    };
  }, [envelopes, resources, currentYear]);


  // Helper Component for Cards
  const SummaryCard = ({ 
    title, 
    budget, 
    forecast, 
    delta, 
    percent, 
    colorClass, 
    barColorClass,
    icon: Icon 
  }: { 
    title: string, 
    budget: number, 
    forecast: number, 
    delta: number, 
    percent: number, 
    colorClass: string,
    barColorClass: string,
    icon: any 
  }) => {
    const isOverBudget = delta < 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between h-full relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${barColorClass}`}></div>
            
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colorClass} bg-opacity-20`}>
                        <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
                    </div>
                    <h3 className="font-semibold text-slate-700">{title}</h3>
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded border ${isOverBudget ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                    {isOverBudget ? 'OVER BUDGET' : 'ON TRACK'}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Budget</p>
                    <p className="text-xl font-bold text-slate-800">{formatCompact(budget)}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Forecast</p>
                    <p className={`text-xl font-bold ${isOverBudget ? 'text-red-600' : 'text-slate-800'}`}>{formatCompact(forecast)}</p>
                </div>
            </div>

            <div className="mt-auto">
                <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-600">Consumption</span>
                    <span className={`font-bold ${isOverBudget ? 'text-red-600' : 'text-slate-600'}`}>{percent.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : barColorClass}`} 
                        style={{ width: `${Math.min(percent, 100)}%` }}
                    ></div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm">
                    {delta >= 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                    <span className="text-slate-500">Remaining:</span>
                    <span className={`font-bold font-mono ${delta < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(delta)}</span>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Financial Dashboard {currentYear}</h2>
                <p className="text-slate-500 text-sm">Real-time overview of budget vs. resource allocation.</p>
            </div>
            
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-6">
                 <div className="text-right">
                    <p className="text-xs text-slate-400 font-bold uppercase">Total Budget</p>
                    <p className="font-bold text-slate-800">{formatCompact(stats.budgetTotal)}</p>
                 </div>
                 <div className="h-8 w-px bg-slate-100"></div>
                 <div className="text-right">
                    <p className="text-xs text-slate-400 font-bold uppercase">Total Forecast</p>
                    <p className="font-bold text-blue-600">{formatCompact(stats.forecastTotal)}</p>
                 </div>
                 <div className="h-8 w-px bg-slate-100"></div>
                 <div className="text-right">
                    <p className="text-xs text-slate-400 font-bold uppercase">Net Result</p>
                    <p className={`font-bold ${stats.deltaTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCompact(stats.deltaTotal)}</p>
                 </div>
            </div>
        </div>

        {/* Global Consumption Bar */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-slate-500" />
                        Global Consumption
                    </h3>
                </div>
                <div className="text-3xl font-bold text-slate-800">
                    {stats.pctTotal.toFixed(1)}<span className="text-lg text-slate-400 ml-1">%</span>
                </div>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden relative">
                {/* Background markers for 25, 50, 75% */}
                <div className="absolute top-0 left-[25%] h-full w-px bg-white z-10 opacity-50"></div>
                <div className="absolute top-0 left-[50%] h-full w-px bg-white z-10 opacity-50"></div>
                <div className="absolute top-0 left-[75%] h-full w-px bg-white z-10 opacity-50"></div>
                
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        stats.pctTotal > 100 ? 'bg-red-500' : 
                        stats.pctTotal > 90 ? 'bg-amber-500' : 'bg-brand-500'
                    }`}
                    style={{ width: `${Math.min(stats.pctTotal, 100)}%` }}
                ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
            </div>
        </div>

        {/* Split View: RUN vs CHANGE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SummaryCard 
                title="RUN (Maintenance)" 
                budget={stats.budgetRun}
                forecast={stats.forecastRun}
                delta={stats.deltaRun}
                percent={stats.pctRun}
                colorClass="bg-orange-100 text-orange-600"
                barColorClass="bg-orange-500"
                icon={PieChart}
            />
            <SummaryCard 
                title="CHANGE (Projects)" 
                budget={stats.budgetChange}
                forecast={stats.forecastChange}
                delta={stats.deltaChange}
                percent={stats.pctChange}
                colorClass="bg-purple-100 text-purple-600"
                barColorClass="bg-purple-500"
                icon={TrendingUp}
            />
        </div>

        {/* Warnings / Alerts (Mockup for future features) */}
        {stats.pctTotal > 95 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-red-800 text-sm">Critical Budget Alert</h4>
                    <p className="text-red-600 text-xs mt-1">You have consumed over 95% of your total budget. Please review upcoming resource allocations or request a budget extension.</p>
                </div>
            </div>
        )}
        
        {stats.deltaTotal > 0 && stats.pctTotal < 95 && (
             <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-green-800 text-sm">Healthy Financial Status</h4>
                    <p className="text-green-600 text-xs mt-1">
                        You have {formatCompact(stats.deltaTotal)} remaining available. You can safely allocate more resources to CHANGE projects.
                    </p>
                </div>
            </div>
        )}

    </div>
  );
}