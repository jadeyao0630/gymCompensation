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
 * ⭐ 运营团队
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