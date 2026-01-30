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

  // Helper to get consistent ID (Email)
  const userIdentifier = user?.email || user?.uid;

  // --- 1. LOAD SCENARIOS ---
  useEffect(() => {
    if (!userIdentifier) {
        setVersions([]);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);

    // FIX: Use userIdentifier (Email) instead of UID
    const unsubscribe = scenarioService.subscribeToScenarios(
        userIdentifier,
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
  }, [userIdentifier]);

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

      return {
          ...baseScenario,
          resources: activeResources
      };
  }, [activeScenarioId, versions, activeResources]);


  // --- ACTIONS ---

  const initializeProject = async () => {
      if(!userIdentifier) return;
      setIsLoading(true);
      try {
        const id = await scenarioService.createScenario({
            ...INITIAL_SCENARIO_DATA,
            ownerId: userIdentifier // FIX: Use Email
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

  // ENVELOPES
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

  // RESOURCES
  const addResource = async (resource: Resource) => {
    if (!checkMutationAllowed() || !scenario) return;
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
    if (!scenario || !userIdentifier) return;
    const newDraftData: Omit<Scenario, 'id'> = {
        name: name,
        status: ScenarioStatus.DRAFT,
        ownerId: userIdentifier, // FIX: Use Email
        parentId: scenario.id,
        envelopes: scenario.envelopes,
        resources: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    try {
        const newId = await scenarioService.createScenario(newDraftData);
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
    if (!scenario || !userIdentifier || scenario.status !== ScenarioStatus.DRAFT) return;

    try {
        const currentMasters = versions.filter(v => v.status === ScenarioStatus.MASTER);
        
        // FIX: Use Email
        const newDraftId = await scenarioService.publishScenario(scenario.id, userIdentifier, scenario, currentMasters);
        
        await resourceService.copyResources(scenario.id, newDraftId);
        setActiveScenarioId(newDraftId);
        return newDraftId;
    } catch (e) {
        console.error("Publish failed:", e);
        throw e;
    }
  };

  return {
    scenario,
    versions,
    isLoading: isLoading || isResourcesLoading,
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
