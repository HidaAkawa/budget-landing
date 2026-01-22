import { useState, useEffect, useMemo } from 'react';
import { BudgetEnvelope, Scenario, ScenarioStatus, Resource, OverrideValue } from '../types';
import { eachDayOfInterval, format } from 'date-fns';
import { User } from 'firebase/auth';
import { db } from '../services/firebase';
import { 
    collection, 
    doc, 
    onSnapshot, 
    query, 
    where, 
    addDoc, 
    updateDoc,
    writeBatch,
    getDocs,
    deleteDoc
} from 'firebase/firestore';

// EMPTY INITIAL DATA
const INITIAL_SCENARIO_DATA: Omit<Scenario, 'id'> = {
    name: 'Draft Initial',
    status: ScenarioStatus.DRAFT,
    envelopes: [], 
    resources: [], 
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

export function useAppLogic(user: User | null) {
  const [versions, setVersions] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  const scenario = useMemo(() => {
      if (!activeScenarioId || versions.length === 0) return null;
      return versions.find(v => v.id === activeScenarioId) || null;
  }, [activeScenarioId, versions]);

  // LOAD STRATEGY
  useEffect(() => {
    if (!user) {
        setVersions([]);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);

    const q = query(
        collection(db, "scenarios"), 
        where("ownerId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedDocs = snapshot.docs.map(d => ({id: d.id, ...d.data()} as Scenario));
        // Sort: Drafts first, then by date desc
        loadedDocs.sort((a, b) => {
            if (a.status === ScenarioStatus.DRAFT && b.status !== ScenarioStatus.DRAFT) return -1;
            if (a.status !== ScenarioStatus.DRAFT && b.status === ScenarioStatus.DRAFT) return 1;
            return (b.updatedAt || 0) - (a.updatedAt || 0);
        });
        
        setVersions(loadedDocs);
        setIsLoading(false);
    }, (err) => {
        console.error("Error loading scenarios:", err);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Auto-Select Logic
  useEffect(() => {
      if (!isLoading && versions.length > 0 && !activeScenarioId) {
          // Priority 1: The most recent DRAFT
          const draft = versions.find(v => v.status === ScenarioStatus.DRAFT);
          if (draft) {
              setActiveScenarioId(draft.id);
          } else {
              // Priority 2: The current MASTER
              const master = versions.find(v => v.status === ScenarioStatus.MASTER);
              if (master) {
                   setActiveScenarioId(master.id);
              } else {
                  // Fallback
                  setActiveScenarioId(versions[0].id);
              }
          }
      }
  }, [isLoading, versions, activeScenarioId]);


  const initializeProject = async () => {
      if(!user) return;
      setIsLoading(true);
      try {
        const docRef = await addDoc(collection(db, "scenarios"), {
            ...INITIAL_SCENARIO_DATA,
            ownerId: user.uid,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        setActiveScenarioId(docRef.id);
      } catch(e) {
          console.error("Init failed", e);
          throw e;
      } finally {
          setIsLoading(false);
      }
  };

  const resetAllData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
          const q = query(collection(db, "scenarios"), where("ownerId", "==", user.uid));
          const querySnapshot = await getDocs(q);
          const deletePromises = querySnapshot.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);
          
          setActiveScenarioId(null);
          await initializeProject();
      } catch (err) {
          console.error("Reset failed:", err);
          throw err;
      } finally {
          setIsLoading(false);
      }
  };

  // --- ACTIONS WITH SAFEGUARDS ---

  const checkMutationAllowed = (): boolean => {
      if (!scenario) return false;
      if (scenario.status !== ScenarioStatus.DRAFT) {
          console.warn("Attempted to modify a non-DRAFT scenario.");
          return false;
      }
      return true;
  };

  const updateScenarioFields = async (updates: Partial<Scenario>) => {
    if (!activeScenarioId) return;
    const docRef = doc(db, "scenarios", activeScenarioId);
    try {
        await updateDoc(docRef, { ...updates, updatedAt: Date.now() });
    } catch (err) {
        console.error("Update failed:", err);
    }
  };

  const addEnvelope = (envelope: BudgetEnvelope) => {
    if (!checkMutationAllowed() || !scenario) return;
    updateScenarioFields({ envelopes: [...scenario.envelopes, envelope] });
  };

  const updateEnvelope = (id: string, updates: Partial<BudgetEnvelope>) => {
    if (!checkMutationAllowed() || !scenario) return;
    updateScenarioFields({ envelopes: scenario.envelopes.map(e => e.id === id ? { ...e, ...updates } : e) });
  };

  const deleteEnvelope = (id: string) => {
    if (!checkMutationAllowed() || !scenario) return;
    updateScenarioFields({ envelopes: scenario.envelopes.filter(e => e.id !== id) });
  };

  const addResource = (resource: Resource) => {
    if (!checkMutationAllowed() || !scenario) return;
    updateScenarioFields({ resources: [...scenario.resources, resource] });
  };

  const updateResource = (id: string, updates: Partial<Resource>) => {
    if (!checkMutationAllowed() || !scenario) return;
    updateScenarioFields({ resources: scenario.resources.map(r => r.id === id ? { ...r, ...updates } : r) });
  };

  const updateResourceOverride = (resourceId: string, date: string, value: OverrideValue | undefined) => {
    if (!checkMutationAllowed() || !scenario) return;
    const res = scenario.resources.find(r => r.id === resourceId);
    if (!res) return;
    const newOverrides = { ...res.overrides };
    if (value === undefined) delete newOverrides[date]; else newOverrides[date] = value;
    updateScenarioFields({ resources: scenario.resources.map(r => r.id === resourceId ? { ...r, overrides: newOverrides } : r) });
  };

  const bulkUpdateResourceOverrides = (resourceId: string, startDate: Date, endDate: Date, value: OverrideValue | undefined) => {
    if (!checkMutationAllowed() || !scenario) return;
    const res = scenario.resources.find(r => r.id === resourceId);
    if (!res) return;
    const newOverrides = { ...res.overrides };
    eachDayOfInterval({ start: startDate, end: endDate }).forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        if (value === undefined) delete newOverrides[dateStr]; else newOverrides[dateStr] = value;
    });
    updateScenarioFields({ resources: scenario.resources.map(r => r.id === resourceId ? { ...r, overrides: newOverrides } : r) });
  };

  const applyResourceHolidays = (resourceId: string, year: number, externalHolidays: string[]) => {
    if (!checkMutationAllowed() || !scenario) return;
    const res = scenario.resources.find(r => r.id === resourceId);
    if (!res) return;
    const newOverrides = { ...res.overrides };
    externalHolidays.forEach(d => newOverrides[d] = 0);
    const newDynamicHolidays = [...new Set([...(res.dynamicHolidays || []), ...externalHolidays])];
    updateScenarioFields({ 
        resources: scenario.resources.map(r => r.id === resourceId ? { ...r, overrides: newOverrides, dynamicHolidays: newDynamicHolidays } : r) 
    });
  };

  const deleteResource = (id: string) => {
    if (!checkMutationAllowed() || !scenario) return;
    updateScenarioFields({ resources: scenario.resources.filter(r => r.id !== id) });
  };

  const createSnapshot = async (name: string) => {
    if (!scenario || !user) return;
    // Standard snapshot logic (manual)
    const newDraft: Omit<Scenario, 'id'> = {
        name: name,
        status: ScenarioStatus.DRAFT,
        ownerId: user.uid,
        parentId: scenario.id,
        envelopes: scenario.envelopes,
        resources: scenario.resources,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    try {
        const docRef = await addDoc(collection(db, "scenarios"), newDraft);
        setActiveScenarioId(docRef.id);
    } catch (e) {
        console.error("Error creating version:", e);
    }
  };

  const restoreSnapshot = (snapshotId: string) => {
    setActiveScenarioId(snapshotId);
  };

  // --- NEW PUBLISH LOGIC ---
  const publishScenario = async () => {
    if (!scenario || !user || scenario.status !== ScenarioStatus.DRAFT) return;

    // Suppression du window.confirm ici. C'est l'UI qui gère ça.

    try {
        const batch = writeBatch(db);
        const now = Date.now();

        // 1. Archive current MASTERS
        const currentMasters = versions.filter(v => v.status === ScenarioStatus.MASTER);
        currentMasters.forEach(v => {
            const ref = doc(db, "scenarios", v.id);
            batch.update(ref, { 
                status: ScenarioStatus.ARCHIVED,
                updatedAt: now 
            });
        });

        // 2. Promote current DRAFT to MASTER
        const newMasterRef = doc(db, "scenarios", scenario.id);
        batch.update(newMasterRef, { 
            status: ScenarioStatus.MASTER, 
            updatedAt: now 
        });

        // 3. Create NEW DRAFT immediately
        const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
        const username = user.displayName?.split(' ')[0].toUpperCase() || 'USER';
        const newDraftName = `${username}-${timestamp}`;

        const newDraftRef = doc(collection(db, "scenarios"));
        batch.set(newDraftRef, {
            name: newDraftName,
            status: ScenarioStatus.DRAFT,
            ownerId: user.uid,
            parentId: scenario.id, // Parent is the one we just published
            envelopes: scenario.envelopes, // Clone data
            resources: scenario.resources, // Clone data
            createdAt: now,
            updatedAt: now,
        });

        await batch.commit();

        // 4. Switch to the NEW DRAFT
        // We use a small timeout to let Firestore trigger the snapshot listener
        return new Promise<string>((resolve) => {
            setTimeout(() => {
                 setActiveScenarioId(newDraftRef.id);
                 resolve(newDraftName);
            }, 500);
        });

    } catch (e) {
        console.error("Publish failed:", e);
        throw e;
    }
  };

  return {
    scenario,
    versions,
    isLoading,
    error: null, 
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
    publishScenario,
    resetAllData,
    initializeProject
  };
}
