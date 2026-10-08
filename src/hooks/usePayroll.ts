import { useCallback, useState } from 'react';
import { login } from '../api/auth';
import {
  getMembershipStats,
  getSwimmingCoachStats,
  getPrivateCoachStats,
  getSwimmingClassStats,
  getCoachClassStats,
  getMarketersList,
  getCardOrderList,
  type FinancialFlowItem,
} from '../api/stats';
import { getBusCoachList } from '../api/coach';
import { extractErrorMessage } from '../api/client';
import type {
  MonthlyCompensationPlan,
  RewardsCatalog,
  DepartmentRewards,
  TempReward,
} from '../types/compensation';
import type { StatsRequest, AnyRecord } from '../api/types';
import {
  mergePerformance,
  calcPayrollForAll,
  normalizeCoachList,
  applyCoachInfo,
  applyManagerPerformance,
  collectMissingPositions,
  collectMissingPositionDetails,
  mergePayDetail,
  type PayrollResult,
  type EmployeePerformance,
  type MergeInput,
  type MissingPositionInfo,
  type PayDetailItem,
} from '../utils/payroll';

function pickArray(res: any): AnyRecord[] {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.list)) return res.list;
  if (Array.isArray(res.data?.list)) return res.data.list;
  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.data?.records)) return res.data.records;
  if (Array.isArray(res.rows)) return res.rows;
  return [];
}

function getMonthRange(month: string): { s_date: string; e_date: string } {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  return { s_date: fmt(first), e_date: fmt(last) };
}

function splitClassByPosition(records: AnyRecord[]): MergeInput[] {
  const buckets: Record<string, AnyRecord[]> = { 私教: [], 会籍: [] };
  records.forEach((r) => {
    const raw = String(
      r.coach_type ?? r.type ?? r.position ?? r.role ?? r.job ?? ''
    );
    if (raw.includes('泳教') || raw.includes('游泳')) return;
    if (raw.includes('私教')) buckets['私教'].push(r);
    else if (raw.includes('会籍')) buckets['会籍'].push(r);
    else buckets['私教'].push(r);
  });
  return Object.entries(buckets)
    .filter(([, arr]) => arr.length > 0)
    .map(([positionTitle, records]) => ({ positionTitle, records }));
}

const MARKETER_POSITION_MAP: Record<string, string> = {
  行政: '保洁',
  保洁: '保洁',
  前台: '前台',
  店长: '店长',
  维修: '维修',
  运营: '运营',
  运营主管: '运营主管',
};

function normalizeMarketerTitle(title: string): string {
  const t = (title || '').trim();
  return MARKETER_POSITION_MAP[t] || t;
}

function buildPayDetailMap(
  flowList: FinancialFlowItem[]
): Map<string, PayDetailItem[]> {
  const map = new Map<string, PayDetailItem[]>();
  flowList.forEach((flow) => {
    const name = String(flow.username ?? '').trim();
    if (!name) return;
    const rawPayDetail = Array.isArray(flow.pay_detail) ? flow.pay_detail : [];
    if (rawPayDetail.length === 0) return;
    const items: PayDetailItem[] = rawPayDetail
      .map((p) => ({
        pay_type: String(p.pay_type ?? '').trim(),
        amount: String(p.amount ?? '0'),
        pay_type_id: String(p.pay_type_id ?? ''),
      }))
      .filter((p) => p.pay_type);
    if (items.length === 0) return;
    const existing = map.get(name);
    map.set(name, existing ? mergePayDetail(existing, items) : items);
  });
  return map;
}

export interface RunResult {
  results: PayrollResult[];
  performances: EmployeePerformance[];
  missingPositions: string[];
  missingDetails: MissingPositionInfo[];
}

interface UsePayrollParams {
  username: string;
  password: string;
  busId: string;
}

export interface RunPayrollOptions {
  rewardsCatalog?: RewardsCatalog;
  departmentRewards?: DepartmentRewards;
  tempRewardsByStaff?: Record<string, TempReward[]>;
}

export function usePayroll({ username, password, busId }: UsePayrollParams) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<PayrollResult[]>([]);

  const reset = useCallback(() => {
    setLoading(false);
    setError('');
    setResults([]);
  }, []);

  const run = useCallback(
    async (
      month: string,
      plan: MonthlyCompensationPlan,
      overrides?: Record<string, string>,
      opsViewEnabled = true,
      newbieIds: Set<string> = new Set(),
      options?: RunPayrollOptions
    ): Promise<RunResult> => {
      console.log('[usePayroll] === 开始 ===');
      setLoading(true);
      setError('');
      setResults([]);

      try {
        await login({ username, password });

        let coaches: ReturnType<typeof normalizeCoachList> = [];
        try {
          const coachRes = await getBusCoachList({
            bus_id: busId,
            page_no: 1,
            page_size: 1000,
          });
          coaches = normalizeCoachList(pickArray(coachRes));
        } catch (coachErr) {
          console.error('[usePayroll] 拉取教练列表失败:', coachErr);
        }

        let marketers: AnyRecord[] = [];
        try {
          const marketerRes = await getMarketersList({
            group_id: '23560',
            page_no: 1,
            page_size: 1000,
          });
          marketers = pickArray(marketerRes);
        } catch (mkErr) {
          console.error('[usePayroll] 拉取运营团队失败:', mkErr);
        }

        const seenMarketerIds = new Set<string>();
        const seenMarketerNP = new Set<string>();
        const uniqueMarketers: AnyRecord[] = [];
        marketers.forEach((m) => {
          const id = String(m.id ?? '').trim();
          const name = String(m.name ?? '').trim();
          const phone = String(m.phone ?? '').trim();
          const np = `${name}__${phone}`;
          if (!id || id === '0') return;
          if (seenMarketerIds.has(id)) return;
          if (np && seenMarketerNP.has(np)) return;
          seenMarketerIds.add(id);
          if (np) seenMarketerNP.add(np);
          uniqueMarketers.push(m);
        });

        const { s_date, e_date } = getMonthRange(month);
        const payload: StatsRequest = {
          bus_id: busId,
          s_date,
          e_date,
          page_no: 1,
          page_size: 1000,
        };

        const [
          membership,
          swimmingCoach,
          privateCoach,
          swimClass,
          coachClass,
          cardOrderRes,
        ] = await Promise.all([
          getMembershipStats(payload),
          getSwimmingCoachStats(payload),
          getPrivateCoachStats(payload),
          getSwimmingClassStats(payload),
          getCoachClassStats(payload),
          getCardOrderList({
            bus_id: busId,
            sale_id: '',
            begin_date: s_date,
            end_date: e_date,
            page_no: 1,
            page_size: 1000,
          }).catch(() => ({ list: [], totalAmount: 0 })),
        ]);

        const membershipList = pickArray(membership);
        const swimmingCoachList = pickArray(swimmingCoach);
        const privateCoachList = pickArray(privateCoach);
        const swimClassList = pickArray(swimClass);
        const coachClassList = pickArray(coachClass);

        const payDetailMap = buildPayDetailMap(cardOrderRes.list);

        const salesGroups: MergeInput[] = [
          { positionTitle: '会籍', records: membershipList },
          { positionTitle: '泳教', records: swimmingCoachList },
          { positionTitle: '私教', records: privateCoachList },
        ];
        const classGroups: MergeInput[] = [
          { positionTitle: '泳教', records: swimClassList },
          ...splitClassByPosition(coachClassList),
        ];

        let performances = mergePerformance(salesGroups, classGroups);

        performances = performances.map((p) => {
          const name = (p.staffName || '').trim();
          if (!name) return p;
          const pd = payDetailMap.get(name);
          if (!pd || pd.length === 0) return p;
          return { ...p, payDetail: pd };
        });

        if (overrides && Object.keys(overrides).length > 0) {
          performances = performances.map((p) => {
            const overrideTitle = overrides[p.staffId];
            return overrideTitle ? { ...p, positionTitle: overrideTitle } : p;
          });
        }

        if (coaches.length > 0) {
          performances = applyCoachInfo(performances, coaches);
        }

        const perfIndex = new Map<string, number>();
        performances.forEach((p, i) => perfIndex.set(p.staffId, i));

        uniqueMarketers.forEach((m) => {
          const id = String(m.id ?? '').trim();
          const name = String(m.name ?? '').trim();
          const phone = String(m.phone ?? '').trim();
          const makType = String(m.mak_type_name ?? '').trim();
          const groupName = String(m.group_name ?? '').trim();

          if (!id || id === '0') return;
          if (makType === '会籍' || groupName === '会籍') return;
          if (overrides && overrides[id]) return;

          const rawType = makType || groupName || '运营';
          const positionTitle = normalizeMarketerTitle(rawType);
          const existingIdx = perfIndex.get(id);

          if (existingIdx !== undefined) {
            const prev = performances[existingIdx];
            if (prev.positionTitle !== positionTitle) {
              performances[existingIdx] = {
                ...prev,
                positionTitle,
                staffName: prev.staffName || name,
                staffPhone: prev.staffPhone || phone,
              };
            }
            return;
          }

          performances.push({
            staffId: id,
            staffName: name,
            staffPhone: phone,
            positionTitle,
            gender: 'male',
            salesAmount: 0,
            classCount: 0,
            classAmount: 0,
            classByCourse: {},
            classMemberDetail: [],
            payDetail: payDetailMap.get(name) || [],
          });
          perfIndex.set(id, performances.length - 1);
        });

        const configuredTitles = new Set(plan.positions.map((p) => p.title));
        for (const coach of coaches) {
          if (!coach.id) continue;
          if (perfIndex.has(coach.id)) continue;
          const title = coach.positionTitle || '';
          if (!title) continue;
          if (!configuredTitles.has(title)) continue;
          const name =
            String(
              coach.raw?.name ??
                coach.raw?.staff_name ??
                coach.raw?.coach_name ??
                ''
            ).trim() || '';
          performances.push({
            staffId: coach.id,
            staffName: name,
            staffPhone: coach.phone || '',
            positionTitle: title,
            gender: 'male',
            salesAmount: 0,
            classCount: 0,
            classAmount: 0,
            classByCourse: {},
            classMemberDetail: [],
            payDetail: payDetailMap.get(name) || [],
          });
          perfIndex.set(coach.id, performances.length - 1);
        }

        const perfMap = new Map<string, EmployeePerformance>();
        const nameTitleIndex = new Map<string, string>();
        performances.forEach((p) => {
          const idKey = String(p.staffId ?? '').trim();
          const nameTitleKey = `${(p.staffName || '').trim()}__${(
            p.positionTitle || ''
          ).trim()}`;
          if (idKey && perfMap.has(idKey)) {
            const cur = perfMap.get(idKey)!;
            if (!cur.staffPhone && p.staffPhone) cur.staffPhone = p.staffPhone;
            if (!cur.staffName && p.staffName) cur.staffName = p.staffName;
            if (p.payDetail && p.payDetail.length > 0) {
              cur.payDetail = mergePayDetail(cur.payDetail, p.payDetail);
            }
            return;
          }
          if (nameTitleKey && nameTitleIndex.has(nameTitleKey)) {
            const mainKey = nameTitleIndex.get(nameTitleKey)!;
            const cur = perfMap.get(mainKey);
            if (cur) {
              if (!cur.staffPhone && p.staffPhone) cur.staffPhone = p.staffPhone;
              if (!cur.staffName && p.staffName) cur.staffName = p.staffName;
              if (p.payDetail && p.payDetail.length > 0) {
                cur.payDetail = mergePayDetail(cur.payDetail, p.payDetail);
              }
            }
            return;
          }
          const newKey = idKey || nameTitleKey || `__${perfMap.size}`;
          perfMap.set(newKey, { ...p });
          if (nameTitleKey) nameTitleIndex.set(nameTitleKey, newKey);
        });
        performances = Array.from(perfMap.values());

        if (overrides && Object.keys(overrides).length > 0) {
          performances = performances.map((p) => {
            const overrideTitle = overrides[p.staffId];
            return overrideTitle ? { ...p, positionTitle: overrideTitle } : p;
          });
        }

        performances = applyManagerPerformance(performances, plan.positions);

        const storePerf = performances.find(
          (p) =>
            p.positionTitle === '店长' || p.positionTitle.includes('门店经理')
        );
        const storeSales = storePerf?.salesAmount ?? 0;
        performances = performances.map((p) =>
          p.positionTitle === '运营主管'
            ? { ...p, managerSalesBase: storeSales }
            : p
        );

        const missingPositions = collectMissingPositions(
          performances,
          plan.positions
        );
        const missingDetails = collectMissingPositionDetails(
          performances,
          plan.positions
        );

        const payroll = calcPayrollForAll(plan, performances, {
          opsViewEnabled,
          newbieIds,
          rewardsCatalog: options?.rewardsCatalog ?? [],
          departmentRewards:
            options?.departmentRewards ?? plan.departmentRewards,
          tempRewardsByStaff:
            options?.tempRewardsByStaff ?? plan.tempRewards,
        });
        setResults(payroll);

        return {
          results: payroll,
          performances,
          missingPositions,
          missingDetails,
        };
      } catch (err) {
        console.error('[usePayroll] 出错:', err);
        const msg = extractErrorMessage(err);
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [username, password, busId]
  );

  return { loading, error, results, run, reset };
}