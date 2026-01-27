import React, { useEffect, useState, useMemo } from 'react';
import { CalendarTemplate, Resource, OverrideValue } from '@/types';
import { calendarService } from '@/src/services/calendarService';
import ConfirmModal from '@/components/ui/ConfirmModal';
import CalendarTemplateList from './CalendarTemplateList';
import CalendarTemplateForm from './CalendarTemplateForm';
import ResourceCalendar from '@/ResourceCalendar';

export default function CalendarTemplatesManager() {
    const [templates, setTemplates] = useState<CalendarTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    
    // View States
    const [calendarTemplateId, setCalendarTemplateId] = useState<string | null>(null);
    const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<CalendarTemplate | null>(null);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await calendarService.getAllTemplates();
            setTemplates(data);
        } catch (error) {
            console.error("Failed to load templates", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, []);

    // Derived States
    const editingTemplate = useMemo(() => 
        templates.find(t => t.id === editingTemplateId) || null
    , [templates, editingTemplateId]);

    const activeCalendarTemplate = useMemo(() => 
        templates.find(t => t.id === calendarTemplateId) || null
    , [templates, calendarTemplateId]);

    // MOCK RESOURCE for Calendar View
    const mockResource = useMemo<Resource | null>(() => {
        if (!activeCalendarTemplate) return null;
        const currentYear = new Date().getFullYear();
        return {
            id: activeCalendarTemplate.id,
            firstName: activeCalendarTemplate.name,
            lastName: '', // Hidden in calendar usually
            tjm: 0,
            country: activeCalendarTemplate.country,
            ratioChange: 0,
            startDate: `${currentYear}-01-01`,
            endDate: `${currentYear + 1}-12-31`, 
            overrides: activeCalendarTemplate.overrides,
            dynamicHolidays: activeCalendarTemplate.dynamicHolidays
        };
    }, [activeCalendarTemplate]);

    // ACTIONS

    const handleAdd = async (template: Omit<CalendarTemplate, 'id'>) => {
        const id = await calendarService.createTemplate(template);
        // Refresh
        const data = await calendarService.getAllTemplates();
        setTemplates(data);
    };

    const handleUpdate = async (id: string, updates: Partial<CalendarTemplate>) => {
        // Optimistic UI
        setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
        
        await calendarService.updateTemplate(id, updates);
        
        // Refresh if isDefault changed (to handle unchecking others)
        if (updates.isDefault !== undefined) {
             const data = await calendarService.getAllTemplates();
             setTemplates(data);
        }
    };

    const handleDelete = async () => {
        if (!templateToDelete) return;
        await calendarService.deleteTemplate(templateToDelete.id);
        setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
        setTemplateToDelete(null);
        if (editingTemplateId === templateToDelete.id) setEditingTemplateId(null);
    };

    // CALENDAR ACTIONS (Mapped to Template Updates)

    const handleUpdateOverride = async (date: string, value: OverrideValue | undefined) => {
        if (!activeCalendarTemplate) return;
        const newOverrides = { ...activeCalendarTemplate.overrides };
        if (value === undefined) delete newOverrides[date]; else newOverrides[date] = value;
        
        await handleUpdate(activeCalendarTemplate.id, { overrides: newOverrides });
    };

    const handleBulkUpdate = async (start: Date, end: Date, value: OverrideValue | undefined) => {
        if (!activeCalendarTemplate) return;
        const newOverrides = { ...activeCalendarTemplate.overrides };
        const current = new Date(start);
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            if (value === undefined) delete newOverrides[dateStr]; else newOverrides[dateStr] = value;
            current.setDate(current.getDate() + 1);
        }
        await handleUpdate(activeCalendarTemplate.id, { overrides: newOverrides });
    };

    const handleApplyHolidays = async (id: string, year: number, holidays: string[]) => {
        if (!activeCalendarTemplate) return;
        const newOverrides = { ...activeCalendarTemplate.overrides };
        holidays.forEach(date => newOverrides[date] = 0);
        const newDynamicHolidays = [...new Set([...(activeCalendarTemplate.dynamicHolidays || []), ...holidays])];
        
        await handleUpdate(activeCalendarTemplate.id, { 
            overrides: newOverrides,
            dynamicHolidays: newDynamicHolidays
        });
    };

    // --- FULL SCREEN CALENDAR MODE ---
    if (mockResource) {
        return (
            <ResourceCalendar 
                resource={mockResource}
                onBack={() => setCalendarTemplateId(null)}
                onUpdateOverride={handleUpdateOverride}
                onBulkUpdate={handleBulkUpdate}
                onUpdateResource={(id, updates) => {
                    // ResourceCalendar might try to update country
                    if (updates.country) {
                        handleUpdate(id, { country: updates.country });
                    }
                }}
                onApplyHolidays={handleApplyHolidays}
                isReadOnly={false}
            />
        );
    }

    // --- LIST MODE ---
    return (
        <div className="h-full flex flex-col bg-slate-50">
             <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        Calendar Templates
                    </h1>
                    <p className="text-slate-500 mt-1 text-sm">
                        Manage standard holidays and leaves presets for your resources.
                    </p>
                </div>
            </header>

            <div className="flex-1 overflow-auto">
                <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-[1920px] mx-auto">
                    {loading ? (
                         <div className="lg:col-span-4 text-center py-20 text-slate-400">Loading templates...</div>
                    ) : (
                        <>
                            <CalendarTemplateList 
                                templates={templates}
                                onEdit={(t) => setEditingTemplateId(t.id)}
                                onDelete={(t, e) => { e.stopPropagation(); setTemplateToDelete(t); }}
                                onCalendarClick={(t) => setCalendarTemplateId(t.id)}
                                editingId={editingTemplateId}
                            />

                            <CalendarTemplateForm 
                                onAdd={handleAdd}
                                onUpdate={handleUpdate}
                                onCancelEdit={() => setEditingTemplateId(null)}
                                editingTemplate={editingTemplate}
                            />
                        </>
                    )}
                </div>
            </div>

            <ConfirmModal 
                isOpen={!!templateToDelete}
                onClose={() => setTemplateToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Template?"
                description={`Are you sure you want to delete "${templateToDelete?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                isDestructive={true}
            />
        </div>
    );
}
