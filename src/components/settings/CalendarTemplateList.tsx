import React, { useMemo } from 'react';
import { Edit2, Trash2, Calendar, Check, Globe } from 'lucide-react';
import { CalendarTemplate, Country } from '@/types';

interface CalendarTemplateListProps {
    templates: CalendarTemplate[];
    onEdit: (template: CalendarTemplate) => void;
    onDelete: (template: CalendarTemplate, e: React.MouseEvent) => void;
    onCalendarClick: (template: CalendarTemplate) => void;
    editingId: string | null;
}

export default function CalendarTemplateList({ templates, onEdit, onDelete, onCalendarClick, editingId }: CalendarTemplateListProps) {
    
    // Group by Country
    const templatesByCountry = useMemo(() => {
        return Object.values(Country).reduce((acc, country) => {
            acc[country] = templates.filter(t => t.country === country);
            return acc;
        }, {} as Record<Country, CalendarTemplate[]>);
    }, [templates]);

    return (
        <div className="space-y-6 lg:col-span-3">
             {/* Header Stats or Info could go here */}
             
             {Object.values(Country).map(country => {
                const countryTemplates = templatesByCountry[country];
                if (countryTemplates.length === 0) return null;

                return (
                    <div key={country} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 font-semibold text-slate-700">
                            <Globe className="w-4 h-4 text-slate-400" />
                            {country}
                        </div>
                        <div className="divide-y divide-slate-100">
                             <div className="grid grid-cols-12 gap-4 px-6 py-2 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <div className="col-span-5">Template Name</div>
                                <div className="col-span-2 text-center">Default</div>
                                <div className="col-span-2 text-center">Overrides</div>
                                <div className="col-span-3 text-right">Actions</div>
                            </div>
                            
                            {countryTemplates.map(template => (
                                <div 
                                    key={template.id} 
                                    onClick={() => onEdit(template)}
                                    className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors cursor-pointer group ${editingId === template.id ? 'bg-blue-50/50 ring-1 ring-inset ring-blue-100' : ''}`}
                                >
                                    <div className="col-span-5 font-medium text-slate-800 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                                            {template.name.charAt(0).toUpperCase()}
                                        </div>
                                        {template.name}
                                    </div>
                                    
                                    <div className="col-span-2 flex justify-center">
                                        {template.isDefault && (
                                            <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="col-span-2 text-center text-sm text-slate-500 font-mono">
                                        {Object.keys(template.overrides).length}
                                    </div>

                                    <div className="col-span-3 flex justify-end gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onCalendarClick(template); }}
                                            className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                            title="Edit Calendar Rules"
                                            aria-label="Ouvrir le calendrier"
                                        >
                                            <Calendar className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit(template); }}
                                            className={`p-2 rounded-lg transition-colors ${editingId === template.id ? 'text-blue-600 bg-blue-100' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                            title="Edit Metadata"
                                            aria-label="Modifier le template"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => onDelete(template, e)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete Template"
                                            aria-label="Supprimer le template"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
             })}

             {templates.length === 0 && (
                 <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-slate-600 font-medium">No templates yet</h3>
                    <p className="text-slate-400 text-sm mt-1">Use the form to create your first calendar template.</p>
                </div>
             )}
        </div>
    );
}
