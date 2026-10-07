import type { PositionConfig } from './compensation';

/* ============================================================
 * 收款方式
 * ============================================================ */
export interface PayDetailItem {
  pay_type: string;
  amount: string;
  pay_type_id: string;
}

/* ============================================================
 * 性别
 * ============================================================ */
export type Gender = 'male' | 'female' | 'newbie';

/* ============================================================
 * 消课明细
 * ============================================================ */
export interface ClassMemberDetail {
  courseName: string;
  memberName: string;
  memberId: string;
  signNum: number;
  price: number;
  amount: number;
  mode?: 'percent' | 'fixed';
  value?: number;
  payDetail?: PayDetailItem[];
}

/* ============================================================
 * 提成比例
 * ============================================================ */
export interface CourseCommissionRate {
  rate: number;
  mode: 'percent' | 'fixed';
}

/* ============================================================
 * 员工业绩（合并阶段）
 * ============================================================ */
export interface EmployeePerformance {
  staffId: string;
  staffName: string;
  staffPhone: string;
  positionTitle: string;
  gender?: Gender;
  salesAmount: number;
  classCount: number;
  classAmount: number;
  classByCourse?: Record<string, { count: number; amount: number }>;
  classMemberDetail?: ClassMemberDetail[];
  managerSalesBase?: number;
  fullAttendance?: boolean;
  absentDays?: number;
  payDetail?: PayDetailItem[];
}

/* ============================================================
 * ⭐ 奖金命中项
 * ============================================================ */
export interface RewardHit {
  rewardId: string;
  name: string;                        // ⭐ 显示用
  amount: number;                      // 生效金额
  source: 'position' | 'staff' | 'department';      // 职位级 / 个人级
  trigger: 'auto' | 'manual';          // 自动命中 / 手动勾选
  note?: string;

  /** ⭐ 类型：奖励 / 扣款 */
  type?: 'reward' | 'deduction';
}

/* ============================================================
 * 单人薪酬计算结果
 * ============================================================ */
export interface PayrollResult {
  staffId: string;
  staffName: string;
  staffPhone: string;
  positionTitle: string;
  gender: Gender;
  isNewbie: boolean;
  isManager: boolean;
  isStore: boolean;

  salesAmount: number;
  classCount: number;
  classAmount: number;
  hitCommissionRate: number;
  hitCommissionNote?: string;
  hitBaseSalary: number;
  baseSalary: number;
  salesCommission: number;

  classCommissionDetail?: Record<string, number>;
  courseCommissionRates?: Record<string, CourseCommissionRate>;
  classCommission: number;

  classMemberDetail?: ClassMemberDetail[];

  fullAttendance: boolean;
  absentDays: number;
  absentDeduction: number;

  /** ⭐ 奖金明细 */
  rewards?: RewardHit[];
  /** ⭐ 奖金合计 */
  rewardsTotal?: number;

  total: number;
  payDetail?: PayDetailItem[];
}

/* ============================================================
 * 其他
 * ============================================================ */
export interface MergeInput {
  positionTitle: string;
  records: Record<string, any>[];
}

export interface CoachInfo {
  id: string;
  phone?: string;
  sex?: string | number;
  positionId?: string | number;
  positionTitle?: string;
  positions?: string[];
  raw: Record<string, any>;
}

export type Department = '会籍' | '私教' | '泳教' | '运营';

export interface MissingPositionInfo {
  positionTitle: string;
  employees: {
    staffId: string;
    staffName: string;
    staffPhone: string;
    salesAmount: number;
    classCount: number;
    classAmount: number;
  }[];
}

export interface DepartmentStats {
  department: Department;
  headcount: number;
  salesAmount: number;
  classAmount: number;
  classCount: number;
  baseSalary: number;
  salesCommission: number;
  classCommission: number;
  /** ⭐ 奖金合计 */
  rewardsTotal: number;
  total: number;
  configuredHeadcount: number;
}

export type { PositionConfig };