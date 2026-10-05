import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getCardOrderList,
  getFrontMoneyList,
  type FinancialFlowItem,
  type FrontMoneyItem,
} from '../../../api/stats';
import { useStore } from '../../../contexts/StoreContext';
import { fmtDate, getMonthRange, getLastMonth } from '../utils/aggregate';

export function useMarketingData() {
  const { storeId } = useStore();

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
  const [list, setList] = useState<FinancialFlowItem[]>([]);
  const [frontMoneyList, setFrontMoneyList] = useState<FrontMoneyItem[]>([]);
  /** 是否曾经成功拉过一次（用于区分「首次」和「已加载」） */
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  /** ⭐ 竞态保护：只接受最后一次请求的结果 */
  const reqIdRef = useRef(0);

  const fetchData = useCallback(
    async (begin: string, end: string) => {
      if (!storeId || !begin || !end) return;

      const reqId = ++reqIdRef.current;
      console.log('=== fetchData 开始 ===');
    console.log('参数:', { storeId, begin, end });
    if (!storeId || !begin || !end) {
      console.warn('参数缺失，直接返回');
      return;
    }
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

        /* ⭐ 丢弃过期响应（比如用户快速改了日期又点了一次） */
        if (reqId !== reqIdRef.current) {
          console.log('[fetchData] 竞态丢弃旧结果 reqId=', reqId);
          return;
        }
        console.log('订单结果:', {
        count: orderRes?.list?.length,
        totalAmount: orderRes?.totalAmount,
      });
      console.log('定金结果:', {
        count: frontMoneyRes?.list?.length,
      });
        /* ⭐ 成功后才覆盖，不清空 */
        setList(orderRes.list || []);
        setFrontMoneyList(frontMoneyRes.list || []);
        setHasLoadedOnce(true);
      } catch (e: any) {
        if (reqId !== reqIdRef.current) return;
        console.error('[MarketingReport] 加载失败', e);
        setError(e?.response?.data?.errormsg || e?.message || '加载数据失败');
        /* ⭐ 失败时不清空 list，保留旧数据 */
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    },
    [storeId]
  );

  /* 门店切换：自动拉一次（并重置 hasLoadedOnce） */
  // useEffect(() => {
  //   setHasLoadedOnce(false);
  //   fetchData(beginDate, endDate);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [storeId]);

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
    console.log('=== handleQuick ===', { range, begin, end });
    setBeginDate(begin);
    setEndDate(end);
  };

  /* 日期范围：只改 state，不自动拉 */
  const handleDateChange = (b: string, e: string) => {
    console.log('=== handleDateChange ===', { b, e });
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