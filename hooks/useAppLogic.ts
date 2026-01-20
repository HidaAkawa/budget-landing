import { useState, useEffect } from 'react';
import { BudgetEnvelope, EnvelopeType, Scenario, ScenarioStatus, AuditLog, ScenarioSnapshot, Resource, OverrideValue } from '../types';
import { eachDayOfInterval, format } from 'date-fns';
import { User } from 'firebase/auth';
import { db } from '../services/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const INITIAL_SCENARIO: Scenario = {
    id: 'sc-1',
    name: 'Budget IT 2026',
    status: ScenarioStatus.DRAFT,
    envelopes: [
        { id: '1', name: 'Maintenance Application', type: EnvelopeType.RUN, amount: 1200000 },
        { id: '2', name: 'Projet Migration Cloud', type: EnvelopeType.CHANGE, amount: 850000 },
        { id: '3', name: 'Support N3', type: EnvelopeType.RUN, amount: 400000 },
        { id: '4', name: 'Nouvelle Feature IA', type: EnvelopeType.CHANGE, amount: 300000 },
    ],
    resources: [],
    auditLogs: [],
    snapshots: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
};

const SCENARIO_DOC_ID = "shared-scenario-v1";

export function useAppLogic(user: User | null) {
  const [scenario, setScenario] = useState<Scenario>(INITIAL_SCENARIO);
  const [isLoading, setIsLoading] = useState(true);

  // --- Firestore Real-time Sync ---
  useEffect(() => {
    if (!user) {
        setScenario(INITIAL_SCENARIO);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    const scenarioRef = doc(db, "scenarios", SCENARIO_DOC_ID);

    const unsubscribe = onSnapshot(scenarioRef, async (docSnap) => {
        if (docSnap.exists()) {
            setScenario(docSnap.data() as Scenario);
            setIsLoading(false);
        } else {
            // The document doesn't exist, so we create it.
            // The listener will automatically pick up the new state.
            try {
                await setDoc(scenarioRef, INITIAL_SCENARIO);
            } catch (error) {
                console.error("Error creating initial scenario:", error);
                setIsLoading(false); // Stop loading on error
            }
        }
    }, (error) => {
        console.error("Error listening to scenario changes:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Internal Helper to Update DB ---
  const updateScenarioInDb = async (updatedScenario: Scenario) => {
    const scenarioRef = doc(db, "scenarios", SCENARIO_DOC_ID);
    try {
        await setDoc(scenarioRef, updatedScenario, { merge: true });
    } catch (error) {
        console.error("Error updating scenario in DB:", error);
    }
  };
  
  const logAction = (action: string, details: string, entityType: AuditLog['entityType'], entityId?: string) => {
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      user: user ? `${user.displayName} (${user.email})` : 'System',
      action,
      details,
      entityType,
      entityId
    };
    return newLog;
  };

  // --- Envelope Management ---
  const addEnvelope = (envelope: BudgetEnvelope) => {
    const updatedScenario = {
      ...scenario,
      envelopes: [...scenario.envelopes, envelope],
      auditLogs: [logAction('CREATE', `Created envelope "${envelope.name}"`, 'ENVELOPE', envelope.id), ...scenario.auditLogs],
      updatedAt: Date.now(),
    };
    updateScenarioInDb(updatedScenario);
  };

  const updateEnvelope = (id: string, updates: Partial<BudgetEnvelope>) => {
    const oldEnv = scenario.envelopes.find(e => e.id === id);
    if (!oldEnv) return;

    const newEnv = { ...oldEnv, ...updates };
    const changes = Object.keys(updates).map(key => `${key}: ${oldEnv[key as keyof BudgetEnvelope]} -> ${updates[key as keyof Partial<BudgetEnvelope>]}`).join(', ');
    
    const updatedScenario = {
        ...scenario,
        envelopes: scenario.envelopes.map(e => e.id === id ? newEnv : e),
        auditLogs: [logAction('UPDATE', `Updated envelope "${newEnv.name}": ${changes}`, 'ENVELOPE', id), ...scenario.auditLogs],
        updatedAt: Date.now(),
    };
    updateScenarioInDb(updatedScenario);
  };

  const deleteEnvelope = (id: string) => {
    const env = scenario.envelopes.find(e => e.id === id);
    const updatedScenario = {
        ...scenario,
        envelopes: scenario.envelopes.filter(e => e.id !== id),
        auditLogs: [logAction('DELETE', `Deleted envelope "${env?.name}"`, 'ENVELOPE', id), ...scenario.auditLogs],
        updatedAt: Date.now(),
    };
    updateScenarioInDb(updatedScenario);
  };

  // --- Resource Management ---
  const addResource = (resource: Resource) => {
    const updatedScenario = {
        ...scenario,
        resources: [...scenario.resources, resource],
        auditLogs: [logAction('CREATE', `Created resource "${resource.firstName}"`, 'RESOURCE', resource.id), ...scenario.auditLogs],
        updatedAt: Date.now(),
    };
    updateScenarioInDb(updatedScenario);
  };

  const updateResource = (id: string, updates: Partial<Resource>) => {
    const oldRes = scenario.resources.find(r => r.id === id);
    if (!oldRes) return;

    const newRes = { ...oldRes, ...updates };
    const changes = Object.keys(updates).map(key => `${key}: ${oldRes[key as keyof Resource]} -> ${updates[key as keyof Partial<Resource>]}`).join(', ');

    const updatedScenario = {
        ...scenario,
        resources: scenario.resources.map(r => r.id === id ? newRes : r),
        auditLogs: [logAction('UPDATE', `Updated resource "${newRes.firstName}": ${changes}`, 'RESOURCE', id), ...scenario.auditLogs],
        updatedAt: Date.now(),
    };
    updateScenarioInDb(updatedScenario);
  };

  const updateResourceOverride = (resourceId: string, date: string, value: OverrideValue | undefined) => {
    const res = scenario.resources.find(r => r.id === resourceId);
    if (!res) return;

    const newOverrides = { ...res.overrides };
    if (value === undefined) {
      delete newOverrides[date];
    } else {
      newOverrides[date] = value;
    }

    const updatedResources = scenario.resources.map(r => r.id === resourceId ? { ...r, overrides: newOverrides } : r);
    const updatedScenario = {
        ...scenario,
        resources: updatedResources,
        auditLogs: [logAction('UPDATE', `Override for ${res.firstName} on ${date} to ${value}`, 'RESOURCE', resourceId), ...scenario.auditLogs],
        updatedAt: Date.now(),
    };
    updateScenarioInDb(updatedScenario);
  };

  const bulkUpdateResourceOverrides = (resourceId: string, startDate: Date, endDate: Date, value: OverrideValue | undefined) => {
    const res = scenario.resources.find(r => r.id === resourceId);
    if (!res) return;

    const newOverrides = { ...res.overrides };
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        if (value === undefined) {
            delete newOverrides[dateStr];
        } else {
            newOverrides[dateStr] = value;
        }
    });

    const updatedResources = scenario.resources.map(r => r.id === resourceId ? { ...r, overrides: newOverrides } : r);
    const updatedScenario = {
        ...scenario,
        resources: updatedResources,
        auditLogs: [logAction('UPDATE', `Bulk override for ${res.firstName} from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`, 'RESOURCE', resourceId), ...scenario.auditLogs],
        updatedAt: Date.now(),
    };
    updateScenarioInDb(updatedScenario);
  };

  const applyResourceHolidays = (resourceId: string, year: number, externalHolidays: string[]) => {
    const res = scenario.resources.find(r => r.id === resourceId);
    if (!res) return;

    const newOverrides = { ...res.overrides };
    externalHolidays.forEach(dateStr => {
        newOverrides[dateStr] = 0;
    });

    const newDynamicHolidays = [...new Set([...(res.dynamicHolidays || []), ...externalHolidays])];
    const updatedResources = scenario.resources.map(r => 
        r.id === resourceId 
        ? { ...r, overrides: newOverrides, dynamicHolidays: newDynamicHolidays } 
        : r
    );

    const updatedScenario = {
        ...scenario,
        resources: updatedResources,
        auditLogs: [logAction('UPDATE', `Applied ${externalHolidays.length} holidays for ${res.firstName}`, 'RESOURCE', resourceId), ...scenario.auditLogs],
        updatedAt: Date.now(),
    };
    updateScenarioInDb(updatedScenario);
  };

  const deleteResource = (id: string) => {
    const res = scenario.resources.find(r => r.id === id);
    const updatedScenario = {
        ...scenario,
        resources: scenario.resources.filter(r => r.id !== id),
        auditLogs: [logAction('DELETE', `Deleted resource "${res?.firstName}"`, 'RESOURCE', id), ...scenario.auditLogs],
        updatedAt: Date.now(),
    };
    updateScenarioInDb(updatedScenario);
  };

  // --- Simulation / Versioning ---
  const createSnapshot = (name: string) => {
    const snapshot: ScenarioSnapshot = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      date: Date.now(),
      envelopes: JSON.parse(JSON.stringify(scenario.envelopes)),
      resources: JSON.parse(JSON.stringify(scenario.resources)),
    };
    const updatedScenario = {
        ...scenario,
        snapshots: [snapshot, ...scenario.snapshots],
        auditLogs: [logAction('SNAPSHOT', `Created snapshot "${name}"`, 'SCENARIO'), ...scenario.auditLogs],
    };
    updateScenarioInDb(updatedScenario);
  };

  const restoreSnapshot = (snapshotId: string) => {
    const snapshot = scenario.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) return;

    const updatedScenario = {
        ...scenario,
        envelopes: JSON.parse(JSON.stringify(snapshot.envelopes)),
        resources: JSON.parse(JSON.stringify(snapshot.resources)),
        auditLogs: [logAction('RESTORE', `Restored snapshot "${snapshot.name}"`, 'SCENARIO'), ...scenario.auditLogs],
        updatedAt: Date.now(),
    };
    updateScenarioInDb(updatedScenario);
  };

  const publishScenario = () => {
    const updatedScenario = {
        ...scenario,
        status: ScenarioStatus.MASTER,
        auditLogs: [logAction('PUBLISH', `Published scenario to MASTER`, 'SCENARIO'), ...scenario.auditLogs],
        updatedAt: Date.now(),
    };
    updateScenarioInDb(updatedScenario);
  };

  return {
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
  };
}
