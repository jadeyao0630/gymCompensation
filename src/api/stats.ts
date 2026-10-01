import { api } from './client';
import type { StatsRequest, SalesResponse, ClassResponse } from './types';

/* ============================================================
 * 售卡售课
 * ============================================================ */
export async function getMembershipStats(
  payload: StatsRequest
): Promise<SalesResponse> {
  const { data } = await api.post<SalesResponse>(
    '/api/membership_statistics',
    payload
  );
  return data;
}

export async function getSwimmingCoachStats(
  payload: StatsRequest
): Promise<SalesResponse> {
  const { data } = await api.post<SalesResponse>(
    '/api/swimmingCoach_statistics',
    payload
  );
  return data;
}

export async function getPrivateCoachStats(
  payload: StatsRequest
): Promise<SalesResponse> {
  const { data } = await api.post<SalesResponse>(
    '/api/privateCoach_statistics',
    payload
  );
  return data;
}

/* ============================================================
 * 消课
 * ============================================================ */
export async function getSwimmingClassStats(
  payload: StatsRequest
): Promise<ClassResponse> {
  const { data } = await api.post<ClassResponse>(
    '/api/swimming_class_statistics',
    payload
  );
  return data;
}

export async function getCoachClassStats(
  payload: StatsRequest
): Promise<ClassResponse> {
  const { data } = await api.post<ClassResponse>(
    '/api/coach_class_statistic',
    payload
  );
  return data;
}

/* ============================================================
 * 运营团队
 * ============================================================ */
export interface MarketersRequest {
  group_id: string;
  page_no: number;
  page_size: number;
}

export async function getMarketersList(
  payload: MarketersRequest
): Promise<any> {
  const { data } = await api.post('/api/get_marketers_list', payload);
  return data;
}

/* ============================================================
 * ⭐ 销售明细 cardOrderList
 * ============================================================ */
export interface FinancialFlowItem {
  bus_id: string;
  flow_type: string;
  flow_sn: string;
  serv_id: string;
  operate_type: string;
  amount: string;
  pre_payment: string;
  income_amount: string;
  pay_type_amount: string;
  pay_type_id: string;
  ci_id: string;
  card_id: string;
  ci_name: string;
  card_type_id: string;
  id: string;
  serv_type: string;
  deal_time: string;
  user_id: string;
  username: string;
  description: string;
  card_name: string;
  custom_order_sn: string;
  flow_category: string;
  marketers_detail: Array<{
    name: string;
    role: string;
    percent: string;
    amount: string;
  }>;
  pay_detail: Array<{
    pay_type: string;
    amount: string;
    pay_type_id: string;
  }>;
  bus_name: string;
  [key: string]: unknown;
}

export interface FinancialFlowResponse {
  errorcode?: number;
  errormsg?: string;
  data?: {
    count?: number;
    list?: FinancialFlowItem[];
    total_stat?: Array<{ pay_name: string; pay_amount: number }>;
    current_stat?: Array<{ pay_name: string; pay_amount: number }>;
  };
}

export interface CardOrderListParams {
  bus_id: string;
  /** ⭐ 职员 ID */
  sale_id: string;
  /** ⭐ 开始日期 */
  begin_date: string;
  /** ⭐ 结束日期 */
  end_date: string;
  page_no?: number;
  page_size?: number;
}

export async function getCardOrderList(
  params: CardOrderListParams
): Promise<{ list: FinancialFlowItem[]; totalAmount: number }> {
  /* ⭐ 从环境变量读取测试账号（和 usePayroll 里保持一致） */
  const username = import.meta.env.VITE_TEST_USERNAME || '';
  const password = import.meta.env.VITE_TEST_PASSWORD || '';

  const { data } = await api.post<FinancialFlowResponse>(
    '/api/card-order-list',
    {
      bus_id: params.bus_id,
      sale_id: params.sale_id,
      begin_date: params.begin_date,
      end_date: params.end_date,
      page_no: params.page_no ?? 1,
      page_size: params.page_size ?? 1000,
      /* ⭐ 新增：上游登录凭据 */
      username,
      password,
    }
  );

  const list = data?.data?.list || [];
  const stat = data?.data?.total_stat || [];
  const shiShou = stat.find((s) => s.pay_name === '实收');
  const totalAmount = shiShou ? Number(shiShou.pay_amount) : 0;

  return { list, totalAmount };
}

/* ============================================================
 * ⭐ 定金/押金列表
 * ============================================================ */
export interface FrontMoneyItem {
  id: string;
  amount: string;
  status: string;
  description: string;
  create_time: string;
  deal_time: string;
  marketers_id: string;
  marketer_category: string;
  username: string;
  phone: string;
  user_id: string;
  pay_type: string;
  purpose: string;
  refund_time: string;
  edit_time: string;
  marketers_name: string;
  date: string;
  start_refund_date: string;
  bus_id: string;
  bus_name: string;
  pay_type_name: string;
  new_pay_type: Array<{
    front_money_id: string;
    pay_type_name: string;
    amount: string;
    pay_type: string;
    card_user_id: string;
  }>;
}

export interface FrontMoneyResponse {
  errorcode?: number;
  errormsg?: string;
  data?: {
    list?: FrontMoneyItem[];
    count?: number;
    all_told?: number;
    not_start_using?: number;
    start_using?: number;
    drawback?: number;
  };
}

export interface FrontMoneyListParams {
  bus_id: string;
  s_date: string;
  e_date: string;
  page_no?: number;
  page_size?: number;
}

export async function getFrontMoneyList(
  params: FrontMoneyListParams
): Promise<{ list: FrontMoneyItem[]; count: number }> {
  const username = import.meta.env.VITE_TEST_USERNAME || '';
  const password = import.meta.env.VITE_TEST_PASSWORD || '';

  const { data } = await api.post<FrontMoneyResponse>(
    '/api/front-money-list',
    {
      bus_id: params.bus_id,
      s_date: params.s_date,
      e_date: params.e_date,
      page_no: params.page_no ?? 1,
      page_size: params.page_size ?? 1000,
      username,
      password,
    }
  );

  const list = data?.data?.list || [];
  const count = data?.data?.count || 0;
  return { list, count };
}