import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Calculator, History, LogOut, Wallet, FileClock, ShieldAlert, Loader } from 'lucide-react';
import { APP_NAME, AUTHORIZED_USERS } from './constants';
import BudgetView from './BudgetView';
import HistoryView from './HistoryView';
import SimulationView from './SimulationView';
import ResourcesView from './ResourcesView';
import DashboardView from './DashboardView';
import { useAppLogic } from './hooks/useAppLogic';
import { auth, googleProvider } from './services/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { User } from "firebase/auth";

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'budget' | 'resources' | 'simulation' | 'history'>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  const { 
    scenario, 
    isLoading,
    addEnvelope, 
    updateEnvelope, 
    deleteEnvelope,
    addResource,
    updateResource,
    updateResourceOverride,
    bulkUpdateResourceOverrides,
    applyResourceHolidays,
    deleteResource,
    createSnapshot,
    restoreSnapshot,
    publishScenario
  } = useAppLogic(user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && currentUser.email) {
        setIsAuthorized(AUTHORIZED_USERS.includes(currentUser.email));
      } else {
        setIsAuthorized(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  // --- RENDER LOGIC ---

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <div className="bg-brand-100 p-3 rounded-full">
              <Calculator className="w-8 h-8 text-brand-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">{APP_NAME}</h1>
          <p className="text-slate-500 mb-8">Sign in to manage team budgets and forecasts.</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
             <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
           <div className="mb-6 flex justify-center">
            <div className="bg-red-100 p-3 rounded-full">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-500 mb-8">You are not authorized to access this application. Please contact the administrator.</p>
          <button 
            onClick={handleLogout}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-lg text-slate-600">
          <Loader className="w-6 h-6 animate-spin" />
          <span>Loading data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 text-white">
          <Calculator className="w-6 h-6 text-brand-500" />
          <span className="font-bold text-lg tracking-tight">{APP_NAME}</span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}><LayoutDashboard className="w-5 h-5" /><span>Dashboard</span></button>
          <button onClick={() => setCurrentView('budget')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'budget' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}><Wallet className="w-5 h-5" /><span>Budget</span></button>
          <button onClick={() => setCurrentView('resources')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'resources' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}><Users className="w-5 h-5" /><span>Resources</span></button>
          <button onClick={() => setCurrentView('simulation')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'simulation' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}><FileClock className="w-5 h-5" /><span>Versions & Publish</span></button>
          <button onClick={() => setCurrentView('history')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === 'history' ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}><History className="w-5 h-5" /><span>History (Logs)</span></button>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center gap-3 mb-4 px-2">
            {user.photoURL && <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full" />}
            <div className="text-sm">
              <p className="text-white font-medium">{user.displayName}</p>
              <p className="text-xs text-slate-500">Admin</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"><LogOut className="w-4 h-4" />Sign Out</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative flex flex-col">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-8 py-4 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-semibold text-slate-800 capitalize">{currentView === 'simulation' ? 'Versions & Publish' : currentView}</h2>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${scenario.status === 'MASTER' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>{scenario.name} ({scenario.status})</span>
          </div>
        </header>

        <div className="flex-1 h-full w-full">
          {currentView === 'dashboard' && (<div className="max-w-[1920px] mx-auto w-full"><DashboardView envelopes={scenario.envelopes} resources={scenario.resources} /></div>)}
          {currentView === 'budget' && (<div className="max-w-7xl mx-auto w-full"><BudgetView envelopes={scenario.envelopes} onAdd={addEnvelope} onUpdate={updateEnvelope} onDelete={deleteEnvelope} /></div>)}
          {currentView === 'resources' && (<ResourcesView resources={scenario.resources} onAdd={addResource} onUpdate={updateResource} onDelete={deleteResource} onUpdateOverride={updateResourceOverride} onBulkUpdateOverride={bulkUpdateResourceOverrides} onApplyHolidays={applyResourceHolidays} />)}
          {currentView === 'simulation' && (<div className="max-w-7xl mx-auto w-full"><SimulationView scenario={scenario} onCreateSnapshot={createSnapshot} onRestoreSnapshot={restoreSnapshot} onPublish={publishScenario} /></div>)}
          {currentView === 'history' && (<div className="max-w-7xl mx-auto w-full"><HistoryView logs={scenario.auditLogs} /></div>)}
        </div>
      </main>
    </div>
  );
}

export default App;
