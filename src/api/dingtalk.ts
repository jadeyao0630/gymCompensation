import { api } from './client';

export interface DingTalkTemplate {
  name: string;
  processCode: string;
  iconUrl?: string;
  url?: string;
}

export interface DingTalkOperationRecord {
  userId: string;
  userName?: string;
  type: string;
  result: string;
  date: number | null;
  remark: string;
}

/** ⭐ 当前待办人 */
export interface DingTalkPendingApprover {
  userId: string;
  userName: string;
}

export interface DingTalkReportItem {
  templateName: string;
  processCode: string;
  processInstanceId: string;
  title: string;
  status: string;
  result: string;
  createTime: string;
  finishTime?: string;
  paymentUnit: string | null;
  payeeAccount: string | null;
  amount: string | null;
  items: Array<{ rowNumber: string; content: string; amount: string }>;
  formValues: Record<string, any>;
  operationRecords?: DingTalkOperationRecord[];
  originatorName?: string;
  pendingApprovers?: DingTalkPendingApprover[];
  error?: string;
}

export interface DingTalkReportResponse {
  errorcode: number;
  errormsg: string;
  data: {
    startTime: number;
    endTime: number;
    filter: {
      type: string | null;
      company: string | null;
      excludeTemplates: string[];
      onlyApproved: boolean;
    };
    totalTemplates: number;
    beforeFilterCount: number;
    totalCount: number;
    costMs: number;
    results: DingTalkReportItem[];
  };
}

export async function fetchDingTalkTemplates(): Promise<DingTalkTemplate[]> {
  const { data } = await api.get('/api/dingtalk/templates');
  return data?.data?.templates || [];
}

export async function refreshDingTalkTemplates(): Promise<DingTalkTemplate[]> {
  const { data } = await api.post('/api/dingtalk/templates/refresh');
  return data?.data?.templates || [];
}

export interface FetchReportParams {
  start: string;
  end: string;
  type?: string;
  company?: string;
  onlyApproved?: boolean;
}

export async function fetchDingTalkReport(
  params: FetchReportParams
): Promise<DingTalkReportResponse['data']> {
  const { data } = await api.get<DingTalkReportResponse>(
    '/api/dingtalk/report',
    {
      params: {
        start: params.start,
        end: params.end,
        type: params.type || undefined,
        company: params.company || undefined,
        onlyApproved: params.onlyApproved === false ? '0' : undefined,
      },
    }
  );
  return data.data;
}