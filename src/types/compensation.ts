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

export type RevenueShareConfig = Record<string, number>;

/**
 * 课提测算输入：只填均价和节数
 * 人数、课提模式、课提值自动从对应职位佣金阶梯取
 */
export interface CourseCommissionInput {
  /** 课程名 */
  courseName: string;
  /** 课程均价（元/节） */
  averagePrice: number;
  /** 消课数量（节） */
  classCount: number;
  /**
   * 对应的职位标题关键字（用于自动匹配 headcount 和阶梯课提）
   * 例如 "泳教" / "私教"
   */
  positionKeyword: string;
}

export type CourseCommissionInputs = Record<string, CourseCommissionInput>;

export interface SimulationBreakdown {
  positionId: string;
  title: string;
  headcount: number;
  baseSalary: number;
  commissionRate: number;
  commission: number;
  allocatedRevenue: number;
  type?: 'shareable' | 'manager' | 'store' | 'fixed';
  /** 课提明细（仅课程行有） */
  classCommission?: number;
}

export interface SimulationResult {
  fixedCost: number;
  totalBaseSalary: number;
  requiredRevenue: number;
  totalCommission: number;
  totalClassCommission: number;
  breakdown: SimulationBreakdown[];
  /** 课程课提明细 */
  courseBreakdown: {
    courseName: string;
    averagePrice: number;
    classCount: number;
    headcount: number;
    mode: ClassCommissionMode;
    value: number;
    commission: number;
  }[];
  feasible: boolean;
  iterations: number;
}