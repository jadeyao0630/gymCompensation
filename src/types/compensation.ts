export type PositionCategory =
  | 'membership'
  | 'personalTraining'
  | 'swim'
  | 'operations';

export type ClassCommissionMode = 'percent' | 'fixed';

export interface CommissionTier {
  id: string;
  threshold: number;
  rate: number;
  classRate?: number;
  classMode?: ClassCommissionMode;
  note?: string;
}

export interface BaseSalaryTier {
  id: string;
  threshold: number;
  amount: number;
  note?: string;
}

export interface GenderSalaryTier {
  id: string;
  threshold: number;
  base?: number;
  male: number;
  female: number;
  newbie: number;
  note?: string;
  newbieFixed?: boolean;
}

export interface CourseCommission {
  id: string;
  courseName: string;
  mode: ClassCommissionMode;
  value: number;
  note?: string;
}

export interface PositionConfig {
  id: string;
  title: string;
  category: PositionCategory;
  headcount: number;
  performanceTarget: number;
  totalBaseSalary: number;
  commissionTiers: CommissionTier[];
  baseSalaryTiers: BaseSalaryTier[];
  genderSalaryTiers?: GenderSalaryTier[];
  extraNote?: string;
  classCommissionMode?: ClassCommissionMode;
  oldClassFee?: number;
  courseCommissions?: CourseCommission[];
  performanceSource?: 'self' | 'manager' | 'members' | 'aggregate';
  linkedManagerId?: string;

  commissionTiered?: boolean;
  baseTiered?: boolean;
  hasCommission?: boolean;
}

export interface MonthlyCompensationPlan {
  month: string;
  periodLabel: string;
  positions: PositionConfig[];
  importedFrom?: string;
  importedAt?: string;
}

export type CompensationStore = Record<string, MonthlyCompensationPlan>;

/* ============================================================
 * 模拟测算
 * ============================================================ */

export interface SimulationInput {
  propertyFee: number;
  electricityFee: number;
  rent: number;
}

export interface SimulationBreakdown {
  positionId: string;
  title: string;
  headcount: number;
  baseSalary: number;
  commissionRate: number;
  commission: number;
  allocatedRevenue: number;
}

export interface SimulationResult {
  fixedCost: number;
  totalBaseSalary: number;
  requiredRevenue: number;
  totalCommission: number;
  breakdown: SimulationBreakdown[];
  feasible: boolean;
  iterations: number;
}