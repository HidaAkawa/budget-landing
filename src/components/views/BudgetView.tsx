import { useState, useMemo } from 'react';
import { Lock } from 'lucide-react';
import { BudgetEnvelope } from '@/types';
import BudgetKPIs from './BudgetKPIs';
import BudgetList from './BudgetList';
import BudgetForm from './BudgetForm';

interface BudgetViewProps {
  envelopes: BudgetEnvelope[];
  onAdd: (env: BudgetEnvelope) => void;
  onUpdate: (id: string, env: Partial<BudgetEnvelope>) => void;
  onDelete: (id: string) => void;
  isReadOnly?: boolean;
}

export default function BudgetView({ envelopes, onAdd, onUpdate, onDelete, isReadOnly = false }: BudgetViewProps) {
  
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingEnvelope = useMemo(() => 
    envelopes.find(e => e.id === editingId) || null
  , [envelopes, editingId]);

  return (
    <div className="p-6 space-y-6">
      
      {/* KPIs */}
      <BudgetKPIs envelopes={envelopes} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Envelopes List */}
        <BudgetList 
            envelopes={envelopes}
            onEdit={(env) => setEditingId(env.id)}
            onDelete={onDelete}
            editingId={editingId}
            isReadOnly={isReadOnly}
        />

        {/* Add/Edit Envelope Form - HIDDEN IN READONLY */}
        {!isReadOnly && (
            <BudgetForm 
                onAdd={onAdd}
                onUpdate={onUpdate}
                editingEnvelope={editingEnvelope}
                onCancelEdit={() => setEditingId(null)}
            />
        )}

        {isReadOnly && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center text-slate-400">
                <Lock className="w-12 h-12 mb-3 text-slate-300" />
                <h3 className="font-medium text-slate-600">Modification Verrouillée</h3>
                <p className="text-sm mt-1 max-w-xs">Vous consultez une version archivée ou publiée (MASTER). Passez sur un DRAFT pour éditer.</p>
            </div>
        )}
      </div>
    </div>
  );
}
