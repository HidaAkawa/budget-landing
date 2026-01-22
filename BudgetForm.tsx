import React, { useState, useEffect } from 'react';
import { Plus, Edit2, X, Check } from 'lucide-react';
import { BudgetEnvelope, EnvelopeType } from './types';

// Utils
const generateId = () => Math.random().toString(36).substr(2, 9);

interface BudgetFormProps {
  onAdd: (env: BudgetEnvelope) => void;
  onUpdate: (id: string, env: Partial<BudgetEnvelope>) => void;
  onCancelEdit: () => void;
  editingEnvelope: BudgetEnvelope | null;
}

export default function BudgetForm({ onAdd, onUpdate, onCancelEdit, editingEnvelope }: BudgetFormProps) {
  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<EnvelopeType>(EnvelopeType.CHANGE);
  const [amount, setAmount] = useState('');

  // Sync state with prop
  useEffect(() => {
    if (editingEnvelope) {
        setName(editingEnvelope.name);
        setType(editingEnvelope.type);
        setAmount(editingEnvelope.amount.toString());
    } else {
        resetForm();
    }
  }, [editingEnvelope]);

  const resetForm = () => {
    setName('');
    setType(EnvelopeType.CHANGE);
    setAmount('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    const numericAmount = parseFloat(amount);

    if (editingEnvelope) {
      // Update Mode
      onUpdate(editingEnvelope.id, { name, type, amount: numericAmount });
      onCancelEdit();
    } else {
      // Create Mode
      onAdd({
        id: generateId(),
        name,
        type,
        amount: numericAmount
      });
      resetForm();
    }
  };

  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit transition-all ${editingEnvelope ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            {editingEnvelope ? (
            <>
                <Edit2 className="w-4 h-4 text-blue-600" />
                Edit Envelope
            </>
            ) : (
            <>
                <Plus className="w-4 h-4 text-brand-600" />
                Add New Envelope
            </>
            )}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Envelope Name</label>
            <input 
                type="text" 
                required
                placeholder="e.g. Cyber Security"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm transition-shadow"
            />
            </div>
            
            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <div className="grid grid-cols-2 gap-3">
                <button
                type="button"
                onClick={() => setType(EnvelopeType.RUN)}
                className={`flex items-center justify-center px-3 py-2 border rounded-lg text-sm font-medium transition-all ${
                    type === EnvelopeType.RUN
                    ? 'bg-orange-50 border-orange-200 text-orange-700 ring-1 ring-orange-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                >
                RUN
                </button>
                <button
                type="button"
                onClick={() => setType(EnvelopeType.CHANGE)}
                className={`flex items-center justify-center px-3 py-2 border rounded-lg text-sm font-medium transition-all ${
                    type === EnvelopeType.CHANGE
                    ? 'bg-purple-50 border-purple-200 text-purple-700 ring-1 ring-purple-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                >
                CHANGE
                </button>
            </div>
            </div>

            <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (€)</label>
            <input 
                type="number" 
                required
                min="0"
                step="1000"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm transition-shadow font-mono"
            />
            </div>

            <div className="flex gap-2 mt-2">
            {editingEnvelope && (
                <button
                type="button"
                onClick={onCancelEdit}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                >
                <X className="w-4 h-4" />
                Cancel
                </button>
            )}
            <button 
                type="submit"
                className={`flex-1 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm ${
                editingEnvelope 
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
            >
                {editingEnvelope ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {editingEnvelope ? 'Update' : 'Add to Budget'}
            </button>
            </div>
        </form>
    </div>
  );
}
