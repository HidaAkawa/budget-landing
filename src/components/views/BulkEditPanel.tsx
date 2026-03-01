import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListChecks, Users, Briefcase, CreditCard } from 'lucide-react';
import { ContractType, Resource } from '@/types';
import { toast } from 'sonner';

interface BulkEditPanelProps {
  selectedResources: Resource[];
  onApply: (ids: string[], updates: Partial<Resource>) => Promise<void>;
  onCancel: () => void;
}

export default function BulkEditPanel({ selectedResources, onApply, onCancel }: BulkEditPanelProps) {
  const { t } = useTranslation();

  // Field toggle states
  const [applyTribe, setApplyTribe] = useState(false);
  const [applyContractType, setApplyContractType] = useState(false);
  const [applyTjm, setApplyTjm] = useState(false);

  // Field values
  const [tribe, setTribe] = useState('');
  const [contractType, setContractType] = useState<ContractType>(ContractType.EXTERNAL);
  const [tjm, setTjm] = useState('');

  const [isApplying, setIsApplying] = useState(false);

  const selectedCount = selectedResources.length;
  const enabledFieldCount = [applyTribe, applyContractType, applyTjm].filter(Boolean).length;
  const canApply = selectedCount > 0 && enabledFieldCount > 0 && (!applyTjm || (tjm !== '' && Number(tjm) >= 0));

  const handleApply = async () => {
    if (!canApply) return;

    const updates: Partial<Resource> = {};
    if (applyTribe) updates.tribe = tribe || undefined;
    if (applyContractType) updates.contractType = contractType;
    if (applyTjm) updates.tjm = parseFloat(tjm);

    const ids = selectedResources.map(r => r.id);

    setIsApplying(true);
    try {
      await onApply(ids, updates);
      toast.success(t('resources.bulkUpdateSuccess', { count: ids.length }));
    } catch {
      toast.error(t('resources.bulkUpdateError'));
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-brand-200 h-fit ring-2 ring-brand-500 ring-offset-2">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <ListChecks className="w-4 h-4 text-brand-600" />
        {t('resources.bulkEdit')}
      </h3>

      {/* Counter */}
      <div className={`text-sm font-medium mb-6 px-3 py-2 rounded-lg ${
        selectedCount > 0
          ? 'bg-brand-50 text-brand-700 border border-brand-200'
          : 'bg-slate-50 text-slate-400 border border-slate-200'
      }`}>
        {t('resources.selected', { count: selectedCount })}
      </div>

      <div className="space-y-5">
        {/* TRIBE */}
        <div className={`transition-opacity ${applyTribe ? 'opacity-100' : 'opacity-60'}`}>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={applyTribe}
              onChange={(e) => setApplyTribe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3" /> {t('resources.tribe')}
            </span>
          </label>
          <input
            type="text"
            value={tribe}
            onChange={(e) => setTribe(e.target.value)}
            disabled={!applyTribe}
            placeholder="Ex: Squad Alpha"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>

        {/* CONTRACT TYPE */}
        <div className={`transition-opacity ${applyContractType ? 'opacity-100' : 'opacity-60'}`}>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={applyContractType}
              onChange={(e) => setApplyContractType(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> {t('resources.contractType')}
            </span>
          </label>
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value as ContractType)}
            disabled={!applyContractType}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400"
          >
            {Object.values(ContractType).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* TJM */}
        <div className={`transition-opacity ${applyTjm ? 'opacity-100' : 'opacity-60'}`}>
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={applyTjm}
              onChange={(e) => setApplyTjm(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3 h-3" /> {t('resources.tjmEuro')}
            </span>
          </label>
          <input
            type="number"
            min="0"
            value={tjm}
            onChange={(e) => setTjm(e.target.value)}
            disabled={!applyTjm}
            placeholder="500"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm font-mono disabled:bg-slate-50 disabled:text-slate-400"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={isApplying}
          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded-lg text-sm transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!canApply || isApplying}
          className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApplying ? t('resources.applying') : t('resources.applyToSelected', { count: selectedCount })}
        </button>
      </div>
    </div>
  );
}
