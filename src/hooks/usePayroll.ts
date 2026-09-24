import { useCallback, useState } from 'react';
import { login } from '../api/auth';
import {
  getMembershipStats,
  getSwimmingCoachStats,
  getPrivateCoachStats,
  getSwimmingClassStats,
  getCoachClassStats,
} from '../api/stats';
import { extractErrorMessage } from '../api/client';
import type { MonthlyCompensationPlan } from '../types/compensation';
import type { StatsRequest, AnyRecord } from '../api/types';
import {
  mergePerformance,
  calcPayrollForAll,
  type PayrollResult,
  type MergeInput,
} from '../utils/payroll';

const BUS_ID = '12279';

/* ============================================================
 * 安全取数组：兼容 data / data.list / list / rows
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

/* ============================================================
 * yyyy-MM → { s_date, e_date }
 * ============================================================ */
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

interface UsePayrollParams {
  username: string;
  password: string;
}

export function usePayroll({ username, password }: UsePayrollParams) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<PayrollResult[]>([]);

  const run = useCallback(
    async (month: string, plan: MonthlyCompensationPlan) => {
      console.log('[usePayroll] === 开始 ===');
      console.log('[usePayroll] month:', month);
      console.log('[usePayroll] plan.positions:', plan.positions.length);
      console.log('[usePayroll] username:', username || '空');
      console.log('[usePayroll] password:', password ? '已配置' : '空');

      setLoading(true);
      setError('');
      setResults([]);

      try {
        /* 1) 登录 */
        console.log('[usePayroll] 登录中...');
        const loginRes = await login({ username, password });
        console.log('[usePayroll] 登录响应:', loginRes);

        /* 2) 参数 */
        const { s_date, e_date } = getMonthRange(month);
        const payload: StatsRequest = {
          bus_id: BUS_ID,
          s_date,
          e_date,
          page_no: 1,
          page_size: 1000,
        };
        console.log('[usePayroll] 请求参数:', payload);

        /* 3) 并行拉 5 个接口 */
        console.log('[usePayroll] 拉取数据中...');
        const [membership, swimmingCoach, privateCoach, swimClass, coachClass] =
          await Promise.all([
            getMembershipStats(payload),     // 会籍销售
            getSwimmingCoachStats(payload),  // 泳教销售
            getPrivateCoachStats(payload),   // 私教销售
            getSwimmingClassStats(payload),  // 游泳课消课
            getCoachClassStats(payload),     // 教练课消课
          ]);

        console.log('[usePayroll] membership 原始:', membership);
        console.log('[usePayroll] swimmingCoach 原始:', swimmingCoach);
        console.log('[usePayroll] privateCoach 原始:', privateCoach);
        console.log('[usePayroll] swimClass 原始:', swimClass);
        console.log('[usePayroll] coachClass 原始:', coachClass);

        /* 4) 按接口来源绑定职位 */
        const membershipList = pickArray(membership);
        const swimmingCoachList = pickArray(swimmingCoach);
        const privateCoachList = pickArray(privateCoach);
        const swimClassList = pickArray(swimClass);
        const coachClassList = pickArray(coachClass);

        console.log('[usePayroll] 会籍销售条数:', membershipList.length);
        console.log('[usePayroll] 泳教销售条数:', swimmingCoachList.length);
        console.log('[usePayroll] 私教销售条数:', privateCoachList.length);
        console.log('[usePayroll] 游泳消课条数:', swimClassList.length);
        console.log('[usePayroll] 教练消课条数:', coachClassList.length);

        console.log('[usePayroll] 会籍销售示例:', membershipList[0]);
        console.log('[usePayroll] 泳教销售示例:', swimmingCoachList[0]);
        console.log('[usePayroll] 私教销售示例:', privateCoachList[0]);
        console.log('[usePayroll] 游泳消课示例:', swimClassList[0]);
        console.log('[usePayroll] 教练消课示例:', coachClassList[0]);

        /* 5) 构造分组（接口 → 职位） */
        const salesGroups: MergeInput[] = [
          { positionTitle: '会籍', records: membershipList },
          { positionTitle: '泳教', records: swimmingCoachList },
          { positionTitle: '私教', records: privateCoachList },
        ];

        const classGroups: MergeInput[] = [
          // 游泳课消课 → 泳教
          { positionTitle: '泳教', records: swimClassList },
          // 教练课消课 → 私教（如实际包含会籍/泳教，后续再细分）
          { positionTitle: '私教', records: coachClassList },
        ];

        /* 6) 合并业绩 */
        const performances = mergePerformance(salesGroups, classGroups);
        console.log('[usePayroll] performances:', performances);

        /* 7) 计算工资 */
        const payroll = calcPayrollForAll(plan, performances);
        console.log('[usePayroll] 最终结果:', payroll);

        setResults(payroll);
        return payroll;
      } catch (err) {
        console.error('[usePayroll] 出错:', err);
        const msg = extractErrorMessage(err);
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
        console.log('[usePayroll] === 结束 ===');
      }
    },
    [username, password]
  );

  return { loading, error, results, run };
}