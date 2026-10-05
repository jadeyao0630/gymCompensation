/* ============================================================
 * 付款单位 → 门店
 * ============================================================ */
export const PAYMENT_UNIT_TO_STORE: Record<string, string> = {
  '北京林朗悦动体育管理有限公司': '哈德门',
  '北京林朗体育管理有限公司': '哈德门',
  '北京林朗韵动体育管理有限公司': '富贵园',
  '北京林朗体育管理有限公司东花市大街分公司': '富贵园',
};

export const PAYMENT_UNITS = Object.keys(PAYMENT_UNIT_TO_STORE);

export function getStoreFromPaymentUnit(paymentUnit: string | null): string {
  if (!paymentUnit) return '';
  if (PAYMENT_UNIT_TO_STORE[paymentUnit]) return PAYMENT_UNIT_TO_STORE[paymentUnit];
  for (const [unit, store] of Object.entries(PAYMENT_UNIT_TO_STORE)) {
    if (paymentUnit.includes(unit) || unit.includes(paymentUnit)) return store;
  }
  if (paymentUnit.includes('东花市')) return '富贵园';
  return '';
}

/* ============================================================
 * ⭐ 模板名称 → 分类映射（按钉钉后台的分类）
 * ============================================================ */
export type TemplateCategory =
  | '假勤管理'
  | '智能财务'
  | '法务管理'
  | '业务管理'
  | '其他';

/* 分类顺序（前端展示顺序） */
export const TEMPLATE_CATEGORY_ORDER: TemplateCategory[] = [
  '假勤管理',
  '智能财务',
  '法务管理',
  '业务管理',
  '其他',
];

/* 精确名称映射（同名直接用） */
export const TEMPLATE_NAME_TO_CATEGORY: Record<string, TemplateCategory> = {
  /* 假勤管理 */
  '出差申请': '假勤管理',
  '请假单': '假勤管理',

  /* 智能财务 */
  '付款申请单': '智能财务',
  '员工借款（备用金）': '智能财务',
  '员工费用报销': '智能财务',
  '差旅报销申请': '智能财务',
  '会员退费': '智能财务',
  '资产调拨申请表': '智能财务',
  '资产报废申请表': '智能财务',
  '资产购置申请表': '智能财务',

  /* 法务管理 */
  '印章、证照、档案 使用申请': '法务管理',
  '合同用印': '法务管理',

  /* 业务管理 */
  '请示': '业务管理',
  '会签单': '业务管理',

  /* 其他 */
  '访客登记': '其他',
  '供应商合同': '其他',
  '通知供应商发货单': '其他',
  '采购单': '其他',
  '客户工单': '其他',
  '客户收货确认单': '其他',
  '客户合同': '其他',
  '轻量审批-权限申请': '其他',
};

/* ⭐ 从模板名推断分类（支持模糊匹配） */
export function getTemplateCategory(templateName: string): TemplateCategory {
  if (!templateName) return '其他';

  /* 1) 精确匹配 */
  if (TEMPLATE_NAME_TO_CATEGORY[templateName]) {
    return TEMPLATE_NAME_TO_CATEGORY[templateName];
  }

  /* 2) 模糊匹配关键词 */
  const name = templateName;

  /* 假勤管理 */
  if (name.includes('请假') || name.includes('出差') || name.includes('加班') ||
      name.includes('外出') || name.includes('调休') || name.includes('考勤')) {
    return '假勤管理';
  }

  /* 智能财务 */
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

  /* 法务管理 */
  if (
    name.includes('印章') ||
    name.includes('证照') ||
    name.includes('档案') ||
    name.includes('合同用印') ||
    name.includes('法务')
  ) {
    return '法务管理';
  }

  /* 业务管理 */
  if (
    name.includes('请示') ||
    name.includes('会签') ||
    name.includes('审批')
  ) {
    return '业务管理';
  }

  return '其他';
}

/* ============================================================
 * 列定义
 * ============================================================ */
export type ColumnKey =
  | 'title'
  | 'items'
  | 'amount'
  | 'payee'
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
  { key: 'items', label: '事项 / 明细', defaultVisible: true },
  { key: 'amount', label: '金额（元）', defaultVisible: true },
  { key: 'payee', label: '收款账户', defaultVisible: true },
  { key: 'status', label: '状态', defaultVisible: true },
  { key: 'createTime', label: '创建时间', defaultVisible: true },
  { key: 'finishTime', label: '完成时间', defaultVisible: false },
];

export const COLUMN_STORAGE_KEY = 'dingtalk_report_visible_columns_v1';

/* 排除的模板（不显示） */
export const EXCLUDE_TEMPLATES = ['银行账户'];