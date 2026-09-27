export type PositionCategory =
  | 'membership'
  | 'personalTraining'
  | 'swim'
  | 'operations';

export type ClassCommissionMode = 'percent' | 'fixed';

export type DepartmentKey = '会籍' | '私教' | '泳教' | '运营';

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
  male: number;
  female: number;
  newbie: number;
  base?: number;
  newbieFixed?: boolean;
  note?: string;
}

export interface CourseCommission {
  id: string;
  courseName: string;
  mode: ClassCommissionMode;
  value: number;
  note?: string;
}

/** ⭐ 老课费用：按业绩门槛配置的单价（元/节） */
export interface OldClassFeeTier {
  id: string;
  threshold: number;
  fee: number;
  note?: string;
}

export interface PositionCalcFlags {
  includePerformance?: boolean;
  includeSalesCommission?: boolean;
  includeBaseSalary?: boolean;
  includeClassAmount?: boolean;
  includeClassCommission?: boolean;
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

  /** 兼容字段：单一老课单价（旧数据） */
  oldClassFee?: number;
  /** ⭐ 新增：按业绩档位配置的老课单价（优先于 oldClassFee） */
  oldClassFees?: OldClassFeeTier[];

  courseCommissions?: CourseCommission[];
  performanceSource?: 'self' | 'manager' | 'members' | 'aggregate';
  linkedManagerId?: string;

  includedDepartments?: DepartmentKey[];
  includeSelf?: boolean;
  hasCommission?: boolean;
  calcFlags?: PositionCalcFlags;
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
 * 课提测算
 * ============================================================ */
export interface CourseCommissionInput {
  courseName: string;
  averagePrice: number;
  classCount: number;
  positionKeyword: string;
}

export type CourseCommissionInputs = Record<string, CourseCommissionInput>;

/* ============================================================
 * 模拟测算
 * ============================================================ */
export interface SimulationInput {
  propertyFee: number;
  electricityFee: number;
  rent: number;
  waterFee: number;
  networkFee: number;
  otherFee: number;
}

export interface SimulationPositionBreakdown {
  positionId: string;
  title: string;
  headcount: number;
  baseSalary: number;
  allocatedRevenue: number;
  commissionRate: number;
  commission: number;
}

export interface SimulationCourseBreakdown {
  courseName: string;
  averagePrice: number;
  classCount: number;
  headcount: number;
  mode: ClassCommissionMode;
  value: number;
  commission: number;
}

export interface SimulationResult {
  fixedCost: number;
  totalBaseSalary: number;
  totalCommission: number;
  totalClassCommission: number;
  requiredRevenue: number;
  iterations: number;
  breakdown: SimulationPositionBreakdown[];
  courseBreakdown: SimulationCourseBreakdown[];
}

export type RevenueShareConfig = Record<string, number>;

export interface GenderCount {
  maleCount: number;
  femaleCount: number;
  newbieCount?: number;
}

export type GenderCountConfig = Record<string, GenderCount>;

export function resolveCalcFlags(
  position: PositionConfig | undefined
): Required<PositionCalcFlags> {
  const f = position?.calcFlags || {};
  return {
    includePerformance: f.includePerformance ?? true,
    includeSalesCommission: f.includeSalesCommission ?? true,
    includeBaseSalary: f.includeBaseSalary ?? true,
    includeClassAmount: f.includeClassAmount ?? true,
    includeClassCommission: f.includeClassCommission ?? true,
  };
}