/* ============================================================
 * ⭐ 门店配置相关（运行时从 storeConfig 读取）
 * ============================================================ */
import {
  matchStoreByPaymentUnit,
  matchStoreByText,
  matchStoreByItem,
} from '../../../utils/storeConfig';

/* ============================================================
 * 付款单位 → 门店（保留常量，供静态展示用）
 * ============================================================ */
export const PAYMENT_UNIT_TO_STORE: Record<string, string> = {
  '北京林朗悦动体育管理有限公司': '哈德门',
  '北京林朗体育管理有限公司': '哈德门',
  '北京林朗韵动体育管理有限公司': '富贵园',
  '北京林朗体育管理有限公司东花市大街分公司': '富贵园',
};

export const PAYMENT_UNITS = Object.keys(PAYMENT_UNIT_TO_STORE);

/** ⭐ 付款单位 → 门店（走运行时配置） */
export function getStoreFromPaymentUnit(
  paymentUnit: string | null | undefined
): string {
  return matchStoreByPaymentUnit(paymentUnit);
}

/** ⭐ 文本 → 门店（走运行时配置） */
export function inferStoreFromText(text: string | null | undefined): string {
  return matchStoreByText(text);
}

/** ⭐ 综合推断一条钉钉记录的门店 */
export function getStoreFromItem(item: any): string {
  return matchStoreByItem(item);
}

/* ============================================================
 * 模板分类
 * ============================================================ */
export type TemplateCategory =
  | '假勤管理'
  | '智能财务'
  | '法务管理'
  | '业务管理'
  | '其他';

export const TEMPLATE_CATEGORY_ORDER: TemplateCategory[] = [
  '假勤管理',
  '智能财务',
  '法务管理',
  '业务管理',
  '其他',
];

export const TEMPLATE_NAME_TO_CATEGORY: Record<string, TemplateCategory> = {
  '出差申请': '假勤管理',
  '请假单': '假勤管理',

  '付款申请单': '智能财务',
  '员工借款（备用金）': '智能财务',
  '员工费用报销': '智能财务',
  '差旅报销申请': '智能财务',
  '会员退费': '智能财务',
  '资产调拨申请表': '智能财务',
  '资产报废申请表': '智能财务',
  '资产购置申请表': '智能财务',

  '印章、证照、档案 使用申请': '法务管理',
  '合同用印': '法务管理',

  '请示': '业务管理',
  '会签单': '业务管理',

  '访客登记': '其他',
  '供应商合同': '其他',
  '通知供应商发货单': '其他',
  '采购单': '其他',
  '客户工单': '其他',
  '客户收货确认单': '其他',
  '客户合同': '其他',
  '轻量审批-权限申请': '其他',
};

export function getTemplateCategory(templateName: string): TemplateCategory {
  if (!templateName) return '其他';

  if (TEMPLATE_NAME_TO_CATEGORY[templateName]) {
    return TEMPLATE_NAME_TO_CATEGORY[templateName];
  }

  const name = templateName;

  if (
    name.includes('请假') ||
    name.includes('出差') ||
    name.includes('加班') ||
    name.includes('外出') ||
    name.includes('调休') ||
    name.includes('考勤')
  ) {
    return '假勤管理';
  }

  if (
    name.includes('付款') ||
    name.includes('借款') ||
    name.includes('备用金') ||
    name.includes('报销') ||
    name.includes('退费') ||
    name.includes('退款') ||
    name.includes('资产') ||
    name.includes('银行账户') ||
    name.includes('费用') ||
    name.includes('底薪、佣金支付申请')
  ) {
    return '智能财务';
  }

  if (
    name.includes('印章') ||
    name.includes('证照') ||
    name.includes('档案') ||
    name.includes('合同用印') ||
    name.includes('法务')
  ) {
    return '法务管理';
  }

  if (name.includes('请示') || name.includes('会签') || name.includes('审批')) {
    return '业务管理';
  }

  return '其他';
}

/* ============================================================
 * ⭐ 列定义（已补齐 GroupedResults 用到的所有 key）
 * ============================================================ */
export type ColumnKey =
  | 'title'
  | 'templateName'
  | 'items'
  | 'amount'
  | 'payeeAccount'
  | 'storeName'
  | 'paymentUnit'
  | 'status'
  | 'createTime'
  | 'finishTime';

export interface ColumnDef {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
}

export const COLUMNS: ColumnDef[] = [
  { key: 'title', label: '标题', defaultVisible: true },
  { key: 'templateName', label: '流程类型', defaultVisible: true },
  { key: 'items', label: '事项 / 明细', defaultVisible: true },
  { key: 'amount', label: '金额（元）', defaultVisible: true },
  { key: 'payeeAccount', label: '收款账户', defaultVisible: true },
  { key: 'storeName', label: '门店', defaultVisible: true },
  { key: 'paymentUnit', label: '付款单位', defaultVisible: false },
  { key: 'status', label: '状态', defaultVisible: true },
  { key: 'createTime', label: '创建时间', defaultVisible: true },
  { key: 'finishTime', label: '完成时间', defaultVisible: false },
];

export const COLUMN_STORAGE_KEY = 'dingtalk_report_visible_columns_v1';

export const EXCLUDE_TEMPLATES = ['银行账户'];

/* ============================================================
 * 会员退费 → 门店推断
 * ============================================================ */
import type { DingTalkReportItem } from '../../../api/dingtalk';

export const MEMBER_REFUND_TPL = '会员退费';
export const FU_GUI_YUAN_UNIT = '北京林朗韵动体育管理有限公司';
export const HA_DE_MEN_UNIT = '北京林朗悦动体育管理有限公司';
export const REFUND_KEYWORDS = ['富贵园', '装修'];

/** 只采集「事项 / 明细」类的文本，用于判断门店 */
function collectRefundItemText(item: DingTalkReportItem): string {
  const parts: string[] = [];

  if (Array.isArray(item.items)) {
    item.items.forEach((it: any) => {
      if (it?.content) parts.push(String(it.content));
    });
  }

  const fv = item.formValues || {};

  const rawDetail = fv['明细列表'];
  if (typeof rawDetail === 'string' && rawDetail && rawDetail !== 'null') {
    try {
      const parsed = JSON.parse(rawDetail);
      if (Array.isArray(parsed)) {
        parsed.forEach((row: any) => {
          (row?.rowValue || []).forEach((f: any) => {
            const label = String(f?.label || '');
            if (
              label.includes('事项') ||
              label.includes('内容') ||
              label.includes('名称')
            ) {
              if (f?.value != null && f.value !== 'null') {
                parts.push(String(f.value));
              }
            }
          });
        });
      }
    } catch {
      parts.push(String(rawDetail));
    }
  }

  [
    '退卡原因',
    '事项',
    '事项/明细',
    '报销事由',
    '费用类型',
    '明细',
    '付款内容提要',
    '付款事由',
    '付款用途',
    '借款提要',
    '备注',
    '说明',
    '用途',
    '摘要',
    '事由',
  ].forEach((k) => {
    const v = fv[k];
    if (v == null || v === 'null' || v === '') return;
    if (typeof v === 'object') {
      try { parts.push(JSON.stringify(v)); } catch {}
    } else {
      parts.push(String(v));
    }
  });

  return parts.join(' ');
}

/**
 * 会员退费 → 推断付款单位
 */
export function inferRefundPaymentUnit(
  item: DingTalkReportItem
): string | null {
  if (item.templateName !== MEMBER_REFUND_TPL) return null;
  if (item.paymentUnit && String(item.paymentUnit).trim()) return null;

  const combined = collectRefundItemText(item);
  if (!combined) return HA_DE_MEN_UNIT;

  const hit = REFUND_KEYWORDS.some((k) => combined.includes(k));
  return hit ? FU_GUI_YUAN_UNIT : HA_DE_MEN_UNIT;
}