import React, { useState } from 'react';
import { ArrowLeft, Check, Save } from 'lucide-react'; // Save icon for visual indicator only
import { CalendarTemplate, ContractType, Country, Resource, OverrideValue } from '@/types';
import ResourceCalendar from '@/src/components/views/ResourceCalendar';

interface CalendarTemplateEditorProps {
    template: CalendarTemplate;
    onBack: () => void;
    onUpdate: (id: string, updates: Partial<CalendarTemplate>) => Promise<void>;
}

export default function CalendarTemplateEditor({ template, onBack, onUpdate }: CalendarTemplateEditorProps) {
    const currentYear = new Date().getFullYear();
    const [isSaving, setIsSaving] = useState(false);

    // Create a "Mock" resource to feed the ResourceCalendar component
    // We use the template data directly.
    const mockResource: Resource = {
        id: template.id,
        firstName: template.name,
        lastName: '',
        contractType: ContractType.INTERNAL,
        tjm: 0,
        country: template.country,
        ratioChange: 0,
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear + 1}-12-31`,
        overrides: template.overrides,
        dynamicHolidays: template.dynamicHolidays
    };

    // Generic update wrapper with loading state
    const performUpdate = async (updates: Partial<CalendarTemplate>) => {
        setIsSaving(true);
        try {
            await onUpdate(template.id, updates);
        } finally {
            // Small delay to show saving state or just instant
            setIsSaving(false);
        }
    };

    const handleUpdateOverride = (date: string, value: OverrideValue | undefined) => {
        const newOverrides = { ...template.overrides };
        if (value === undefined) {
            delete newOverrides[date];
        } else {
            newOverrides[date] = value;
        }
        performUpdate({ overrides: newOverrides });
    };

    const handleBulkUpdate = (start: Date, end: Date, value: OverrideValue | undefined) => {
        const newOverrides = { ...template.overrides };
        const current = new Date(start);
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            if (value === undefined) {
                delete newOverrides[dateStr];
            } else {
                newOverrides[dateStr] = value;
            }
            current.setDate(current.getDate() + 1);
        }
        performUpdate({ overrides: newOverrides });
    };

    const handleApplyHolidays = (_id: string, _year: number, holidays: string[]) => {
        const newOverrides = { ...template.overrides };
        holidays.forEach(date => {
            newOverrides[date] = 0; // 0 = Off
        });
        
        const newDynamicHolidays = [...new Set([...(template.dynamicHolidays || []), ...holidays])];
        
        performUpdate({ 
            overrides: newOverrides,
            dynamicHolidays: newDynamicHolidays
        });
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        performUpdate({ name: e.target.value });
    };

    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        performUpdate({ country: e.target.value as Country });
    };

    const handleDefaultChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        performUpdate({ isDefault: e.target.checked });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" aria-label="Retour">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            {template.name}
                            {isSaving && <span className="text-xs font-normal text-slate-400 flex items-center gap-1 animate-pulse"><Save className="w-3 h-3"/> Saving...</span>}
                        </h2>
                    </div>
                </div>
            </div>

            {/* Toolbar Form - Auto Save */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 z-10">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Template Name</label>
                    <input 
                        type="text" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm transition-shadow focus:shadow-md"
                        placeholder="e.g. France Standard"
                        value={template.name}
                        onChange={handleNameChange}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Country</label>
                    <select 
                        value={template.country} 
                        onChange={handleCountryChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white"
                    >
                        {Object.values(Country).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="flex items-center pt-5">
                    <label className="flex items-center gap-3 cursor-pointer group select-none">
                            <div className={`w-5 h-5 border-2 rounded transition-colors flex items-center justify-center ${template.isDefault ? 'bg-brand-600 border-brand-600' : 'border-slate-300 group-hover:border-brand-400'}`}>
                            {template.isDefault && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={template.isDefault} onChange={handleDefaultChange} />
                            <div>
                                <span className="block text-sm font-medium text-slate-700">Set as Default</span>
                                <span className="block text-xs text-slate-400">Default for {template.country}</span>
                            </div>
                    </label>
                </div>
            </div>

            {/* Calendar View - Takes remaining height */}
            <div className="flex-1 overflow-hidden relative">
                <ResourceCalendar 
                    resource={mockResource}
                    onUpdateOverride={handleUpdateOverride}
                    onBulkUpdate={handleBulkUpdate}
                    onUpdateResource={() => {}} // We handle country change in toolbar above
                    onApplyHolidays={handleApplyHolidays}
                    onBack={onBack} // Pass the back handler so the arrow inside ResourceCalendar also works if needed
                    isReadOnly={false}
                />
            </div>
        </div>
    );
}
