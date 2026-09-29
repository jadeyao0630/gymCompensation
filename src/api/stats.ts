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
  const { data } = await api.post<FinancialFlowResponse>(
    '/api/card-order-list',
    {
      bus_id: params.bus_id,
      sale_id: params.sale_id,
      begin_date: params.begin_date,
      end_date: params.end_date,
      page_no: params.page_no ?? 1,
      page_size: params.page_size ?? 1000,
    }
  );

  const list = data?.data?.list || [];
  /* ⭐ 合计取「实收」 */
  const stat = data?.data?.total_stat || [];
  const shiShou = stat.find((s) => s.pay_name === '实收');
  const totalAmount = shiShou ? Number(shiShou.pay_amount) : 0;

  return { list, totalAmount };
}