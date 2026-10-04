export function extractAmount(
  templateName: string,
  formValues: Record<string, any>
): number | null {
  const candidates = [
    '补退金额（元）', '补退金额', '报销金额',
    '借款金额（元）', '借款金额',
    '本次申请支付金额（元）', '本次申请支付金额',
    '退款金额（元）', '退款金额',
    '总价款（元）', '金额（元）', '金额',
  ];
  for (const key of candidates) {
    const v = formValues[key];
    if (v !== undefined && v !== null && v !== '' && v !== 'null') {
      const n = Number(v);
      if (!isNaN(n) && n !== 0) return n;
    }
  }
  return null;
}

export function extractPayeeAccount(
  formValues: Record<string, any>
): string | null {
  const keys = ['收款账户', '收款人', '收款方', '收款单位', '持卡人姓名'];
  for (const k of keys) {
    const v = formValues[k];
    if (v && v !== 'null') return String(v);
  }
  return null;
}

export function extractItems(
  templateName: string,
  formValues: Record<string, any>
): string {
  if (formValues['明细列表']) {
    try {
      const arr = JSON.parse(formValues['明细列表']);
      if (Array.isArray(arr)) {
        const parts = arr
          .map((row) => {
            const rv = row.rowValue || [];
            const item = rv.find((x: any) => x.label === '事项')?.value || '';
            const amount =
              rv.find((x: any) => x.label === '金额（元）')?.value || '';
            return amount ? `${item}（¥${amount}）` : item;
          })
          .filter(Boolean);
        if (parts.length > 0) return parts.join('；');
      }
    } catch {
      /* ignore */
    }
  }
  if (formValues['借款提要']) return String(formValues['借款提要']);
  if (formValues['付款内容提要']) return String(formValues['付款内容提要']);
  if (formValues['退卡原因']) {
    const reason = String(formValues['退卡原因']);
    const cardType = formValues['会员卡类型'];
    const cardName = formValues['持卡人姓名'];
    const parts = [reason];
    if (cardType) parts.push(`[${cardType}]`);
    if (cardName) parts.push(`持卡人：${cardName}`);
    return parts.join(' · ');
  }
  return formValues['备注'] || formValues['说明'] || formValues['事项'] || '—';
}

export function fmtMoney(v: any): string {
  const n = Number(v);
  if (isNaN(n)) return v || '—';
  return `¥${n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}