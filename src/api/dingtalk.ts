/* ============================================================
 * DingTalk API 客户端
 * ============================================================ */

/* ============================================================
 * 类型定义
 * ============================================================ */

export interface DingTalkTemplate {
  name: string;
  processCode: string;
}

export interface DingTalkOperationRecord {
  userId?: string;
  userName?: string;
  type?: string;
  result?: string;
  date?: string | number | null;
  remark?: string;
}

export interface DingTalkApprover {
  userId: string;
  userName: string;
}

/** ⭐ 兼容别名 */
export type DingTalkPendingApprover = DingTalkApprover;

export interface DingTalkReportItem {
  templateName?: string;
  processCode?: string;
  processInstanceId?: string;
  title?: string;
  status?: string;
  result?: string;
  createTime?: string;
  finishTime?: string;
  paymentUnit?: string;
  payeeAccount?: string;
  amount?: string | number | null;
  items?: Array<{ rowNumber?: string; content?: string; amount?: string }>;
  formValues?: Record<string, any>;
  operationRecords?: DingTalkOperationRecord[];
  originatorName?: string;
  pendingApprovers?: DingTalkApprover[];
  error?: string;

  _autoAssigned?: boolean;
  _storeName?: string | null;
  _assignReason?: string;
  _manualStore?: boolean;
  _fromCache?: boolean;
}

export interface DingTalkSyncResult {
  finishedAt: string;
  status: 'success' | 'failed';
  message: string;
}

export interface DingTalkReportMeta {
  source?: string;
  startTime?: number;
  endTime?: number;
  totalTemplates?: number;
  totalCount?: number;
  autoAssignedCount?: number;
  manualAssignedCount?: number;
  fallbackToDefaultCount?: number;
  costMs?: number;
  syncResult?: DingTalkSyncResult;
}

export interface DingTalkReportData extends DingTalkReportMeta {
  results: DingTalkReportItem[];
  totalTemplates: number;
  costMs: number;
}

export interface DingTalkReportResponse {
  errorcode: number;
  errormsg: string;
  data?: DingTalkReportData;
}

export interface DingTalkReportParams {
  start: string;
  end: string;
  templateTypes?: string[];
  paymentUnits?: string[];
  onlyApproved?: boolean;
  sync?: 0 | 1;
}

export interface DingTalkMonthlySummaryData {
  month: string;
  store?: string | null;
  startTime: number;
  endTime: number;
  totalTemplates: number;
  totalCount: number;
  totalAmount: number;
  costMs: number;
  results: DingTalkReportItem[];
}

/* ============================================================
 * 通用请求工具
 * ============================================================ */

async function getJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url);
  return (await res.json()) as T;
}

async function postJSON<T = any>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T;
}

async function deleteJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { method: 'DELETE' });
  return (await res.json()) as T;
}

function buildQuery(params: Record<string, any>): string {
  const sp = new URLSearchParams();
  Object.keys(params).forEach((k) => {
    const v = params[k];
    if (v === undefined || v === null || v === '') return;

    if (Array.isArray(v)) {
      if (v.length === 0) return;
      sp.set(k, v.map((x) => String(x)).join(','));
      return;
    }
    if (typeof v === 'boolean') {
      sp.set(k, v ? '1' : '0');
      return;
    }
    if (typeof v === 'number') {
      sp.set(k, String(v));
      return;
    }
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/* ============================================================
 * 1) 报告接口
 * ============================================================ */
export async function fetchDingTalkReport(
  params: DingTalkReportParams
): Promise<DingTalkReportData> {
  const query = buildQuery({
    start: params.start,
    end: params.end,
    type:
      params.templateTypes && params.templateTypes.length > 0
        ? params.templateTypes.join(',')
        : undefined,
    company:
      params.paymentUnits && params.paymentUnits.length > 0
        ? params.paymentUnits.join(',')
        : undefined,
    onlyApproved: params.onlyApproved ? 1 : undefined,
    sync: params.sync ? 1 : undefined,
  });
  const json = await getJSON<DingTalkReportResponse>(
    `/api/dingtalk/report${query}`
  );
  if (json.errorcode !== 0) throw new Error(json.errormsg || '查询失败');
  return json.data || { results: [], totalTemplates: 0, costMs: 0 };
}

export const fetchReport = fetchDingTalkReport;

/* ============================================================
 * 2) 模板列表 / 刷新
 * ============================================================ */
export async function fetchDingTalkTemplates(): Promise<{
  errorcode: number;
  errormsg: string;
  data?: { count: number; templates: DingTalkTemplate[]; source?: string };
}> {
  return getJSON(`/api/dingtalk/templates`);
}

export async function refreshDingTalkTemplates(): Promise<{
  errorcode: number;
  errormsg: string;
  data?: { count: number; templates: DingTalkTemplate[]; source?: string };
}> {
  return postJSON(`/api/dingtalk/templates/refresh`, {});
}

export const fetchTemplates = fetchDingTalkTemplates;
export const refreshTemplates = refreshDingTalkTemplates;

/* ============================================================
 * 3) 单个模板实例列表
 * ============================================================ */
export async function fetchProcessInstanceIds(params: {
  start: string;
  end: string;
  processCode: string;
}): Promise<{
  errorcode: number;
  errormsg: string;
  data?: {
    processCode: string;
    startTime: number;
    endTime: number;
    count: number;
    instanceIds: string[];
  };
}> {
  const query = buildQuery({
    start: params.start,
    end: params.end,
    processCode: params.processCode,
  });
  return getJSON(`/api/dingtalk/process-list${query}`);
}

/* ============================================================
 * 4) 月综合报告
 * ============================================================ */
export async function fetchMonthlySummary(params: {
  month: string;
  store?: string;
}): Promise<DingTalkMonthlySummaryData> {
  const query = buildQuery({ month: params.month, store: params.store });
  const json = await getJSON<{
    errorcode: number;
    errormsg: string;
    data?: DingTalkMonthlySummaryData;
  }>(`/api/dingtalk/monthly-summary${query}`);

  if (json.errorcode !== 0) {
    throw new Error(json.errormsg || '月综合报告查询失败');
  }

  return (
    json.data || {
      month: params.month,
      store: params.store ?? null,
      startTime: 0,
      endTime: 0,
      totalTemplates: 0,
      totalCount: 0,
      totalAmount: 0,
      costMs: 0,
      results: [],
    }
  );
}

export const fetchDingTalkMonthlySummary = fetchMonthlySummary;

/* ============================================================
 * 5) 门店配置
 * ============================================================ */
export async function fetchStoreConfig(): Promise<{
  errorcode: number;
  errormsg: string;
  data?: { stores: any[] };
}> {
  return getJSON(`/api/dingtalk/store-config`);
}

export async function saveStoreConfig(stores: any[]): Promise<{
  errorcode: number;
  errormsg: string;
  data?: { stores: any[] };
}> {
  return postJSON(`/api/dingtalk/store-config`, { stores });
}

/* ============================================================
 * 6) 手动归属门店
 * ============================================================ */

export async function setManualStore(
  processInstanceId: string,
  storeName: string,
  updatedBy?: string
): Promise<void> {
  const json = await postJSON<{
    errorcode: number;
    errormsg: string;
    data?: { processInstanceId: string; storeName: string };
  }>('/api/dingtalk/manual-store', {
    processInstanceId,
    storeName,
    updatedBy,
  });
  if (json.errorcode !== 0) throw new Error(json.errormsg || '保存手动归属失败');
}

export async function saveManualStore(
  processInstanceId: string,
  storeName: string | null,
  updatedBy?: string
): Promise<void> {
  if (!storeName) return removeManualStore(processInstanceId);
  return setManualStore(processInstanceId, storeName, updatedBy);
}

export async function removeManualStore(
  processInstanceId: string
): Promise<void> {
  const query = buildQuery({ processInstanceId });
  const json = await deleteJSON<{ errorcode: number; errormsg: string }>(
    `/api/dingtalk/manual-store${query}`
  );
  if (json.errorcode !== 0) throw new Error(json.errormsg || '重置手动归属失败');
}

export async function getManualStore(
  processInstanceId: string
): Promise<string | null> {
  const query = buildQuery({ processInstanceId });
  const json = await getJSON<{
    errorcode: number;
    errormsg: string;
    data?: { storeName: string | null };
  }>(`/api/dingtalk/manual-store${query}`);
  if (json.errorcode !== 0) throw new Error(json.errormsg || '获取手动归属失败');
  return json.data?.storeName ?? null;
}

export async function fetchManualStoreMap(
  processInstanceIds: string[]
): Promise<Record<string, string>> {
  if (!processInstanceIds || processInstanceIds.length === 0) return {};
  const query = buildQuery({ processInstanceId: processInstanceIds.join(',') });
  const json = await getJSON<{
    errorcode: number;
    errormsg: string;
    data?: Record<string, string> | { storeName: string | null };
  }>(`/api/dingtalk/manual-store${query}`);
  if (json.errorcode !== 0) {
    throw new Error(json.errormsg || '批量获取手动归属失败');
  }
  const data = json.data;
  if (!data || typeof data !== 'object') return {};

  if ('storeName' in data) {
    const only = (data as { storeName: string | null }).storeName;
    if (!only) return {};
    const out: Record<string, string> = {};
    processInstanceIds.forEach((id) => {
      out[id] = only;
    });
    return out;
  }
  return data as Record<string, string>;
}

export const getManualStoreMap = fetchManualStoreMap;