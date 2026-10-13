/* ============================================================
 * ⭐ 钉钉流程分类工具（前端）
 *    - 与后端 server/services/dingtalkClassify.js 保持一致
 *    - 任何规则调整，两个文件同步修改
 * ============================================================ */

export const MEMBER_REFUND_TPL = '会员退费';

/** ⭐ 判断一段文本属于哪个钉钉分类 */
export function classifyText(text: string): string {
  if (!text) return '其它';

  /* 退费优先 */
  if (['退费', '退款', '退卡', '退课'].some((k) => text.includes(k))) {
    return '退费';
  }

  /* 电费：明确表达才算 */
  if (
    text.includes('电费') ||
    text.includes('交电') ||
    text.includes('缴电') ||
    text.includes('充电') ||
    text.includes('购电')
  ) {
    return '电费';
  }

  /* 水费：明确表达才算 */
  if (
    text.includes('水费') ||
    text.includes('交水') ||
    text.includes('缴水') ||
    text.includes('充水') ||
    text.includes('购水')
  ) {
    return '水费';
  }

  /* 物业费 */
  if (text.includes('物业费') || text.includes('物业')) return '物业费';

  /* 工资底薪佣金 */
  if (
    ['工资', '底薪', '佣金', '提成', '薪酬', '薪金', '劳务', '派遣', '人力资源'].some(
      (k) => text.includes(k)
    )
  ) {
    return '工资底薪佣金';
  }

  /* 修理 */
  if (
    ['修理', '维修', '修缮', '保养', '配件更换', '更换', '安装', '装修'].some(
      (k) => text.includes(k)
    )
  ) {
    return '修理';
  }

  /* 日常支出 */
  if (
    [
      '办公', '办公用品', '日用', '清洁', '保洁', '耗材', '快递', '邮寄',
      '差旅', '交通', '通讯', '话费', '劳保', '低值易耗', '消耗',
      '采购', '购买', '宣传', '广告', '推广', '营销', '物料', '印刷',
    ].some((k) => text.includes(k))
  ) {
    return '日常支出';
  }

  return '其它';
}

/** ⭐ 收款账户覆盖规则 */
export const PAYEE_CATEGORY_OVERRIDES: Array<{
  payee: string;
  category: string;
}> = [
  { payee: '山东云优人力资源服务有限公司', category: '工资底薪佣金' },
];

/** ⭐ 根据收款账户判断分类，未命中返回 null */
export function classifyByPayee(
  payeeAccount: string | null | undefined
): string | null {
  const raw = payeeAccount == null ? '' : String(payeeAccount).trim();
  if (!raw) return null;
  for (const rule of PAYEE_CATEGORY_OVERRIDES) {
    if (raw === rule.payee) return rule.category;
  }
  return null;
}

/**
 * ⭐ 把钉钉记录里的「事项 / 明细 / 其它文本字段」合并成一个字符串
 */
export function collectDingtalkText(item: any): string {
  const parts: string[] = [];

  if (Array.isArray(item?.items)) {
    item.items.forEach((it: any) => {
      if (it?.content) parts.push(String(it.content));
    });
  }

  const fv = item?.formValues || {};
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

  if (item?.title) parts.push(String(item.title));

  [
    '事项', '事项/明细', '报销事由', '费用类型', '明细',
    '备注', '事由', '用途', '摘要', '说明',
    '付款内容提要', '付款事由', '付款用途',
    '借款提要', '退卡原因',
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
 * ⭐ 按 item 拆分金额，返回 [{category, amount}]
 */
export function classifyDingtalkItems(
  item: any,
  pickAmount: (item: any) => number
): Array<{ category: string; amount: number }> {
  const tpl = String(item?.templateName || '').trim();

  /* 1) 退费优先 */
  if (tpl.includes('退费') || tpl.includes('退款')) {
    return [{ category: '退费', amount: pickAmount(item) }];
  }
  if (tpl === MEMBER_REFUND_TPL) {
    return [{ category: '退费', amount: pickAmount(item) }];
  }

  /* 2) 收款账户命中 */
  const byPayee = classifyByPayee(item?.payeeAccount);
  if (byPayee) {
    return [{ category: byPayee, amount: pickAmount(item) }];
  }

  /* 3) 按 items 逐项拆分 */
  const items = Array.isArray(item?.items) ? item.items : [];
  if (items.length > 0) {
    const result: Array<{ category: string; amount: number }> = [];
    for (const it of items) {
      const text = String(it?.content || '').trim();
      const amount = Number(it?.amount || 0) || 0;
      if (!text || amount === 0) continue;
      result.push({ category: classifyText(text), amount });
    }
    if (result.length > 0) return result;
  }

  /* 4) 兜底：整条文本 */
  const text = collectDingtalkText(item);
  return [
    {
      category: text ? classifyText(text) : tpl || '其它',
      amount: pickAmount(item),
    },
  ];
}