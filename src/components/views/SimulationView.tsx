import React, { useState, useMemo } from 'react';
import { Save, RotateCcw, Globe, Lock, History, FileEdit } from 'lucide-react';
import { Scenario, ScenarioStatus } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ConfirmModal from '@/src/components/ui/ConfirmModal';

interface SimulationViewProps {
  scenario: Scenario;
  versions: Scenario[];
  onCreateSnapshot: (name: string) => void;
  onRestoreSnapshot: (id: string) => void;
  onPublish: () => Promise<string | undefined>;
}

export default function SimulationView({ scenario, versions, onCreateSnapshot, onRestoreSnapshot, onPublish }: SimulationViewProps) {
  const [snapshotName, setSnapshotName] = useState('');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // --- ORGANIZE VERSIONS ---
  const { master, drafts, archives } = useMemo(() => {
      const master = versions.find(v => v.status === ScenarioStatus.MASTER);
      // Assuming versions only contains MY drafts (filtered by service/hook)
      const drafts = versions.filter(v => v.status === ScenarioStatus.DRAFT);
      const archives = versions.filter(v => v.status === ScenarioStatus.ARCHIVED);
      return { master, drafts, archives };
  }, [versions]);

  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (snapshotName.trim()) {
      onCreateSnapshot(snapshotName);
      toast.success("Nouveau brouillon créé");
      setSnapshotName('');
    }
  };

  const handlePublishConfirm = async () => {
    const loadingToast = toast.loading("Publication en cours...");
    try {
        await onPublish(); // Returns new draft ID but we usually auto-switch
        toast.dismiss(loadingToast);
        toast.success("Publication réussie ! Le MASTER a été mis à jour.");
        setIsPublishModalOpen(false);
    } catch (e) {
        toast.dismiss(loadingToast);
        toast.error("Erreur lors de la publication.");
        console.error(e);
    }
  };

  const isReadOnly = scenario.status !== ScenarioStatus.DRAFT;

  // Reusable List Item
  const VersionItem = ({ ver, isActive }: { ver: Scenario, isActive: boolean }) => (
    <div className={`
        border rounded-lg p-3 transition-colors flex items-center justify-between group
        ${isActive ? 'bg-brand-50 border-brand-200 ring-1 ring-brand-200' : 'bg-white border-slate-100 hover:border-slate-300'}
    `}>
        <div className="min-w-0">
            <h4 className={`font-medium text-sm truncate ${isActive ? 'text-brand-800' : 'text-slate-700'}`}>
                {ver.name}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                {format(ver.updatedAt, 'dd/MM/yyyy HH:mm')}
                {ver.status === ScenarioStatus.MASTER && <span className="bg-green-100 text-green-700 px-1 rounded text-[10px] font-bold">MASTER</span>}
            </p>
        </div>

        {isActive ? (
            <span className="text-xs font-medium text-brand-600 px-2 py-1 bg-white rounded border border-brand-100 shadow-sm">
                Actif
            </span>
        ) : (
            <button 
                onClick={() => onRestoreSnapshot(ver.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1"
            >
                <RotateCcw className="w-3 h-3" />
                Charger
            </button>
        )}
    </div>
  );

  return (
    <div className="p-6 space-y-6 h-full flex flex-col max-w-[1600px] mx-auto w-full">
      
      <ConfirmModal 
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onConfirm={handlePublishConfirm}
        title="Confirmer la publication (MASTER)"
        description="Vous allez remplacer la version officielle (MASTER) par ce brouillon. L'ancien MASTER sera archivé."
        confirmLabel="Publier maintenant"
      />

      {/* HEADER: ACTIVE SCENARIO STATUS */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 shrink-0">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
             <h2 className="text-2xl font-bold text-slate-800">{scenario.name}</h2>
             {isReadOnly && <Lock className="w-5 h-5 text-amber-500" />}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <span className={`px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wide ${
              scenario.status === ScenarioStatus.MASTER ? 'bg-green-100 text-green-700 border-green-200' : 
              scenario.status === ScenarioStatus.ARCHIVED ? 'bg-slate-100 text-slate-600 border-slate-200' : 
              'bg-amber-100 text-amber-700 border-amber-200'
            }`}>
              {scenario.status}
            </span>
            <span>Dernière modification : <strong>{format(scenario.updatedAt, 'dd/MM/yyyy à HH:mm')}</strong></span>
            {/* Show Owner if available */}
            {scenario.ownerId && <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">Owner ID: {scenario.ownerId.split('@')[0]}</span>}
          </div>
        </div>

        {/* ACTIONS PRIMARY */}
        <div className="flex items-center gap-3">
            {scenario.status === ScenarioStatus.DRAFT && (
                <button
                    onClick={() => setIsPublishModalOpen(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all"
                >
                    <Globe className="w-4 h-4" />
                    Publier en MASTER
                </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* LEFT COL: HISTORY & NAVIGATION (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6 min-h-0 overflow-y-auto">
            
            {/* 1. MASTER */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
                <div className="bg-green-50/50 px-4 py-3 border-b border-green-100 flex justify-between items-center">
                    <h3 className="font-semibold text-green-900 flex items-center gap-2">
                        <Globe className="w-4 h-4" /> Version Officielle
                    </h3>
                </div>
                <div className="p-4">
                    {master ? (
                        <VersionItem ver={master} isActive={master.id === scenario.id} />
                    ) : (
                        <p className="text-sm text-slate-400 italic text-center py-2">Aucun Master défini.</p>
                    )}
                </div>
            </div>

            {/* 2. MY DRAFTS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 min-h-0 flex flex-col">
                <div className="bg-amber-50/50 px-4 py-3 border-b border-amber-100 flex justify-between items-center shrink-0">
                    <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                        <FileEdit className="w-4 h-4" /> Mes Brouillons
                    </h3>
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-medium">{drafts.length}</span>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    {drafts.length === 0 ? (
                        <p className="text-sm text-slate-400 italic text-center py-4">Aucun brouillon en cours.</p>
                    ) : (
                        drafts.map(d => <VersionItem key={d.id} ver={d} isActive={d.id === scenario.id} />)
                    )}
                </div>
            </div>

            {/* 3. ARCHIVES */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 min-h-0 flex flex-col">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center shrink-0">
                    <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                        <History className="w-4 h-4" /> Archives
                    </h3>
                    <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">{archives.length}</span>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    {archives.length === 0 ? (
                        <p className="text-sm text-slate-400 italic text-center py-4">Aucune archive.</p>
                    ) : (
                        archives.map(a => <VersionItem key={a.id} ver={a} isActive={a.id === scenario.id} />)
                    )}
                </div>
            </div>

        </div>

        {/* RIGHT COL: FORK / ACTION AREA (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* COPY / FORK TOOL */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Save className="w-5 h-5 text-brand-600" />
                    Créer une nouvelle version
                </h3>
                <p className="text-slate-500 mb-6 max-w-2xl text-sm">
                    Vous travaillez actuellement sur <strong>{scenario.name}</strong> ({scenario.status}). <br/>
                    {isReadOnly 
                        ? "Cette version est en lecture seule. Pour faire des modifications, vous devez créer une copie (Brouillon)." 
                        : "Vous pouvez créer une copie de sauvegarde de ce brouillon avant de faire des modifications majeures."}
                </p>

                <form onSubmit={handleCreateSnapshot} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Nom de la nouvelle version</label>
                        <input 
                            type="text" 
                            placeholder={`Ex: Copie de ${scenario.name}...`} 
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-sm"
                            value={snapshotName}
                            onChange={(e) => setSnapshotName(e.target.value)}
                            required
                        />
                    </div>
                    <button 
                        type="submit"
                        className="mt-5 w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {isReadOnly ? "Créer Brouillon & Éditer" : "Créer Copie"}
                    </button>
                </form>
            </div>

             {/* HELP / INFO */}
             <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-sm text-blue-800">
                <h4 className="font-bold flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4" />
                    Comment ça marche ?
                </h4>
                <ul className="list-disc pl-5 space-y-1 opacity-80">
                    <li><strong>Version Officielle (Master) :</strong> Visible par tout le monde. Non modifiable.</li>
                    <li><strong>Mes Brouillons :</strong> Visibles uniquement par vous. C'est ici que vous travaillez.</li>
                    <li><strong>Publication :</strong> Quand votre brouillon est prêt, publiez-le pour qu'il devienne le nouveau Master.</li>
                    <li><strong>Archives :</strong> Les anciens Masters sont conservés ici automatiquement.</li>
                </ul>
            </div>

        </div>
      </div>
    </div>
  );
}
