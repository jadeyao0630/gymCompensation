import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getCardOrderList,
  getFrontMoneyList,
  type FinancialFlowItem,
  type FrontMoneyItem,
} from '../../../api/stats';
import { useStore } from '../../../contexts/StoreContext';
import { useAppData } from '../../../contexts/AppDataContext';
import { fmtDate, getMonthRange, getLastMonth } from '../utils/aggregate';

export function useMarketingData() {
  const { storeId } = useStore();
  const { data: appData, update: updateAppData } = useAppData();

  const initialRange = useMemo(() => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { begin, end } = getMonthRange(month);
    return { begin, end };
  }, []);

  const [beginDate, setBeginDate] = useState(initialRange.begin);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ⭐ hasLoadedOnce 按门店隔离：切到没拉过的门店时回到「未获取」 */
  const [loadedStores, setLoadedStores] = useState<Record<string, boolean>>({});
  const hasLoadedOnce = !!loadedStores[storeId];

  /* ⭐ 从全局 store 取数据（页面切换不丢） */
  const list = appData.marketingListByStore[storeId] || [];
  const frontMoneyList = appData.marketingFrontMoneyByStore[storeId] || [];

  /* ⭐ 便捷 setter（写入全局 store） */
  const setList = useCallback(
    (updater: React.SetStateAction<FinancialFlowItem[]>) => {
      updateAppData('marketingListByStore', (prev) => {
        const cur = prev[storeId] || [];
        const next =
          typeof updater === 'function'
            ? (updater as any)(cur)
            : updater;
        return { ...prev, [storeId]: next };
      });
    },
    [updateAppData, storeId]
  );

  const setFrontMoneyList = useCallback(
    (updater: React.SetStateAction<FrontMoneyItem[]>) => {
      updateAppData('marketingFrontMoneyByStore', (prev) => {
        const cur = prev[storeId] || [];
        const next =
          typeof updater === 'function'
            ? (updater as any)(cur)
            : updater;
        return { ...prev, [storeId]: next };
      });
    },
    [updateAppData, storeId]
  );

  /* ⭐ 竞态保护：只接受最后一次请求的结果 */
  const reqIdRef = useRef(0);

  const fetchData = useCallback(
    async (begin: string, end: string) => {
      if (!storeId || !begin || !end) return;

      const reqId = ++reqIdRef.current;
      setLoading(true);
      setError('');

      try {
        const [orderRes, frontMoneyRes] = await Promise.all([
          getCardOrderList({
            bus_id: storeId,
            sale_id: '',
            begin_date: begin,
            end_date: end,
            page_no: 1,
            page_size: 2000,
          }).catch((e) => {
            console.warn('[MarketingReport] 拉订单失败', e);
            return { list: [], totalAmount: 0 };
          }),
          getFrontMoneyList({
            bus_id: storeId,
            s_date: begin,
            e_date: end,
            page_no: 1,
            page_size: 1000,
          }).catch((e) => {
            console.warn('[MarketingReport] 拉定金失败', e);
            return { list: [], count: 0 };
          }),
        ]);

        if (reqId !== reqIdRef.current) {
          console.log('[fetchData] 竞态丢弃旧结果 reqId=', reqId);
          return;
        }

        setList(orderRes.list || []);
        setFrontMoneyList(frontMoneyRes.list || []);
        setLoadedStores((prev) => ({ ...prev, [storeId]: true }));
      } catch (e: any) {
        if (reqId !== reqIdRef.current) return;
        console.error('[MarketingReport] 加载失败', e);
        setError(
          e?.response?.data?.errormsg || e?.message || '加载数据失败'
        );
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    },
    [storeId, setList, setFrontMoneyList]
  );

  /* ⭐ 门店切换：只重置状态，不自动拉数据 */
  useEffect(() => {
    setError('');
    setLoading(false);
    // 不改 beginDate/endDate（保留上次范围），也不 fetch
    // 如需切门店时重置为本月范围，可放开下面两行：
    // setBeginDate(initialRange.begin);
    // setEndDate(initialRange.end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  /* 快捷：只改 state，不自动拉 */
  const handleQuick = (range: string) => {
    const now = new Date();
    let begin = '';
    let end = fmtDate(now);

    switch (range) {
      case 'today':
        begin = fmtDate(now);
        break;
      case 'week': {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        begin = fmtDate(d);
        break;
      }
      case 'month': {
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const r = getMonthRange(month);
        begin = r.begin;
        end = r.end;
        break;
      }
      case 'lastMonth': {
        const r = getMonthRange(getLastMonth());
        begin = r.begin;
        end = r.end;
        break;
      }
      case 'quarter': {
        const d = new Date(now);
        d.setMonth(d.getMonth() - 2);
        d.setDate(1);
        begin = fmtDate(d);
        break;
      }
    }

    setBeginDate(begin);
    setEndDate(end);
  };

  /* 日期范围：只改 state，不自动拉 */
  const handleDateChange = (b: string, e: string) => {
    setBeginDate(b);
    setEndDate(e);
  };

  /* 手动刷新：闭包拿最新日期 */
  const handleRefresh = useCallback(() => {
    fetchData(beginDate, endDate);
  }, [fetchData, beginDate, endDate]);

  return {
    beginDate,
    endDate,
    loading,
    error,
    list,
    frontMoneyList,
    hasLoadedOnce,
    fetchData,
    handleQuick,
    handleDateChange,
    handleRefresh,
  };
}