// Domain Enums
export enum Country {
  FR = 'FR',
  PT = 'PT',
  IN = 'IN',
  CO = 'CO'
}

export enum EnvelopeType {
  RUN = 'RUN',
  CHANGE = 'CHANGE'
}

export enum ScenarioStatus {
  DRAFT = 'DRAFT',
  MASTER = 'MASTER',
  ARCHIVED = 'ARCHIVED'
}

// Presence types: 0 (Off), 0.5 (Half-day), 1 (Full day)
export type OverrideValue = 0 | 0.5 | 1;

export type OverrideMap = Record<string, OverrideValue>;

export interface BudgetEnvelope {
  id: string;
  name: string;
  type: EnvelopeType;
  amount: number;
}

export interface Resource {
  id: string;
  firstName: string;
  lastName: string;
  tjm: number;
  country: Country;
  ratioChange: number; 
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  overrides: OverrideMap;
  totalCost?: number; 
  totalDays?: number;
}

export interface AuditLog {
  id: string;
  timestamp: number;
  user: string;
  action: string;
  details: string;
  entityType: 'ENVELOPE' | 'RESOURCE' | 'SCENARIO';
  entityId?: string;
}

export interface ScenarioSnapshot {
  id: string;
  name: string;
  date: number;
  envelopes: BudgetEnvelope[];
  // In a full app, would also include resources
}

export interface Scenario {
  id: string;
  name: string;
  status: ScenarioStatus;
  envelopes: BudgetEnvelope[];
  resources: Resource[];
  auditLogs: AuditLog[];
  snapshots: ScenarioSnapshot[];
  createdAt: number;
  updatedAt: number;
}