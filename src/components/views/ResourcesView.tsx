import { useState, useMemo, useCallback } from 'react';
import { Lock } from 'lucide-react';
import { Resource, OverrideValue } from '@/types';
import ResourceCalendar from './ResourceCalendar';
import ResourceList from './ResourceList';
import ResourceForm from './ResourceForm';
import BulkEditPanel from './BulkEditPanel';

interface ResourcesViewProps {
  resources: Resource[];
  onAdd: (resource: Resource) => void;
  onUpdate: (id: string, resource: Partial<Resource>) => void;
  onDelete: (id: string) => void;
  onUpdateOverride: (resourceId: string, date: string, value: OverrideValue | undefined) => void;
  onBulkUpdateOverride?: (resourceId: string, start: Date, end: Date, value: OverrideValue | undefined) => void;
  onApplyHolidays?: (resourceId: string, year: number, holidays?: string[]) => void;
  isReadOnly?: boolean;
}

export default function ResourcesView({ resources, onAdd, onUpdate, onDelete, onUpdateOverride, onBulkUpdateOverride, onApplyHolidays, isReadOnly = false }: ResourcesViewProps) {
  // View State
  const [calendarResourceId, setCalendarResourceId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Bulk Edit State
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleBulkEdit = useCallback(() => {
    setBulkEditMode(prev => {
      if (prev) setSelectedIds(new Set()); // clear selection on exit
      if (!prev) setEditingId(null); // clear individual edit on enter
      return !prev;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === resources.length) return new Set();
      return new Set(resources.map(r => r.id));
    });
  }, [resources]);

  const selectedResources = useMemo(
    () => resources.filter(r => selectedIds.has(r.id)),
    [resources, selectedIds]
  );

  const handleBulkApply = useCallback(async (ids: string[], updates: Partial<Resource>) => {
    const errors: string[] = [];
    await Promise.all(
      ids.map(id =>
        Promise.resolve(onUpdate(id, updates)).catch(() => {
          const res = resources.find(r => r.id === id);
          errors.push(res ? `${res.firstName} ${res.lastName}` : id);
        })
      )
    );
    if (errors.length > 0) {
      throw new Error(`Échec pour : ${errors.join(', ')}`);
    }
    // Success: exit bulk mode
    setSelectedIds(new Set());
    setBulkEditMode(false);
  }, [onUpdate, resources]);

  const handleBulkCancel = useCallback(() => {
    setSelectedIds(new Set());
    setBulkEditMode(false);
  }, []);

  // Derive the active resource from the latest props
  const calendarResource = useMemo(() => 
    resources.find(r => r.id === calendarResourceId) || null
  , [resources, calendarResourceId]);
  
  const editingResource = useMemo(() => 
    resources.find(r => r.id === editingId) || null
  , [resources, editingId]);

  // --- CALENDAR MODE ---
  if (calendarResource) {
    return (
        <ResourceCalendar 
            resource={calendarResource}
            onBack={() => setCalendarResourceId(null)}
            onUpdateOverride={(date, val) => onUpdateOverride(calendarResource.id, date, val)}
            onBulkUpdate={(start, end, val) => onBulkUpdateOverride && onBulkUpdateOverride(calendarResource.id, start, end, val)}
            onUpdateResource={onUpdate}
            onApplyHolidays={(id, year, holidays) => onApplyHolidays && onApplyHolidays(id, year, holidays)}
            isReadOnly={isReadOnly}
        />
    );
  }

  // --- LIST MODE ---
  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">

        <ResourceList
            resources={resources}
            onEdit={(res) => { if (!bulkEditMode) setEditingId(res.id); }}
            onDelete={onDelete}
            onCalendarClick={(id) => { if (!bulkEditMode) setCalendarResourceId(id); }}
            editingId={bulkEditMode ? null : editingId}
            isReadOnly={isReadOnly}
            bulkEditMode={bulkEditMode}
            onToggleBulkEdit={toggleBulkEdit}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
        />

        {!isReadOnly && !bulkEditMode && (
            <ResourceForm
                onAdd={onAdd}
                onUpdate={onUpdate}
                editingResource={editingResource}
                onCancelEdit={() => setEditingId(null)}
            />
        )}

        {!isReadOnly && bulkEditMode && (
            <BulkEditPanel
                selectedResources={selectedResources}
                onApply={handleBulkApply}
                onCancel={handleBulkCancel}
            />
        )}

        {isReadOnly && (
            <div className="lg:col-span-4 bg-slate-50 rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center text-slate-400 mt-0">
                <Lock className="w-12 h-12 mb-3 text-slate-300" />
                <h3 className="font-medium text-slate-600">Modification Verrouillée</h3>
                <p className="text-sm mt-1 max-w-xs">Vous consultez une version archivée ou publiée (MASTER). Passez sur un DRAFT pour éditer.</p>
            </div>
        )}
    </div>
  );
}
