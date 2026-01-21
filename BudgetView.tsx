import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, PieChart, TrendingUp, ShieldCheck, Edit2, X, Check, Lock } from 'lucide-react';
import { BudgetEnvelope, EnvelopeType } from './types';

// Utils
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatCurrency = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

interface BudgetViewProps {
  envelopes: BudgetEnvelope[];
  onAdd: (env: BudgetEnvelope) => void;
  onUpdate: (id: string, env: Partial<BudgetEnvelope>) => void;
  onDelete: (id: string) => void;
  isReadOnly?: boolean; // New prop
}

export default function BudgetView({ envelopes, onAdd, onUpdate, onDelete, isReadOnly = false }: BudgetViewProps) {
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<EnvelopeType>(EnvelopeType.CHANGE);
  const [amount, setAmount] = useState('');

  // When clicking edit, populate form
  const handleEditClick = (env: BudgetEnvelope) => {
    if (isReadOnly) return;
    setEditingId(env.id);
    setName(env.name);
    setType(env.type);
    setAmount(env.amount.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setType(EnvelopeType.CHANGE);
    setAmount('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!name || !amount) return;

    const numericAmount = parseFloat(amount);

    if (editingId) {
      // Update Mode
      onUpdate(editingId, { name, type, amount: numericAmount });
      setEditingId(null);
    } else {
      // Create Mode
      onAdd({
        id: generateId(),
        name,
        type,
        amount: numericAmount
      });
    }

    // Reset
    setName('');
    setAmount('');
    setType(EnvelopeType.CHANGE);
  };

  // Computed Totals
  const stats = useMemo(() => {
    const totalRun = envelopes.filter(e => e.type === EnvelopeType.RUN).reduce((sum, e) => sum + e.amount, 0);
    const totalChange = envelopes.filter(e => e.type === EnvelopeType.CHANGE).reduce((sum, e) => sum + e.amount, 0);
    const total = totalRun + totalChange;
    return { totalRun, totalChange, total };
  }, [envelopes]);

  return (
    <div className="p-6 space-y-6">
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <PieChart className="w-6 h-6" />
            </div>
            <h3 className="text-slate-500 font-medium">Total Budget</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{formatCurrency(stats.total)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-slate-500 font-medium">Total RUN</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{formatCurrency(stats.totalRun)}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${stats.total ? (stats.totalRun / stats.total) * 100 : 0}%` }} />
            </div>
            <span className="text-xs text-slate-500 font-medium">{stats.total ? Math.round((stats.totalRun / stats.total) * 100) : 0}%</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="text-slate-500 font-medium">Total CHANGE</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{formatCurrency(stats.totalChange)}</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${stats.total ? (stats.totalChange / stats.total) * 100 : 0}%` }} />
            </div>
            <span className="text-xs text-slate-500 font-medium">{stats.total ? Math.round((stats.totalChange / stats.total) * 100) : 0}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Envelopes List */}
        <div className={`${isReadOnly ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col`}>
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Envelopes Definition</h3>
            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">{envelopes.length} items</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  {!isReadOnly && <th className="px-6 py-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {envelopes.map((env) => (
                  <tr key={env.id} className={`hover:bg-slate-50 transition-colors group ${editingId === env.id ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-6 py-4 font-medium text-slate-700">{env.name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        env.type === EnvelopeType.RUN 
                          ? 'bg-orange-100 text-orange-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {env.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-600">
                      {formatCurrency(env.amount)}
                    </td>
                    {!isReadOnly && (
                        <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                            onClick={() => handleEditClick(env)}
                            className="text-slate-400 hover:text-blue-600 p-1"
                            title="Edit"
                            >
                            <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                            onClick={() => onDelete(env.id)}
                            className="text-slate-400 hover:text-red-500 p-1"
                            title="Delete"
                            >
                            <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Envelope Form - HIDDEN IN READONLY */}
        {!isReadOnly && (
            <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit transition-all ${editingId ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                {editingId ? (
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
                {editingId && (
                    <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                    >
                    <X className="w-4 h-4" />
                    Cancel
                    </button>
                )}
                <button 
                    type="submit"
                    className={`flex-1 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm ${
                    editingId 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                >
                    {editingId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingId ? 'Update' : 'Add to Budget'}
                </button>
                </div>
            </form>
            </div>
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
