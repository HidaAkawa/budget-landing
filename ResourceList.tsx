import React, { useState, useMemo } from 'react';
import { Trash2, Edit2, User, Calendar as CalendarIcon, Calculator, CalendarRange, Users, Briefcase, Search, ArrowUpDown } from 'lucide-react';
import { Resource, ContractType } from '@/types';
import { useResourceStats, getCachedResourceStats } from '@/hooks/useResourceStats';

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

type SortKey = keyof Resource | 'stats.days' | 'stats.cost';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

// Optimized Row Component
const ResourceRow = React.memo(({ resource, currentYear, isEditing, isReadOnly, onCalendarClick, onEdit, onDelete }: {
    resource: Resource;
    currentYear: number;
    isEditing: boolean;
    isReadOnly: boolean;
    onCalendarClick: (id: string) => void;
    onEdit: (r: Resource) => void;
    onDelete: (id: string) => void;
}) => {
    const stats = useResourceStats(resource, currentYear);

    // Grid columns configuration: 
    // Name (1.8fr), Tribe (1fr), Type (0.8fr), Country (0.5fr), TJM (0.8fr), Days (0.7fr), Cost (1fr), Alloc (1.2fr), Actions (0.8fr)
    const gridClass = "grid grid-cols-[1.8fr_1fr_0.8fr_0.5fr_0.8fr_0.7fr_1fr_1.2fr_0.8fr] gap-3 items-center";

    return (
        <div className={`flex items-center border-b border-slate-100 hover:bg-slate-50 transition-colors group ${isEditing ? 'bg-blue-50/50' : ''}`}>
             <div className={`flex-1 min-w-0 px-4 py-3 ${gridClass}`}>
                 {/* 1. Name */}
                 <div className="min-w-0">
                    <div className="font-medium text-slate-800 truncate" title={`${resource.firstName} ${resource.lastName}`}>{resource.firstName} {resource.lastName}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex gap-1 items-center">
                        <CalendarRange className="w-3 h-3 shrink-0" />
                        <span className="truncate">{formatDateDisplay(resource.startDate)} → {formatDateDisplay(resource.endDate)}</span>
                    </div>
                </div>

                {/* 2. Tribe */}
                <div className="min-w-0">
                    {resource.tribe ? (
                        <div className="flex items-center gap-1 text-xs text-slate-600 truncate" title={resource.tribe}>
                            <Users className="w-3 h-3 shrink-0 text-slate-400" />
                            {resource.tribe}
                        </div>
                    ) : (
                        <span className="text-slate-300 text-[10px]">-</span>
                    )}
                </div>

                {/* 3. Contract */}
                <div>
                     <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold border ${
                         resource.contractType === 'INTERNAL' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                         resource.contractType === 'EXTERNAL' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                         'bg-slate-100 text-slate-600 border-slate-200'
                     }`}>
                        {resource.contractType || 'EXT'}
                    </span>
                </div>

                {/* 4. Country */}
                <div>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {resource.country}
                    </span>
                </div>

                {/* 5. TJM */}
                <div className="text-right font-mono text-xs text-slate-600">
                     {formatCurrency(resource.tjm)}
                </div>

                {/* 6. Days */}
                <div className="text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">
                        {stats.days}
                    </span>
                </div>

                {/* 7. Cost */}
                <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 font-mono">
                        {new Intl.NumberFormat('fr-FR', { notation: "compact", maximumFractionDigits: 1, style: 'currency', currency: 'EUR' }).format(stats.cost)}
                    </span>
                </div>

                {/* 8. Allocation */}
                <div className="min-w-[80px]">
                    <div className="flex flex-col gap-1">
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            <div className="bg-orange-400 h-full" style={{ width: `${100 - resource.ratioChange}%` }}></div>
                            <div className="bg-purple-500 h-full" style={{ width: `${resource.ratioChange}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                            <span>R {100 - resource.ratioChange}%</span>
                            <span>C {resource.ratioChange}%</span>
                        </div>
                    </div>
                </div>

                {/* 9. Actions */}
                <div className="text-center flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => onCalendarClick(resource.id)}
                        className="text-slate-400 hover:text-purple-600 hover:bg-purple-50 p-1.5 rounded transition-colors flex items-center gap-1"
                        title="Manage Calendar"
                    >
                        <CalendarIcon className="w-4 h-4" />
                    </button>
                    {!isReadOnly && (
                        <>
                            <button onClick={() => onEdit(resource)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => onDelete(resource.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </>
                    )}
                </div>
             </div>
        </div>
    );
});

export default function ResourceList({ resources, onEdit, onDelete, onCalendarClick, editingId, isReadOnly = false }: ResourceListProps) {
  const currentYear = new Date().getFullYear();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Filter & Sort Logic
  const processedResources = useMemo(() => {
    let filtered = resources;

    // 1. Filter
    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(r => 
            r.firstName.toLowerCase().includes(lowerTerm) ||
            r.lastName.toLowerCase().includes(lowerTerm) ||
            (r.tribe && r.tribe.toLowerCase().includes(lowerTerm))
        );
    }

    // 2. Sort
    if (sortConfig) {
        filtered = [...filtered].sort((a, b) => {
            let valA: any;
            let valB: any;

            if (sortConfig.key === 'stats.days' || sortConfig.key === 'stats.cost') {
                const statA = getCachedResourceStats(a, currentYear);
                const statB = getCachedResourceStats(b, currentYear);
                valA = sortConfig.key === 'stats.days' ? statA.days : statA.cost;
                valB = sortConfig.key === 'stats.days' ? statB.days : statB.cost;
            } else {
                valA = a[sortConfig.key as keyof Resource];
                valB = b[sortConfig.key as keyof Resource];
            }

            // Handle null/undefined
            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return filtered;
  }, [resources, searchTerm, sortConfig, currentYear]);

  const handleSort = (key: SortKey) => {
      setSortConfig(current => {
          if (current?.key === key) {
              return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
          }
          return { key, direction: 'asc' };
      });
  };

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
      if (sortConfig?.key !== colKey) return <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />;
      return sortConfig.direction === 'asc' 
        ? <ArrowUpDown className="w-3 h-3 text-brand-600 rotate-0 transition-transform" /> // Or ChevronUp
        : <ArrowUpDown className="w-3 h-3 text-brand-600 rotate-180 transition-transform" />;
  };

  const HeaderCell = ({ label, sortKey, align = 'left', className = '' }: { label: string, sortKey?: SortKey, align?: 'left'|'center'|'right', className?: string }) => (
      <div 
        className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'} ${sortKey ? 'cursor-pointer group select-none hover:text-slate-700' : ''} ${className}`}
        onClick={() => sortKey && handleSort(sortKey)}
      >
          {label}
          {sortKey && <SortIcon colKey={sortKey} />}
      </div>
  );

  // Same grid definition as Row
  const gridClass = "grid grid-cols-[1.8fr_1fr_0.8fr_0.5fr_0.8fr_0.7fr_1fr_1.2fr_0.8fr] gap-3";

  return (
    <div className={`${isReadOnly ? 'lg:col-span-4' : 'lg:col-span-3'} bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]`}>
        {/* TOP BAR */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <User className="w-5 h-5 text-slate-500" />
                    Resources
                </h3>
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider hidden sm:inline-block">Pilotage {currentYear}</span>
                <span className="bg-brand-100 text-brand-700 px-2 py-1 rounded text-xs font-medium">{resources.length}</span>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder="Search name or tribe..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                />
            </div>
        </div>
        
        {/* TABLE HEADER */}
        <div className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider shrink-0 border-b border-slate-200">
             <div className={`px-4 py-3 ${gridClass}`}>
                 <HeaderCell label="Name" sortKey="lastName" />
                 <HeaderCell label="Tribe" sortKey="tribe" />
                 <HeaderCell label="Type" sortKey="contractType" />
                 <HeaderCell label="Country" sortKey="country" />
                 <HeaderCell label="TJM" sortKey="tjm" align="right" />
                 <HeaderCell label="Days" sortKey="stats.days" align="center" />
                 <HeaderCell label="Cost" sortKey="stats.cost" align="right" />
                 <HeaderCell label="Alloc (R/C)" />
                 <HeaderCell label="Actions" align="center" />
             </div>
        </div>

        {/* LIST CONTENT */}
        <div className="flex-1 overflow-y-auto">
             {processedResources.length > 0 ? (
                <div>
                    {processedResources.map(res => (
                        <ResourceRow 
                            key={res.id}
                            resource={res}
                            currentYear={currentYear}
                            isEditing={editingId === res.id}
                            isReadOnly={isReadOnly}
                            onCalendarClick={onCalendarClick}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 italic gap-2">
                    <User className="w-8 h-8 opacity-20" />
                    {searchTerm ? 'No matching resources found.' : 'No resources defined yet.'}
                </div>
             )}
        </div>
    </div>
  );
}
