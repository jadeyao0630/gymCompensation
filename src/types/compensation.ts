/* ============================================================
 * 基础类型
 * ============================================================ */

/* ⭐ 收款方式明细 */
export interface PayDetailItem {
  pay_type: string;      // "微信" / "现金" / "刷卡"
  amount: string;        // "2000.00"
  pay_type_id: string;   // "1" / "3" / "4"
}

export type PositionCategory =
  | 'membership'
  | 'personalTraining'
  | 'swim'
  | 'operations';

export type ClassCommissionMode = 'percent' | 'fixed';

export type DepartmentKey = '会籍' | '私教' | '泳教' | '运营';

/* ============================================================
 * 阶梯 / 佣金 / 底薪
 * ============================================================ */

export interface CommissionTier {
  id: string;
  threshold: number;
  rate: number;
  classRate?: number;
  classMode?: ClassCommissionMode;
  /** ⭐ 销提方式（默认 percent） */
  salesMode?: ClassCommissionMode;
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
  singlePrice?: number;
}

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

/* ============================================================
 * 职位配置
 * ============================================================ */

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
  oldClassFees?: OldClassFeeTier[];
  oldClassFeeTiers?: OldClassFeeTier[];

  courseCommissions?: CourseCommission[];
  performanceSource?: 'self' | 'manager' | 'members' | 'aggregate';
  linkedManagerId?: string;

  includedDepartments?: DepartmentKey[];
  includeSelf?: boolean;
  hasCommission?: boolean;
  calcFlags?: PositionCalcFlags;

  disabled?: boolean;

  /** ⭐ 经理业绩 = 本部门其他职位业绩总和（不含运营） */
  managerAggregateByDept?: boolean;
  /** ⭐ 经理业绩=部门总和时，是否额外加上自己的业绩 */
  managerIncludeSelf?: boolean;

  /** ⭐ 佣金是否按阶梯（false = 统一值，只用第一条） */
  commissionTiered?: boolean;
  /** ⭐ 底薪是否按阶梯（false = 统一值，只用第一条） */
  baseSalaryTiered?: boolean;
}

/* ============================================================
 * 月度方案
 * ============================================================ */

export interface MonthlyCompensationPlan {
  month: string;
  periodLabel: string;
  positions: PositionConfig[];
  importedFrom?: string;
  importedAt?: string;
}

export type CompensationStore = Record<string, MonthlyCompensationPlan>;

/* ============================================================
 * 课提测算输入
 * ============================================================ */

export interface CourseCommissionInput {
  /** ⭐ 备注（原 courseName，改为备注） */
  note: string;
  averagePrice: number;
  classCount: number;
  /** ⭐ 关联职位（用职位 title 作为值） */
  positionTitle: string;
}

export type CourseCommissionInputs = Record<string, CourseCommissionInput>;

/* ============================================================
 * 测算输入
 * ============================================================ */

export interface SimulationInput {
  propertyFee: number;
  electricityFee: number;
  rent: number;
  waterFee: number;
  networkFee: number;
  otherFee: number;
}

/* ============================================================
 * 测算结果（⭐ 合并重复定义，保留 payDetail）
 * ============================================================ */

/** ⭐ 单人分摊业绩明细 */
export interface SimulationEmployeeBreakdown {
  index: number;
  allocatedRevenue: number;
  /** 命中的底薪门槛 */
  hitBaseThreshold?: number;
  baseSalary: number;
  /** 命中的销提门槛 */
  hitCommissionThreshold?: number;
  commissionRate: number;
  commission: number;
  /** ⭐ 收款方式明细 */
  payDetail?: PayDetailItem[];
}

export interface SimulationPositionBreakdown {
  positionId: string;
  title: string;
  headcount: number;
  baseSalary: number;
  allocatedRevenue: number;
  commissionRate: number;
  commission: number;
  /** ⭐ 单人分摊明细 */
  perEmployee?: SimulationEmployeeBreakdown[];
  /** ⭐ 收款方式明细（职位级汇总） */
  payDetail?: PayDetailItem[];
}

export interface SimulationCourseBreakdown {
  courseName: string;
  averagePrice: number;
  classCount: number;
  headcount: number;
  mode: ClassCommissionMode;
  value: number;
  commission: number;
  /** ⭐ 收款方式明细 */
  payDetail?: PayDetailItem[];
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

/* ============================================================
 * 业绩分配 / 性别人数
 * ============================================================ */

export type RevenueShareConfig = Record<string, number>;

export interface GenderCount {
  maleCount: number;
  femaleCount: number;
  newbieCount?: number;
}

export type GenderCountConfig = Record<string, GenderCount>;

/* ============================================================
 * 工具函数
 * ============================================================ */

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