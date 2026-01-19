import { useState, useCallback } from 'react';
import { BudgetEnvelope, EnvelopeType, Scenario, ScenarioStatus, AuditLog, ScenarioSnapshot, Resource, OverrideValue } from '../types';
import { eachDayOfInterval, format } from 'date-fns';
import { HOLIDAYS } from '../constants';

const INITIAL_ENVELOPES: BudgetEnvelope[] = [
  { id: '1', name: 'Maintenance Application', type: EnvelopeType.RUN, amount: 1200000 },
  { id: '2', name: 'Projet Migration Cloud', type: EnvelopeType.CHANGE, amount: 850000 },
  { id: '3', name: 'Support N3', type: EnvelopeType.RUN, amount: 400000 },
  { id: '4', name: 'Nouvelle Feature IA', type: EnvelopeType.CHANGE, amount: 300000 },
];

const MOCK_USER = "John Doe (john.doe@company.com)";

export function useAppLogic() {
  const [scenario, setScenario] = useState<Scenario>({
    id: 'sc-1',
    name: 'Budget IT 2026',
    status: ScenarioStatus.DRAFT,
    envelopes: INITIAL_ENVELOPES,
    resources: [],
    auditLogs: [],
    snapshots: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // --- Internal Helpers ---
  const logAction = (action: string, details: string, entityType: AuditLog['entityType'], entityId?: string) => {
    const newLog: AuditLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      user: MOCK_USER,
      action,
      details,
      entityType,
      entityId
    };
    return newLog;
  };

  // --- Envelope Management ---
  const addEnvelope = (envelope: BudgetEnvelope) => {
    setScenario(prev => {
      const log = logAction('CREATE', `Created envelope "${envelope.name}" (${envelope.amount}€)`, 'ENVELOPE', envelope.id);
      return {
        ...prev,
        envelopes: [...prev.envelopes, envelope],
        auditLogs: [log, ...prev.auditLogs],
        updatedAt: Date.now()
      };
    });
  };

  const updateEnvelope = (id: string, updates: Partial<BudgetEnvelope>) => {
    setScenario(prev => {
      const oldEnv = prev.envelopes.find(e => e.id === id);
      if (!oldEnv) return prev;

      const newEnv = { ...oldEnv, ...updates };
      
      // Calculate diff for audit log
      const changes: string[] = [];
      if (oldEnv.name !== newEnv.name) changes.push(`Name: ${oldEnv.name} -> ${newEnv.name}`);
      if (oldEnv.amount !== newEnv.amount) changes.push(`Amount: ${oldEnv.amount} -> ${newEnv.amount}`);
      if (oldEnv.type !== newEnv.type) changes.push(`Type: ${oldEnv.type} -> ${newEnv.type}`);

      if (changes.length === 0) return prev;

      const log = logAction('UPDATE', `Updated envelope "${newEnv.name}": ${changes.join(', ')}`, 'ENVELOPE', id);

      return {
        ...prev,
        envelopes: prev.envelopes.map(e => e.id === id ? newEnv : e),
        auditLogs: [log, ...prev.auditLogs],
        updatedAt: Date.now()
      };
    });
  };

  const deleteEnvelope = (id: string) => {
    setScenario(prev => {
      const env = prev.envelopes.find(e => e.id === id);
      const log = logAction('DELETE', `Deleted envelope "${env?.name}"`, 'ENVELOPE', id);
      return {
        ...prev,
        envelopes: prev.envelopes.filter(e => e.id !== id),
        auditLogs: [log, ...prev.auditLogs],
        updatedAt: Date.now()
      };
    });
  };

  // --- Resource Management ---
  const addResource = (resource: Resource) => {
    setScenario(prev => {
      const log = logAction('CREATE', `Created resource "${resource.firstName} ${resource.lastName}" (${resource.startDate} to ${resource.endDate})`, 'RESOURCE', resource.id);
      return {
        ...prev,
        resources: [...prev.resources, resource],
        auditLogs: [log, ...prev.auditLogs],
        updatedAt: Date.now()
      };
    });
  };

  const updateResource = (id: string, updates: Partial<Resource>) => {
    setScenario(prev => {
      const oldRes = prev.resources.find(r => r.id === id);
      if (!oldRes) return prev;

      const newRes = { ...oldRes, ...updates };
      
      const changes: string[] = [];
      if (oldRes.firstName !== newRes.firstName) changes.push(`First Name: ${oldRes.firstName} -> ${newRes.firstName}`);
      if (oldRes.lastName !== newRes.lastName) changes.push(`Last Name: ${oldRes.lastName} -> ${newRes.lastName}`);
      if (oldRes.tjm !== newRes.tjm) changes.push(`TJM: ${oldRes.tjm} -> ${newRes.tjm}`);
      if (oldRes.country !== newRes.country) changes.push(`Country: ${oldRes.country} -> ${newRes.country}`);
      if (oldRes.ratioChange !== newRes.ratioChange) changes.push(`Change %: ${oldRes.ratioChange} -> ${newRes.ratioChange}`);
      if (oldRes.startDate !== newRes.startDate) changes.push(`Start Date: ${oldRes.startDate} -> ${newRes.startDate}`);
      if (oldRes.endDate !== newRes.endDate) changes.push(`End Date: ${oldRes.endDate} -> ${newRes.endDate}`);

      if (changes.length === 0) return prev;

      const log = logAction('UPDATE', `Updated resource "${newRes.firstName} ${newRes.lastName}": ${changes.join(', ')}`, 'RESOURCE', id);

      return {
        ...prev,
        resources: prev.resources.map(r => r.id === id ? newRes : r),
        auditLogs: [log, ...prev.auditLogs],
        updatedAt: Date.now()
      };
    });
  };

  const updateResourceOverride = (resourceId: string, date: string, value: OverrideValue | undefined) => {
    setScenario(prev => {
      const res = prev.resources.find(r => r.id === resourceId);
      if (!res) return prev;

      // Create a new overrides object
      const newOverrides = { ...res.overrides };
      if (value === undefined) {
        delete newOverrides[date];
      } else {
        newOverrides[date] = value;
      }

      const log = logAction(
        'UPDATE', 
        `Updated calendar for "${res.firstName} ${res.lastName}" on ${date}: ${value ?? 'Default'}`, 
        'RESOURCE', 
        resourceId
      );

      return {
        ...prev,
        resources: prev.resources.map(r => r.id === resourceId ? { ...r, overrides: newOverrides } : r),
        auditLogs: [log, ...prev.auditLogs],
        updatedAt: Date.now()
      };
    });
  };

  const bulkUpdateResourceOverrides = (resourceId: string, startDate: Date, endDate: Date, value: OverrideValue | undefined) => {
    setScenario(prev => {
      const res = prev.resources.find(r => r.id === resourceId);
      if (!res) return prev;

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

      const log = logAction(
        'UPDATE', 
        `Bulk update calendar for "${res.firstName} ${res.lastName}": ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')} set to ${value ?? 'Default'}`, 
        'RESOURCE', 
        resourceId
      );

      return {
        ...prev,
        resources: prev.resources.map(r => r.id === resourceId ? { ...r, overrides: newOverrides } : r),
        auditLogs: [log, ...prev.auditLogs],
        updatedAt: Date.now()
      };
    });
  };

  const applyResourceHolidays = (resourceId: string, year: number, externalHolidays?: string[]) => {
    setScenario(prev => {
      const res = prev.resources.find(r => r.id === resourceId);
      if (!res) return prev;

      let holidaysToApply: string[] = [];

      if (externalHolidays && externalHolidays.length > 0) {
        holidaysToApply = externalHolidays;
      } else {
        // Fallback to constants if no external holidays provided
        const countryHolidays = HOLIDAYS[res.country] || [];
        holidaysToApply = countryHolidays.filter(d => d.startsWith(`${year}-`));
      }

      const newOverrides = { ...res.overrides };
      
      // For each holiday, set it to 0 (Off)
      holidaysToApply.forEach(dateStr => {
        newOverrides[dateStr] = 0;
      });

      const log = logAction(
        'UPDATE', 
        `Imported ${holidaysToApply.length} holidays for ${year} (${res.country}) for "${res.firstName} ${res.lastName}"`, 
        'RESOURCE', 
        resourceId
      );

      return {
        ...prev,
        resources: prev.resources.map(r => r.id === resourceId ? { ...r, overrides: newOverrides } : r),
        auditLogs: [log, ...prev.auditLogs],
        updatedAt: Date.now()
      };
    });
  };

  const deleteResource = (id: string) => {
    setScenario(prev => {
      const res = prev.resources.find(r => r.id === id);
      const log = logAction('DELETE', `Deleted resource "${res?.firstName} ${res?.lastName}"`, 'RESOURCE', id);
      return {
        ...prev,
        resources: prev.resources.filter(r => r.id !== id),
        auditLogs: [log, ...prev.auditLogs],
        updatedAt: Date.now()
      };
    });
  };

  // --- Simulation / Versioning ---

  const createSnapshot = (name: string) => {
    setScenario(prev => {
      const snapshot: ScenarioSnapshot = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        date: Date.now(),
        envelopes: JSON.parse(JSON.stringify(prev.envelopes)), // Deep copy
      };
      
      const log = logAction('SNAPSHOT', `Created version "${name}"`, 'SCENARIO');
      
      return {
        ...prev,
        snapshots: [snapshot, ...prev.snapshots],
        auditLogs: [log, ...prev.auditLogs]
      };
    });
  };

  const restoreSnapshot = (snapshotId: string) => {
    setScenario(prev => {
      const snapshot = prev.snapshots.find(s => s.id === snapshotId);
      if (!snapshot) return prev;

      const log = logAction('RESTORE', `Restored version "${snapshot.name}"`, 'SCENARIO');

      return {
        ...prev,
        envelopes: JSON.parse(JSON.stringify(snapshot.envelopes)),
        auditLogs: [log, ...prev.auditLogs],
        updatedAt: Date.now()
      };
    });
  };

  const publishScenario = () => {
    setScenario(prev => {
      const log = logAction('PUBLISH', `Scenario published as MASTER`, 'SCENARIO');
      return {
        ...prev,
        status: ScenarioStatus.MASTER,
        auditLogs: [log, ...prev.auditLogs],
        updatedAt: Date.now()
      };
    });
  };

  return {
    scenario,
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