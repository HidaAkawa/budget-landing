import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Edit2, Trash2 } from 'lucide-react';
import { BudgetEnvelope, EnvelopeType } from '@/types';

// Utils
const formatCurrency = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);

interface BudgetListProps {
  envelopes: BudgetEnvelope[];
  onEdit: (env: BudgetEnvelope) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  isReadOnly?: boolean;
}

export default function BudgetList({ envelopes, onEdit, onDelete, editingId, isReadOnly = false }: BudgetListProps) {
  const { t } = useTranslation();
  return (
    <div className={clsx(
      'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col',
      isReadOnly ? 'lg:col-span-3' : 'lg:col-span-2'
    )}>
      <div className="p-5 border-b border-slate-100 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">{t('budget.envelopesDefinition')}</h3>
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">{t('budget.items', { count: envelopes.length })}</span>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-slate-100 flex-1 overflow-y-auto">
        {envelopes.map((env) => (
          <div
            key={env.id}
            className={clsx(
              'p-4 transition-colors',
              editingId === env.id && 'bg-blue-50/50'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-700 truncate">{env.name}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    env.type === EnvelopeType.RUN ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'
                  )}>
                    {env.type}
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-700">{formatCurrency(env.amount)}</span>
                </div>
              </div>
              {!isReadOnly && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onEdit(env)}
                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"
                    title={t('common.edit')}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(env.id)}
                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto flex-1">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">{t('common.name')}</th>
              <th className="px-6 py-4">{t('common.type')}</th>
              <th className="px-6 py-4 text-right">{t('common.amount')}</th>
              {!isReadOnly && <th className="px-6 py-4 text-center">{t('common.actions')}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {envelopes.map((env) => (
              <tr key={env.id} className={clsx(
                'hover:bg-slate-50 transition-colors group',
                editingId === env.id && 'bg-blue-50/50'
              )}>
                <td className="px-6 py-4 font-medium text-slate-700">{env.name}</td>
                <td className="px-6 py-4">
                  <span className={clsx(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                    env.type === EnvelopeType.RUN ? 'bg-orange-100 text-orange-800' : 'bg-purple-100 text-purple-800'
                  )}>
                    {env.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono text-slate-600">
                  {formatCurrency(env.amount)}
                </td>
                {!isReadOnly && (
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(env)}
                        className="text-slate-400 hover:text-blue-600 p-1"
                        title={t('common.edit')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(env.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title={t('common.delete')}
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
  );
}
