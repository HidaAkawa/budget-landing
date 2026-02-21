import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Globe, Check } from 'lucide-react';
import { CalendarTemplate, Country } from '@/types';

interface CalendarTemplateFormProps {
    onAdd: (template: Omit<CalendarTemplate, 'id'>) => Promise<void>;
    onUpdate: (id: string, updates: Partial<CalendarTemplate>) => Promise<void>;
    onCancelEdit: () => void;
    editingTemplate: CalendarTemplate | null;
}

export default function CalendarTemplateForm({ onAdd, onUpdate, onCancelEdit, editingTemplate }: CalendarTemplateFormProps) {
    const [name, setName] = useState('');
    const [country, setCountry] = useState<Country>(Country.FR);
    const [isDefault, setIsDefault] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (editingTemplate) {
            setName(editingTemplate.name);
            setCountry(editingTemplate.country);
            setIsDefault(editingTemplate.isDefault);
        } else {
            resetForm();
        }
    }, [editingTemplate]);

    const resetForm = () => {
        setName('');
        setCountry(Country.FR);
        setIsDefault(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setIsSubmitting(true);
        try {
            if (editingTemplate) {
                await onUpdate(editingTemplate.id, { name, country, isDefault });
                onCancelEdit();
            } else {
                await onAdd({
                    name,
                    country,
                    isDefault,
                    overrides: {},
                    dynamicHolidays: []
                });
                resetForm();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit transition-all ${editingTemplate ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                {editingTemplate ? (
                    <>
                        <Edit2 className="w-4 h-4 text-blue-600" />
                        Edit Template
                    </>
                ) : (
                    <>
                        <Plus className="w-4 h-4 text-brand-600" />
                        New Template
                    </>
                )}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Template Name</label>
                    <input 
                        type="text" 
                        required 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" 
                        placeholder="e.g. France Standard" 
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Globe className="w-3 h-3"/> Country</label>
                    <select 
                        value={country} 
                        onChange={e => setCountry(e.target.value as Country)} 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white"
                    >
                        {Object.values(Country).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="pt-2">
                    <label className="flex items-center gap-3 cursor-pointer group select-none p-2 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                        <div className={`w-5 h-5 border-2 rounded transition-colors flex items-center justify-center shrink-0 ${isDefault ? 'bg-brand-600 border-brand-600' : 'border-slate-300 group-hover:border-brand-400'}`}>
                            {isDefault && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
                        <div>
                            <span className="block text-sm font-medium text-slate-700">Set as Default</span>
                            <span className="block text-xs text-slate-400">Default for {country}</span>
                        </div>
                    </label>
                </div>

                <div className="flex gap-2 mt-4 pt-2 border-t border-slate-100">
                    {editingTemplate && (
                        <button type="button" onClick={onCancelEdit} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors">Cancel</button>
                    )}
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`flex-1 font-medium py-2 rounded-lg text-sm transition-colors text-white disabled:opacity-50 ${editingTemplate ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                    >
                        {isSubmitting ? 'Saving...' : (editingTemplate ? 'Update' : 'Add Template')}
                    </button>
                </div>
            </form>
        </div>
    );
}
