import React, { useState } from 'react';
import { CheckCircle, XCircle, Activity, Shield, Play, AlertTriangle, Users, Lock } from 'lucide-react';
import { User } from 'firebase/auth';
import { db } from '@/src/services/firebase';
import { collection, getDocs, query, where, limit, getDoc, doc } from 'firebase/firestore';
import UsersManager from '@/src/components/settings/UsersManager';
import { UserRole } from '@/src/services/userService';

interface SettingsViewProps {
  user: User;
  userRole: UserRole | null;
  onResetData: () => void;
}

type TestStatus = 'idle' | 'running' | 'success' | 'error';

interface TestResult {
  id: string;
  name: string;
  status: TestStatus;
  message?: string;
  latency?: number;
}

export default function SettingsView({ user, userRole, onResetData }: SettingsViewProps) {
  const [activeTab, setActiveTab] = useState<'system' | 'admin'>('system');

  // Diagnostics State
  const [results, setResults] = useState<TestResult[]>([
    { id: 'auth', name: 'Authentification Utilisateur', status: 'idle' },
    { id: 'conn', name: 'Connexion Firebase', status: 'idle' },
    { id: 'perm', name: 'Permissions de Lecture', status: 'idle' },
  ]);

  const updateResult = (id: string, updates: Partial<TestResult>) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const runDiagnostics = async () => {
    // RESET
    setResults(prev => prev.map(r => ({ ...r, status: 'idle', message: undefined, latency: undefined })));

    // 1. AUTH CHECK
    updateResult('auth', { status: 'running' });
    await new Promise(r => setTimeout(r, 500)); // UI delay for feel
    if (user && user.uid) {
        updateResult('auth', { status: 'success', message: `Connecté en tant que ${user.email}` });
    } else {
        updateResult('auth', { status: 'error', message: 'Utilisateur non détecté' });
        return;
    }

    // 2. CONNECTION CHECK (Ping)
    updateResult('conn', { status: 'running' });
    const start = performance.now();
    try {
        await getDoc(doc(db, "health_check", "ping"));
        const end = performance.now();
        updateResult('conn', { status: 'success', latency: Math.round(end - start), message: 'Connexion établie' });
    } catch (e: any) {
        if (e.code === 'permission-denied') {
             const end = performance.now();
             updateResult('conn', { status: 'success', latency: Math.round(end - start), message: 'Connexion établie (règles actives)' });
        } else {
            console.error(e);
            updateResult('conn', { status: 'error', message: e.message || 'Erreur réseau' });
            return;
        }
    }

    // 3. PERMISSIONS CHECK
    updateResult('perm', { status: 'running' });
    try {
        const q = query(collection(db, "scenarios"), where("ownerId", "==", user.email), limit(1));
        await getDocs(q);
        updateResult('perm', { status: 'success', message: 'Accès aux données validé' });
    } catch (e: any) {
        console.error(e);
        updateResult('perm', { status: 'error', message: 'Accès refusé. Vérifiez les règles Firestore.' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
        Paramètres de l'application
      </h1>

      {/* TABS HEADER */}
      <div className="flex border-b border-slate-200 mb-8">
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'system' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
              <Activity className="w-4 h-4" />
              Système & Diagnostics
          </button>
          
          {userRole === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'admin' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                  <Shield className="w-4 h-4" />
                  Administration
              </button>
          )}
      </div>

      {/* TAB CONTENT: SYSTEM */}
      {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-brand-600" />
                        Santé du Système
                    </h2>
                    <button 
                        onClick={runDiagnostics}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                        <Play className="w-4 h-4" /> Lancer le test
                    </button>
                </div>

                <div className="space-y-4">
                    {results.map((test) => (
                        <div key={test.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                            <div className="mt-0.5">
                                {test.status === 'idle' && <div className="w-5 h-5 rounded-full border-2 border-slate-300" />}
                                {test.status === 'running' && <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />}
                                {test.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                                {test.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <span className="font-medium text-slate-700">{test.name}</span>
                                    {test.latency && <span className="text-xs font-mono text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">{test.latency}ms</span>}
                                </div>
                                <p className="text-sm text-slate-500 min-h-[1.25em]">{test.message || 'En attente...'}</p>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm flex gap-3">
                    <Shield className="w-5 h-5 shrink-0" />
                    <p>Vos données sont sécurisées via Firestore Rules. Seul votre compte ({user.email}) peut accéder à vos scénarios.</p>
                </div>
            </div>
          </div>
      )}

      {/* TAB CONTENT: ADMIN */}
      {activeTab === 'admin' && userRole === 'ADMIN' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-300">
             {/* LEFT: IAM */}
             <div className="space-y-8">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
                    <UsersManager currentUserEmail={user.email} />
                </div>
             </div>

             {/* RIGHT: DANGER ZONE */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
                <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2 mb-6">
                    <AlertTriangle className="w-5 h-5" />
                    Zone de Danger
                </h2>

                <div className="space-y-6">
                    <div>
                        <h3 className="font-medium text-slate-800 mb-1">Réinitialiser la base de données</h3>
                        <p className="text-sm text-slate-500 mb-3">
                            Cette action est irréversible. Elle supprimera tous vos scénarios.
                        </p>
                        <button 
                            onClick={onResetData}
                            className="w-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                        >
                            Tout supprimer et réinitialiser
                        </button>
                    </div>
                </div>
            </div>
          </div>
      )}
    </div>
  );
}
