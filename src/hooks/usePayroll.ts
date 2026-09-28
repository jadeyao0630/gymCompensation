import { useCallback, useState } from 'react';
import { login } from '../api/auth';
import {
  getMembershipStats,
  getSwimmingCoachStats,
  getPrivateCoachStats,
  getSwimmingClassStats,
  getCoachClassStats,
  getMarketersList,
} from '../api/stats';
import { getBusCoachList } from '../api/coach';
import { extractErrorMessage } from '../api/client';
import type { MonthlyCompensationPlan } from '../types/compensation';
import type { StatsRequest, AnyRecord } from '../api/types';
import {
  mergePerformance,
  calcPayrollForAll,
  normalizeCoachList,
  applyCoachInfo,
  applyManagerPerformance,
  collectMissingPositions,
  collectMissingPositionDetails,
  type PayrollResult,
  type EmployeePerformance,
  type MergeInput,
  type MissingPositionInfo,
} from '../utils/payroll';

/* ============================================================
 * 工具
 * ============================================================ */
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

/* ============================================================
 * 运营团队职位名映射
 * ============================================================ */
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

/* ============================================================
 * 类型
 * ============================================================ */
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

/* ============================================================
 * Hook
 * ============================================================ */
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
      opsViewEnabled = true
    ): Promise<RunResult> => {
      console.log('[usePayroll] === 开始 ===');
      console.log('[usePayroll] busId:', busId, 'month:', month, 'opsViewEnabled:', opsViewEnabled);
      setLoading(true);
      setError('');
      setResults([]);

      try {
        await login({ username, password });

        /* 1) 教练列表 */
        let coaches: ReturnType<typeof normalizeCoachList> = [];
        try {
          const coachRes = await getBusCoachList({
            bus_id: busId,
            page_no: 1,
            page_size: 1000,
          });
          coaches = normalizeCoachList(pickArray(coachRes));
          console.log('[usePayroll] 教练列表条数:', coaches.length);
        } catch (coachErr) {
          console.error('[usePayroll] 拉取教练列表失败:', coachErr);
        }

        /* 2) 运营团队 */
        let marketers: AnyRecord[] = [];
        try {
          const marketerRes = await getMarketersList({
            group_id: '23560',
            page_no: 1,
            page_size: 1000,
          });
          marketers = pickArray(marketerRes);
          console.log('[usePayroll] 运营团队条数（原始）:', marketers.length);
        } catch (mkErr) {
          console.error('[usePayroll] 拉取运营团队失败:', mkErr);
        }

        /* 2.5) marketers 双重去重 */
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
        console.log('[usePayroll] 运营团队去重后条数:', uniqueMarketers.length);

        /* 3) 参数 */
        const { s_date, e_date } = getMonthRange(month);
        const payload: StatsRequest = {
          bus_id: busId,
          s_date,
          e_date,
          page_no: 1,
          page_size: 1000,
        };

        /* 4) 5 个接口 */
        const [membership, swimmingCoach, privateCoach, swimClass, coachClass] =
          await Promise.all([
            getMembershipStats(payload),
            getSwimmingCoachStats(payload),
            getPrivateCoachStats(payload),
            getSwimmingClassStats(payload),
            getCoachClassStats(payload),
          ]);

        const membershipList = pickArray(membership);
        const swimmingCoachList = pickArray(swimmingCoach);
        const privateCoachList = pickArray(privateCoach);
        const swimClassList = pickArray(swimClass);
        const coachClassList = pickArray(coachClass);

        /* 5) 分组 */
        const salesGroups: MergeInput[] = [
          { positionTitle: '会籍', records: membershipList },
          { positionTitle: '泳教', records: swimmingCoachList },
          { positionTitle: '私教', records: privateCoachList },
        ];
        const classGroups: MergeInput[] = [
          { positionTitle: '泳教', records: swimClassList },
          ...splitClassByPosition(coachClassList),
        ];

        /* 6) 合并 */
        let performances = mergePerformance(salesGroups, classGroups);

        /* 6.5) 应用职位覆盖 */
        if (overrides && Object.keys(overrides).length > 0) {
          let appliedCount = 0;
          performances = performances.map((p) => {
            const overrideTitle = overrides[p.staffId];
            if (overrideTitle) {
              appliedCount++;
              return { ...p, positionTitle: overrideTitle };
            }
            return p;
          });
          console.log('[usePayroll] 应用职位覆盖:', appliedCount, '条');
        }

        /* 7) 应用教练信息 */
        if (coaches.length > 0) {
          performances = applyCoachInfo(performances, coaches);
        }

        /* 8) 合并运营团队 */
        const perfIndex = new Map<string, number>();
        performances.forEach((p, i) => perfIndex.set(p.staffId, i));

        let mkAddedCount = 0;
        let mkUpdatedCount = 0;
        let mkSkippedByOverride = 0;

        uniqueMarketers.forEach((m) => {
          const id = String(m.id ?? '').trim();
          const name = String(m.name ?? '').trim();
          const phone = String(m.phone ?? '').trim();
          const makType = String(m.mak_type_name ?? '').trim();
          const groupName = String(m.group_name ?? '').trim();

          if (!id || id === '0') return;
          if (makType === '会籍' || groupName === '会籍') return;

          if (overrides && overrides[id]) {
            mkSkippedByOverride++;
            return;
          }

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
              mkUpdatedCount++;
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
          });
          perfIndex.set(id, performances.length - 1);
          mkAddedCount++;
        });

        console.log(
          '[usePayroll] 合并运营团队 → 新增:',
          mkAddedCount,
          '覆盖职位:',
          mkUpdatedCount,
          '因覆盖跳过:',
          mkSkippedByOverride
        );

        /* 9) 补全教练列表里但没业绩的员工 */
        const configuredTitles = new Set(plan.positions.map((p) => p.title));
        let addedCount = 0;

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
          });
          perfIndex.set(coach.id, performances.length - 1);
          addedCount++;
        }
        console.log('[usePayroll] 补全无业绩员工:', addedCount);

        /* 9.5) performances 去重 */
        const perfMap = new Map<string, EmployeePerformance>();
        const nameTitleIndex = new Map<string, string>();

        let dupSkipped = 0;

        performances.forEach((p) => {
          const idKey = String(p.staffId ?? '').trim();
          const nameTitleKey = `${(p.staffName || '').trim()}__${(p.positionTitle || '').trim()}`;

          if (idKey && perfMap.has(idKey)) {
            const cur = perfMap.get(idKey)!;
            if (!cur.staffPhone && p.staffPhone) cur.staffPhone = p.staffPhone;
            if (!cur.staffName && p.staffName) cur.staffName = p.staffName;
            dupSkipped++;
            return;
          }

          if (nameTitleKey && nameTitleIndex.has(nameTitleKey)) {
            const mainKey = nameTitleIndex.get(nameTitleKey)!;
            const cur = perfMap.get(mainKey);
            if (cur) {
              if (!cur.staffPhone && p.staffPhone) cur.staffPhone = p.staffPhone;
              if (!cur.staffName && p.staffName) cur.staffName = p.staffName;
            }
            dupSkipped++;
            return;
          }

          const newKey = idKey || nameTitleKey || `__${perfMap.size}`;
          perfMap.set(newKey, { ...p });
          if (nameTitleKey) nameTitleIndex.set(nameTitleKey, newKey);
        });

        performances = Array.from(perfMap.values());
        console.log(
          '[usePayroll] performances 去重后条数:',
          performances.length,
          '跳过重复:',
          dupSkipped
        );

        /* 9.6) 去重后再应用一次覆盖 */
        if (overrides && Object.keys(overrides).length > 0) {
          performances = performances.map((p) => {
            const overrideTitle = overrides[p.staffId];
            return overrideTitle ? { ...p, positionTitle: overrideTitle } : p;
          });
        }

        /* 10) 经理 / 店长 业绩汇总 */
        performances = applyManagerPerformance(performances, plan.positions);

        /* 10.5) 计算店长销售 → 写入运营主管 */
        const storePerf = performances.find(
          (p) => p.positionTitle === '店长' || p.positionTitle.includes('门店经理')
        );
        const storeSales = storePerf?.salesAmount ?? 0;
        console.log('[usePayroll] 店长销售金额（用于运营主管佣金）:', storeSales);

        performances = performances.map((p) =>
          p.positionTitle === '运营主管'
            ? { ...p, managerSalesBase: storeSales }
            : p
        );

        /* 11) 缺失职位 */
        const missingPositions = collectMissingPositions(
          performances,
          plan.positions
        );
        const missingDetails = collectMissingPositionDetails(
          performances,
          plan.positions
        );

        /* 12) 计算（⭐ 传入 opsViewEnabled） */
        const payroll = calcPayrollForAll(plan, performances, opsViewEnabled);
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