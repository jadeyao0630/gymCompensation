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
 * ⭐ 销售明细（每笔订单）
 * 对齐 ClassMemberDetail，支持每笔独立提点
 * ============================================================ */
export interface SalesMemberDetail {
  /** 订单 id */
  orderId: string;
  /** 会员名 */
  memberName: string;
  /** 卡种 */
  cardName: string;
  /** 这笔订单中"本人归属"的业绩金额 */
  amount: number;
  /** 卡金额（订单总额） */
  cardAmount: number;
  /** 日期 */
  dealTime: string;
  /** ⭐ 经理汇总时：该笔来自哪个员工 */
  sourceStaffId?: string;
  sourceStaffName?: string;
  /** ⭐ 每笔独立提点（对齐 ClassMemberDetail） */
  mode?: 'percent' | 'fixed';
  value?: number;
  /** 收款方式明细 */
  payDetail?: PayDetailItem[];
  /** 业绩归属明细（用于展示） */
  marketers?: Array<{
    name: string;
    role: string;
    percent: string;
    amount: string;
  }>;
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
  /** ⭐ 销售明细（测算/懒加载后回填） */
  salesDetail?: SalesMemberDetail[];
  /** ⭐ 销售明细应拉取的员工 id 列表（经理聚合时用） */
  salesSourceStaffIds?: Array<{
    id: string;
    name: string;
    positionTitle: string;
  }>;
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
  name: string;
  amount: number;
  source: 'position' | 'staff' | 'department';
  trigger: 'auto' | 'manual';
  note?: string;
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

  /** ⭐ 销售明细（每笔订单，支持独立提点） */
  salesDetail?: SalesMemberDetail[];
  /** ⭐ 销售明细应拉取的员工 id 列表（经理聚合时用） */
  salesSourceStaffIds?: Array<{
    id: string;
    name: string;
    positionTitle: string;
  }>;

  fullAttendance: boolean;
  absentDays: number;
  absentDeduction: number;

  rewards?: RewardHit[];
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
  rewardsTotal: number;
  total: number;
  configuredHeadcount: number;
}

export type { PositionConfig };