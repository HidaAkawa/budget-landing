import { useState, useEffect, useMemo } from 'react';
import { BudgetEnvelope, Scenario, ScenarioStatus, Resource, OverrideValue } from '@/types';
import { User } from 'firebase/auth';
import { scenarioService } from '@/src/services/scenarioService';
import { resourceService } from '@/src/services/resourceService';

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
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [activeResources, setActiveResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Global loading (scenarios)
  const [isResourcesLoading, setIsResourcesLoading] = useState(false);

  // --- 1. LOAD SCENARIOS ---
  useEffect(() => {
    if (!user) {
        setVersions([]);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);

    const unsubscribe = scenarioService.subscribeToScenarios(
        user.uid,
        (loadedScenarios) => {
            setVersions(loadedScenarios);
            setIsLoading(false);
        },
        (err) => {
            console.error("Error loading scenarios:", err);
            setIsLoading(false);
        }
    );

    return () => unsubscribe();
  }, [user]);

  // --- 2. AUTO-SELECT LOGIC ---
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

  // --- 3. LOAD RESOURCES (SUBCOLLECTION) ---
  useEffect(() => {
      if (!activeScenarioId) {
          setActiveResources([]);
          return;
      }

      setIsResourcesLoading(true);
      const unsubscribe = resourceService.subscribeToResources(
          activeScenarioId,
          (resources) => {
              setActiveResources(resources);
              setIsResourcesLoading(false);
          },
          (err) => {
              console.error("Error loading resources:", err);
              setIsResourcesLoading(false);
          }
      );

      return () => unsubscribe();
  }, [activeScenarioId]);

  // --- 4. CONSTRUCT CURRENT SCENARIO OBJECT ---
  const scenario = useMemo(() => {
      if (!activeScenarioId || versions.length === 0) return null;
      const baseScenario = versions.find(v => v.id === activeScenarioId);
      if (!baseScenario) return null;

      // CLEAN V2 IMPLEMENTATION (Post-Migration)
      // We now rely purely on the activeResources (loaded from subcollection).
      // We ignore baseScenario.resources (the old array), unless activeResources is empty,
      // which might mean a network delay or a truly empty scenario.
      // But for cleanliness, we should prefer the V2 source of truth.
      
      return {
          ...baseScenario,
          resources: activeResources
      };
  }, [activeScenarioId, versions, activeResources]);


  // --- ACTIONS ---

  const initializeProject = async () => {
      if(!user) return;
      setIsLoading(true);
      try {
        const id = await scenarioService.createScenario({
            ...INITIAL_SCENARIO_DATA,
            ownerId: user.uid
        });
        setActiveScenarioId(id);
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
          // Note: This naive delete won't delete subcollections!
          // But for a hard reset dev tool, we might accept it leaves orphans, 
          // or we should list scenarios and delete them one by one.
          // For now, keeping logic simple as in original, but relying on service.
          // Ideally scenarioService.deleteScenario should handle recursive delete (firebase requires cloud function or client side loop).
          // Client side loop:
          for (const v of versions) {
              await scenarioService.deleteScenario(v.id);
          }
          setActiveScenarioId(null);
          await initializeProject();
      } catch (err) {
          console.error("Reset failed:", err);
          throw err;
      } finally {
          setIsLoading(false);
      }
  };

  const checkMutationAllowed = (): boolean => {
      if (!scenario) return false;
      if (scenario.status !== ScenarioStatus.DRAFT) {
          console.warn("Attempted to modify a non-DRAFT scenario.");
          return false;
      }
      return true;
  };

  // ENVELOPES (Still in Parent Document)
  const addEnvelope = (envelope: BudgetEnvelope) => {
    if (!checkMutationAllowed() || !scenario) return;
    scenarioService.updateScenario(scenario.id, { envelopes: [...scenario.envelopes, envelope] });
  };

  const updateEnvelope = (id: string, updates: Partial<BudgetEnvelope>) => {
    if (!checkMutationAllowed() || !scenario) return;
    scenarioService.updateScenario(scenario.id, { envelopes: scenario.envelopes.map(e => e.id === id ? { ...e, ...updates } : e) });
  };

  const deleteEnvelope = (id: string) => {
    if (!checkMutationAllowed() || !scenario) return;
    scenarioService.updateScenario(scenario.id, { envelopes: scenario.envelopes.filter(e => e.id !== id) });
  };

  // RESOURCES (Moved to Subcollection Service)
  const addResource = async (resource: Resource) => {
    if (!checkMutationAllowed() || !scenario) return;
    // We strip the ID if it's a placeholder, but resourceService.addResource expects object without ID if we want auto-ID.
    // However, the UI might have generated a temp ID.
    // Let's assume resource object passed here has an ID generated by the UI (uuid).
    // resourceService.addResource uses addDoc which generates ID.
    // If we want to enforce the ID from UI, we should use setDoc.
    // Let's look at resourceService implementation: it uses addDoc.
    // So we should pass the object excluding ID, or modify service to accept ID.
    // For now, let's trust the service creates a new ID.
    const { id, ...data } = resource; 
    await resourceService.addResource(scenario.id, data);
  };

  const updateResource = async (id: string, updates: Partial<Resource>) => {
    if (!checkMutationAllowed() || !scenario) return;
    await resourceService.updateResource(scenario.id, id, updates);
  };

  const deleteResource = async (id: string) => {
    if (!checkMutationAllowed() || !scenario) return;
    await resourceService.deleteResource(scenario.id, id);
  };

  const updateResourceOverride = async (resourceId: string, date: string, value: OverrideValue | undefined) => {
    if (!checkMutationAllowed() || !scenario) return;
    const res = scenario.resources.find(r => r.id === resourceId);
    if (!res) return;
    await resourceService.updateResourceOverride(scenario.id, res, date, value);
  };

  const bulkUpdateResourceOverrides = async (resourceId: string, startDate: Date, endDate: Date, value: OverrideValue | undefined) => {
    if (!checkMutationAllowed() || !scenario) return;
    const res = scenario.resources.find(r => r.id === resourceId);
    if (!res) return;
    await resourceService.bulkUpdateResourceOverrides(scenario.id, res, startDate, endDate, value);
  };

  const applyResourceHolidays = async (resourceId: string, year: number, externalHolidays: string[]) => {
    if (!checkMutationAllowed() || !scenario) return;
    const res = scenario.resources.find(r => r.id === resourceId);
    if (!res) return;
    await resourceService.applyResourceHolidays(scenario.id, res, externalHolidays);
  };

  // VERSIONS / SNAPSHOTS
  const createSnapshot = async (name: string) => {
    if (!scenario || !user) return;
    const newDraftData: Omit<Scenario, 'id'> = {
        name: name,
        status: ScenarioStatus.DRAFT,
        ownerId: user.uid,
        parentId: scenario.id,
        envelopes: scenario.envelopes,
        resources: [], // Don't put resources in parent array
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    try {
        const newId = await scenarioService.createScenario(newDraftData);
        // Copy resources to the new snapshot's subcollection
        await resourceService.copyResources(scenario.id, newId);
        setActiveScenarioId(newId);
    } catch (e) {
        console.error("Error creating version:", e);
    }
  };

  const restoreSnapshot = (snapshotId: string) => {
    setActiveScenarioId(snapshotId);
  };

  const publishScenario = async () => {
    if (!scenario || !user || scenario.status !== ScenarioStatus.DRAFT) return;

    try {
        const currentMasters = versions.filter(v => v.status === ScenarioStatus.MASTER);
        
        // 1. Publish (Archive old masters, Promote current, Create new Draft header)
        const newDraftId = await scenarioService.publishScenario(scenario.id, user.uid, scenario, currentMasters);
        
        // 2. Copy resources to the new Draft
        // The promoted master (scenario.id) already has resources in its subcollection.
        // We need to copy them to the newDraftId subcollection.
        await resourceService.copyResources(scenario.id, newDraftId);

        // 3. Switch to new draft
        setActiveScenarioId(newDraftId);
        return newDraftId; // Return ID or Name if needed by UI
    } catch (e) {
        console.error("Publish failed:", e);
        throw e;
    }
  };

  return {
    scenario,
    versions,
    isLoading: isLoading || isResourcesLoading, // Combine loading states
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
