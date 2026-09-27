import { api } from './client';
import type { AnyRecord } from './types';

/* ---------- 切换场馆 ---------- */
export async function cutover(busId: string): Promise<unknown> {
  const { data } = await api.post('/api/cutover', { bus_id: busId });
  return data;
}

/* ---------- 获取教练列表 ---------- */
export interface CoachListRequest {
  bus_id?: string;
  page_no?: number;
  page_size?: number;
}

export interface CoachListResponse {
  data?: AnyRecord[] | { list?: AnyRecord[] };
  list?: AnyRecord[];
  total?: number;
  [key: string]: unknown;
}

/**
 * 获取教练列表
 * 后端会自动先执行切换场馆，再拉数据
 */
export async function getBusCoachList(
  payload: CoachListRequest = {}
): Promise<CoachListResponse> {
  const { data } = await api.post<CoachListResponse>(
    '/api/get_bus_coach_list',
    {
      bus_id: payload.bus_id ?? '12279',
      page_no: payload.page_no ?? 1,
      page_size: payload.page_size ?? 1000,
    }
  );
  return data;
}