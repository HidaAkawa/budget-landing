// Domain Enums
export enum Country {
  FR = 'FR',
  PT = 'PT',
  IN = 'IN',
  CO = 'CO'
}

export enum ContractType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
  APPRENTICE = 'APPRENTICE',
  INTERN = 'INTERN'
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
  tribe?: string; // Optional Tribe name
  contractType: ContractType; // Mandatory Contract Type
  tjm: number;
  country: Country;
  ratioChange: number; 
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  overrides: OverrideMap;
  dynamicHolidays?: string[]; // Holds dates of holidays loaded from external APIs
  totalCost?: number; 
  totalDays?: number;
}

export interface Scenario {
  id: string;
  name: string;
  status: ScenarioStatus;
  ownerId?: string; // ID of the user who owns this draft
  parentId?: string; // ID of the MASTER scenario this draft was based on
  envelopes: BudgetEnvelope[];
  resources: Resource[];
  createdAt: number;
  updatedAt: number;
}

// New Interface for Calendar Templates
export interface CalendarTemplate {
  id: string;
  name: string; // e.g. "Interne 100%", "Stagiaire"
  country: Country;
  isDefault: boolean; // Is this the default selection for this country?
  overrides: OverrideMap; // Pre-defined leaves (e.g. August holidays)
  dynamicHolidays?: string[]; // Store which dates are actual holidays vs just leaves
}
