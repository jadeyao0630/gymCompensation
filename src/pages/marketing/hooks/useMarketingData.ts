import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const fetchData = useCallback(
    async (begin: string, end: string) => {
      if (!storeId || !begin || !end) return;
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

        setList(orderRes.list || []);
        setFrontMoneyList(frontMoneyRes.list || []);
      } catch (e: any) {
        console.error('[MarketingReport] 加载失败', e);
        setError(e?.response?.data?.errormsg || e?.message || '加载数据失败');
      } finally {
        setLoading(false);
      }
    },
    [storeId]
  );

  useEffect(() => {
    fetchData(beginDate, endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

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
    fetchData(begin, end);
  };

  const handleDateChange = (b: string, e: string) => {
    setBeginDate(b);
    setEndDate(e);
  };

  const handleRefresh = () => {
    fetchData(beginDate, endDate);
  };

  return {
    beginDate,
    endDate,
    loading,
    error,
    list,
    frontMoneyList,
    fetchData,
    handleQuick,
    handleDateChange,
    handleRefresh,
  };
}