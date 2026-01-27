import React, { useState, useEffect } from 'react';
import { Plus, Edit2, CreditCard, Globe, Percent, Calendar, Users, Briefcase } from 'lucide-react';
import { Resource, Country, CalendarTemplate, ContractType } from './types';
import { calendarService } from '@/src/services/calendarService';

// Utils
const generateId = () => Math.random().toString(36).substr(2, 9);

interface ResourceFormProps {
  onAdd: (resource: Resource) => void;
  onUpdate: (id: string, resource: Partial<Resource>) => void;
  onCancelEdit: () => void;
  editingResource: Resource | null;
}

export default function ResourceForm({ onAdd, onUpdate, onCancelEdit, editingResource }: ResourceFormProps) {
  const currentYear = new Date().getFullYear();
  const defaultStartDate = `${currentYear}-01-01`;
  const defaultEndDate = `${currentYear}-12-31`;

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [tribe, setTribe] = useState('');
  const [contractType, setContractType] = useState<ContractType>(ContractType.EXTERNAL);
  const [tjm, setTjm] = useState('');
  const [country, setCountry] = useState<Country>(Country.FR);
  const [ratioChange, setRatioChange] = useState<number>(30);
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  // Template State
  const [templates, setTemplates] = useState<CalendarTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Sync state with editingResource prop
  useEffect(() => {
    if (editingResource) {
      setFirstName(editingResource.firstName);
      setLastName(editingResource.lastName);
      setTribe(editingResource.tribe || '');
      setContractType(editingResource.contractType || ContractType.EXTERNAL);
      setTjm(editingResource.tjm.toString());
      setCountry(editingResource.country);
      setRatioChange(editingResource.ratioChange);
      setStartDate(editingResource.startDate || defaultStartDate);
      setEndDate(editingResource.endDate || defaultEndDate);
    } else {
      resetForm();
      // Load templates for default country (FR)
      loadTemplatesForCountry(Country.FR);
    }
  }, [editingResource]);

  // Load templates when country changes (only in Create mode)
  useEffect(() => {
    if (!editingResource) {
        loadTemplatesForCountry(country);
    }
  }, [country, editingResource]);

  const loadTemplatesForCountry = async (c: Country) => {
      setIsLoadingTemplates(true);
      try {
          const tpls = await calendarService.getTemplatesByCountry(c);
          setTemplates(tpls);
          
          // Auto-select default
          const def = tpls.find(t => t.isDefault);
          if (def) {
              setSelectedTemplateId(def.id);
          } else {
              setSelectedTemplateId('');
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoadingTemplates(false);
      }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setTribe('');
    setContractType(ContractType.EXTERNAL);
    setTjm('');
    setCountry(Country.FR);
    setRatioChange(30);
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setSelectedTemplateId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !tjm || !startDate || !endDate) return;

    if (startDate > endDate) {
        alert("Start date must be before end date.");
        return;
    }

    const numericTjm = parseFloat(tjm);

    if (editingResource) {
        onUpdate(editingResource.id, {
            firstName,
            lastName,
            tribe: tribe, // FIX: Send empty string instead of undefined to avoid Firestore error
            contractType,
            tjm: numericTjm,
            country,
            ratioChange,
            startDate,
            endDate
        });
        onCancelEdit(); // Close edit mode
    } else {
        // Apply Template Overrides if selected
        let initialOverrides = {};
        let initialDynamicHolidays: string[] = [];

        if (selectedTemplateId) {
            const tpl = templates.find(t => t.id === selectedTemplateId);
            if (tpl) {
                initialOverrides = { ...tpl.overrides }; // Copy to avoid ref issues
                initialDynamicHolidays = [...(tpl.dynamicHolidays || [])];
            }
        }

        onAdd({
            id: generateId(),
            firstName,
            lastName,
            tribe: tribe || undefined, // For new doc, undefined is fine as field is just omitted, but empty string is safer for consistency
            contractType,
            tjm: numericTjm,
            country,
            ratioChange,
            startDate,
            endDate,
            overrides: initialOverrides,
            dynamicHolidays: initialDynamicHolidays
        });
        resetForm();
        // Reload templates for FR (reset default)
        loadTemplatesForCountry(Country.FR);
    }
  };

  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit transition-all ${editingResource ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            {editingResource ? (
                <>
                    <Edit2 className="w-4 h-4 text-blue-600" />
                    Edit Resource
                </>
            ) : (
                <>
                    <Plus className="w-4 h-4 text-brand-600" />
                    Add New Resource
                </>
            )}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">First Name</label>
                    <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="John" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Name</label>
                    <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="Doe" />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Users className="w-3 h-3"/> Tribe (Optional)</label>
                     <input type="text" value={tribe} onChange={e => setTribe(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm" placeholder="e.g. Squad Alpha" />
                </div>
                <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3"/> Contract Type</label>
                     <select value={contractType} onChange={e => setContractType(e.target.value as ContractType)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
                         {Object.values(ContractType).map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3"/> TJM (€)</label>
                        <input type="number" required min="0" value={tjm} onChange={e => setTjm(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono" placeholder="500" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Globe className="w-3 h-3"/> Country</label>
                    <select value={country} onChange={e => setCountry(e.target.value as Country)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white">
                        {Object.values(Country).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {/* Template Selector - Only in Create Mode */}
                {!editingResource && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3"/> Calendar Template
                        </label>
                        <select 
                            value={selectedTemplateId} 
                            onChange={e => setSelectedTemplateId(e.target.value)} 
                            disabled={isLoadingTemplates}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            <option value="">-- No Template (Empty Calendar) --</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name} {t.isDefault ? '(Default)' : ''}
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">
                            Applies holidays and leaves automatically.
                        </p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 mt-2">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date</label>
                    <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-xs" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">End Date</label>
                    <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-xs" />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex justify-between">
                    <span className="flex items-center gap-1"><Percent className="w-3 h-3" /> Ratio Change</span>
                    <span className="text-purple-600 font-bold">{ratioChange}%</span>
                </label>
                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="5" 
                    value={ratioChange} 
                    onChange={e => setRatioChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
            </div>

            <div className="flex gap-2 mt-4 pt-2 border-t border-slate-100">
                {editingResource && (
                    <button type="button" onClick={onCancelEdit} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors">Cancel</button>
                )}
                <button type="submit" className={`flex-1 font-medium py-2 rounded-lg text-sm transition-colors text-white ${editingResource ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
                    {editingResource ? 'Update' : 'Add Resource'}
                </button>
            </div>
        </form>
    </div>
  );
}
