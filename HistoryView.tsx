import React from 'react';
import { History, Clock, User, Activity } from 'lucide-react';
import { AuditLog } from './types';
import { format } from 'date-fns';

interface HistoryViewProps {
  logs: AuditLog[];
}

export default function HistoryView({ logs }: HistoryViewProps) {
  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-700';
      case 'UPDATE': return 'bg-blue-100 text-blue-700';
      case 'DELETE': return 'bg-red-100 text-red-700';
      case 'SNAPSHOT': return 'bg-purple-100 text-purple-700';
      case 'RESTORE': return 'bg-orange-100 text-orange-700';
      case 'PUBLISH': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <History className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-800">Audit Trail</h3>
          <span className="text-slate-400 text-sm font-normal">({logs.length} actions logged)</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Entity</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {format(log.timestamp, 'dd/MM/yyyy HH:mm:ss')}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate max-w-[150px]" title={log.user}>{log.user.split('(')[0]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                    {log.entityType}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No actions recorded yet. Start editing the budget to see logs here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}