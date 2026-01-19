import React, { useState } from 'react';
import { Save, RotateCcw, Globe, Archive, CheckCircle } from 'lucide-react';
import { Scenario, ScenarioSnapshot, ScenarioStatus } from './types';
import { format } from 'date-fns';

interface SimulationViewProps {
  scenario: Scenario;
  onCreateSnapshot: (name: string) => void;
  onRestoreSnapshot: (id: string) => void;
  onPublish: () => void;
}

export default function SimulationView({ scenario, onCreateSnapshot, onRestoreSnapshot, onPublish }: SimulationViewProps) {
  const [snapshotName, setSnapshotName] = useState('');

  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (snapshotName.trim()) {
      onCreateSnapshot(snapshotName);
      setSnapshotName('');
    }
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Current Scenario Status Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">{scenario.name}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Status:</span>
            <span className={`font-bold px-2 py-0.5 rounded text-xs ${
              scenario.status === ScenarioStatus.MASTER ? 'bg-green-100 text-green-700' : 
              scenario.status === ScenarioStatus.ARCHIVED ? 'bg-slate-100 text-slate-700' : 
              'bg-amber-100 text-amber-700'
            }`}>
              {scenario.status}
            </span>
            <span className="mx-2">•</span>
            <span>Last Updated: {format(scenario.updatedAt, 'dd/MM/yyyy HH:mm')}</span>
          </div>
        </div>

        {scenario.status !== ScenarioStatus.MASTER && (
          <button
            onClick={onPublish}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all"
          >
            <Globe className="w-5 h-5" />
            Publish as Master
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Create Version */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-brand-600" />
            Create Version (Snapshot)
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Save the current state of your budget envelopes and resources. You can restore this version at any time.
          </p>
          
          <form onSubmit={handleCreateSnapshot} className="flex gap-3">
            <input 
              type="text" 
              placeholder="Version Name (e.g. Q4 Adjustments)" 
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              required
            />
            <button 
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Save Version
            </button>
          </form>
        </div>

        {/* Version History List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Archive className="w-5 h-5 text-brand-600" />
              Saved Versions
            </h3>
            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{scenario.snapshots.length} versions</span>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {scenario.snapshots.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic text-sm">
                No versions saved yet.
              </div>
            ) : (
              scenario.snapshots.map(snap => (
                <div key={snap.id} className="border border-slate-100 rounded-lg p-4 hover:border-slate-300 transition-colors bg-slate-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-slate-800">{snap.name}</h4>
                      <p className="text-xs text-slate-500">{format(snap.date, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    <button 
                      onClick={() => onRestoreSnapshot(snap.id)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-semibold flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </button>
                  </div>
                  <div className="flex gap-2">
                     <span className="inline-flex items-center text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-500">
                        {snap.envelopes.length} Envelopes
                     </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}