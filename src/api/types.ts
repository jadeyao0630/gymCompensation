/* ============================================================
 * 通用
 * ============================================================ */
export interface ApiError {
  error: string;
  message: string;
}

/** 任意记录，允许字段名不固定 */
export type AnyRecord = Record<string, any>;

/* ============================================================
 * 登录
 * ============================================================ */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data?: unknown;
}

/* ============================================================
 * 统计接口通用参数
 * ============================================================ */
export interface StatsRequest {
  bus_id: string;      // "12279" 富贵园
  s_date: string;      // yyyy-MM-dd
  e_date: string;      // yyyy-MM-dd
  page_no: number;     // 1
  page_size: number;   // 1000
}

/* ============================================================
 * 售卡售课业绩（会籍 / 泳教 / 私教）
 *
 * 实际接口返回结构示例：
 * {
 *   "list": [
 *     { "id": 1, "name": "张三", "phone": "138...", "achievement": "12000" }
 *   ]
 * }
 * ============================================================ */
export interface SalesItem {
  id?: string | number;
  name?: string;
  phone?: string;
  achievement?: number | string;
  /** 兜底字段，兼容其他命名 */
  staff_name?: string;
  coach_name?: string;
  sale_amount?: number | string;
  amount?: number | string;
  [key: string]: unknown;
}

export interface SalesResponse {
  list?: SalesItem[];
  data?: SalesItem[] | { list?: SalesItem[] };
  total?: number;
  [key: string]: unknown;
}

/* ============================================================
 * 消课统计（游泳课 / 教练课）
 *
 * 实际接口可能返回：
 * {
 *   "list": [
 *     { "id": 1, "name": "李四", "class_count": 20, "class_amount": 4000 }
 *   ]
 * }
 * ============================================================ */
export interface ClassItem {
  id?: string | number;
  name?: string;
  phone?: string;
  class_count?: number | string;
  class_amount?: number | string;
  /** 兜底字段 */
  count?: number | string;
  amount?: number | string;
  [key: string]: unknown;
}

export interface ClassResponse {
  list?: ClassItem[];
  data?: ClassItem[] | { list?: ClassItem[] };
  total?: number;
  [key: string]: unknown;
}

/* ============================================================
 * 薪酬计算结果（前端用）
 * ============================================================ */
export interface EmployeePerformance {
  staffId: string;
  staffName: string;
  staffPhone: string;
  salesAmount: number;
  classCount: number;
  classAmount: number;
}

export interface PayrollResult {
  staffId: string;
  staffName: string;
  staffPhone: string;
  positionTitle: string;
  salesAmount: number;
  classCount: number;
  classAmount: number;
  hitCommissionRate: number;
  hitCommissionNote?: string;
  baseSalary: number;
  salesCommission: number;
  classCommission: number;
  total: number;
}