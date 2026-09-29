import * as XLSX from 'xlsx';
import type {
  CommissionTier,
  BaseSalaryTier,
  GenderSalaryTier,
  OldClassFeeTier,
  ClassCommissionMode,
  MonthlyCompensationPlan,
  PositionConfig,
} from '../types/compensation';
import { uid } from './id';
import { POSITION_DEFINITIONS } from '../constants/positions';

/* ============================================================
 * 文本归一化：全角 → 半角
 * ============================================================ */
function normalizeText(s: string): string {
  if (!s) return '';
  return String(s)
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/％/g, '%')
    .replace(/[，、]/g, ',')
    .replace(/\u3000/g, ' ')
    .replace(/[～]/g, '~');
}

function extractThreshold(text: string): number {
  if (!text) return 0;
  const t = normalizeText(text);
  if (/以下/.test(t)) return 0;

  const rangeMatch = t.match(
    /(\d+(?:\.\d+)?)\s*(?:万)?\s*[-~]\s*(\d+(?:\.\d+)?)\s*万/
  );
  if (rangeMatch) return parseFloat(rangeMatch[1]) * 10000;

  const wanMatch = t.match(/(\d+(?:\.\d+)?)\s*万/);
  if (wanMatch) return parseFloat(wanMatch[1]) * 10000;

  const numMatch = t.match(/(\d{4,})/);
  if (numMatch) return parseFloat(numMatch[1]);

  return 0;
}

function parseClassCommission(line: string) {
  if (!line || !/课提/.test(line)) return null;
  const t = normalizeText(line);
  const percentMatch = t.match(/课提\s*([\d.]+)\s*%/);
  if (percentMatch)
    return { mode: 'percent' as const, value: parseFloat(percentMatch[1]) / 100 };
  const fixedMatch = t.match(/课提\s*(\d+(?:\.\d+)?)/);
  if (fixedMatch) return { mode: 'fixed' as const, value: parseFloat(fixedMatch[1]) };
  return null;
}

function parseCommissionTiers(text: string): CommissionTier[] {
  if (!text) return [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const tiers: CommissionTier[] = [];
  const seenThresholds = new Set<number>();

  for (const rawLine of lines) {
    const line = normalizeText(rawLine);

    const saleMatch = line.match(/销提\s*([\d.]+)\s*%/);
    let rate = 0;
    if (saleMatch) {
      rate = parseFloat(saleMatch[1]) / 100;
    } else {
      const m = line.match(/([\d.]+)\s*%/);
      if (m) rate = parseFloat(m[1]) / 100;
    }

    const classComm = parseClassCommission(line);
    const threshold = extractThreshold(line);

    if (seenThresholds.has(threshold)) continue;
    seenThresholds.add(threshold);

    tiers.push({
      id: uid(),
      threshold,
      rate,
      classRate: classComm?.value,
      classMode: classComm?.mode,
      note: line,
    });
  }

  tiers.sort((a, b) => a.threshold - b.threshold);
  return tiers;
}

function detectDefaultClassMode(text: string): ClassCommissionMode | undefined {
  for (const line of text.split('\n').filter(Boolean)) {
    const c = parseClassCommission(line);
    if (c) return c.mode;
  }
  return undefined;
}

function parseOldClassFee(text: string): number | undefined {
  const m = normalizeText(text).match(/老课\s*(\d{2,})/);
  return m ? parseInt(m[1], 10) : undefined;
}

function parseBaseSalaryTiers(
  text: string,
  options: {
    keepNote?: boolean;
    thresholds?: number[];
  } = {}
): BaseSalaryTier[] {
  if (!text) return [];
  const keepNote = options.keepNote !== false;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const raw: BaseSalaryTier[] = [];
  lines.forEach((rawLine, idx) => {
    const line = normalizeText(rawLine);
    const matches = line.match(/(\d{3,})/g);
    const amount = matches ? parseInt(matches[matches.length - 1], 10) : 0;

    let threshold: number;
    if (options.thresholds && options.thresholds.length > 0) {
      threshold =
        options.thresholds[Math.min(idx, options.thresholds.length - 1)] ?? 0;
    } else {
      threshold = extractThreshold(line);
    }

    raw.push({
      id: uid(),
      threshold,
      amount,
      note: keepNote ? line : '',
    });
  });

  const sorted = [...raw].sort((a, b) => a.threshold - b.threshold);
  const merged: BaseSalaryTier[] = [];
  for (const cur of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.amount === cur.amount) continue;
    merged.push(cur);
  }
  return merged;
}

function buildFixedSalaryTier(amount: number): BaseSalaryTier[] {
  if (!amount) return [];
  return [{ id: uid(), threshold: 0, amount, note: '固定底薪' }];
}

function parseGenderValues(text: string) {
  if (!text) return { male: 0, female: 0, newbie: 0 };
  const t = normalizeText(text);
  const maleMatch = t.match(/男(?:性|教练)?\s*[:：]?\s*(\d{3,})/);
  const femaleMatch = t.match(/女(?:性|教练)?\s*[:：]?\s*(\d{3,})/);
  const newbieMatch = t.match(/(?:新人|无责)[^\d]*(\d{3,})/);
  return {
    male: maleMatch ? parseInt(maleMatch[1], 10) : 0,
    female: femaleMatch ? parseInt(femaleMatch[1], 10) : 0,
    newbie: newbieMatch ? parseInt(newbieMatch[1], 10) : 0,
  };
}

function buildGenderSalaryTiers(text: string): GenderSalaryTier[] {
  const tiers = parseBaseSalaryTiers(text);
  const gender = parseGenderValues(text);
  if (tiers.length === 0) {
    if (gender.male || gender.female || gender.newbie) {
      return [
        {
          id: uid(),
          threshold: 0,
          male: gender.male,
          female: gender.female,
          newbie: gender.newbie,
          note: text,
        },
      ];
    }
    return [];
  }
  return tiers.map((t) => ({
    id: t.id,
    threshold: t.threshold,
    male: gender.male,
    female: gender.female,
    newbie: gender.newbie,
    note: t.note,
    base: t.amount,
  }));
}

function extractSwimThresholds(commissionText: string): number[] {
  if (!commissionText) return [];
  const lines = normalizeText(commissionText)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const thresholds: number[] = [];
  for (const line of lines) {
    const below = line.match(/^(\d+(?:\.\d+)?)\s*万\s*以下/);
    const above = line.match(/^(\d+(?:\.\d+)?)\s*万\s*以上/);
    const range = line.match(
      /^(\d+(?:\.\d+)?)\s*万?\s*[~-]\s*(\d+(?:\.\d+)?)\s*万/
    );

    if (below) thresholds.push(0);
    else if (range) thresholds.push(Math.round(parseFloat(range[1]) * 10000));
    else if (above) thresholds.push(Math.round(parseFloat(above[1]) * 10000));
    else thresholds.push(extractThreshold(line));
  }

  return Array.from(new Set(thresholds)).sort((a, b) => a - b);
}

function buildSwimGenderSalaryTiers(
  commissionText: string,
  baseText: string
): GenderSalaryTier[] {
  if (!baseText) return [];

  const thresholds = extractSwimThresholds(commissionText);
  const baseLines = baseText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (baseLines.length === 0) return [];

  const firstAmount = parseInt(
    normalizeText(baseLines[0] || '').match(/(\d{3,})/)?.[1] || '0',
    10
  );

  const genderText = normalizeText(baseLines.slice(1).join(' '));
  const maleMatch = genderText.match(/男(?:性|教练)?\s*[:：]?\s*(\d{3,})/);
  const femaleMatch = genderText.match(/女(?:性|教练)?\s*[:：]?\s*(\d{3,})/);
  const newbieMatch = genderText.match(/(?:新人|无责)[^\d]*(\d{3,})/);
  const maleFromText = maleMatch ? parseInt(maleMatch[1], 10) : 0;
  const femaleFromText = femaleMatch ? parseInt(femaleMatch[1], 10) : 0;
  const newbieFromText = newbieMatch ? parseInt(newbieMatch[1], 10) : 0;

  const fallback =
    firstAmount || maleFromText || femaleFromText || newbieFromText || 0;

  const makeUnifiedBase = (m: number, f: number, n: number) =>
    m === f && f === n ? m : 0;

  if (thresholds.length === 0) {
    const male = firstAmount || maleFromText || fallback;
    const female = firstAmount || femaleFromText || fallback;
    const newbie = newbieFromText || male;
    return [
      {
        id: uid(),
        threshold: 0,
        male,
        female,
        newbie,
        base: makeUnifiedBase(male, female, newbie),
        note: '',
      },
    ];
  }

  const raw: GenderSalaryTier[] = thresholds.map((th, idx) => {
    if (idx === 0) {
      const male = firstAmount || maleFromText || fallback;
      const female = firstAmount || femaleFromText || fallback;
      const newbie = newbieFromText || male;
      return {
        id: uid(),
        threshold: th,
        male,
        female,
        newbie,
        base: makeUnifiedBase(male, female, newbie),
        note: '',
      };
    }
    const male = maleFromText || fallback;
    const female = femaleFromText || fallback;
    const newbie = newbieFromText || fallback;
    return {
      id: uid(),
      threshold: th,
      male,
      female,
      newbie,
      base: makeUnifiedBase(male, female, newbie),
      note: '',
    };
  });

  const merged: GenderSalaryTier[] = [];
  for (const cur of raw) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.male === cur.male &&
      last.female === cur.female &&
      last.newbie === cur.newbie
    ) {
      continue;
    }
    merged.push(cur);
  }
  return merged;
}

function buildSwimOldClassFees(commissionText: string): OldClassFeeTier[] {
  if (!commissionText) return [];
  const thresholds = extractSwimThresholds(commissionText);
  const lines = normalizeText(commissionText)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const result: OldClassFeeTier[] = [];
  thresholds.forEach((th, idx) => {
    const m = lines[idx]?.match(/老课\s*(\d{2,})/);
    if (!m) return;
    result.push({
      id: uid(),
      threshold: th,
      fee: parseInt(m[1], 10),
      note: lines[idx],
    });
  });
  return result;
}

interface BlockSlice {
  commissionText: string;
  baseText: string;
}

function sliceBlock(
  rows: any[][],
  startRow: number,
  commissionCol: number,
  baseCol: number,
  maxRows = 12
): BlockSlice {
  const cLines: string[] = [];
  const bLines: string[] = [];

  for (let i = 0; i < maxRows; i++) {
    const r = startRow + i;
    if (!rows[r]) break;

    const aCell = String(rows[r][0] ?? '').trim();
    const cCell = String(rows[r][commissionCol] ?? '').trim();
    const bCell = String(rows[r][baseCol] ?? '').trim();

    if (i > 0 && aCell) break;
    if (i > 0 && !cCell && !bCell) break;

    if (cCell) cLines.push(cCell);
    if (bCell) bLines.push(bCell);
  }

  return {
    commissionText: cLines.join('\n'),
    baseText: bLines.join('\n'),
  };
}

/* ⭐ 只参与底薪的职位（前台/保洁）的 calcFlags */
const FIXED_ONLY_FLAGS = {
  includePerformance: false,
  includeSalesCommission: false,
  includeClassAmount: false,
  includeClassCommission: false,
};

/* ⭐ 店长 / 运营主管：不参与业绩，但销提照算 */
const STORE_AND_OPS_FLAGS = {
  includePerformance: false,
  includeSalesCommission: true,
  includeBaseSalary: true,
  includeClassAmount: true,
  includeClassCommission: true,
};

export function parseCompensationExcel(
  file: File,
  month: string,
  periodLabel: string
): Promise<MonthlyCompensationPlan> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: false,
          defval: '',
        });

        const get = (r: number, c: number) => (rows[r] ? rows[r][c] ?? '' : '');
        const num = (v: any) =>
          parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0;

        const positions: PositionConfig[] = [];

        /* 店长：底薪门槛复用佣金门槛；业绩不参与计算 */
        if (String(get(2, 0)).includes('店长')) {
          const block = sliceBlock(rows, 2, 3, 8, 1);
          const commissionTiers = parseCommissionTiers(block.commissionText);
          const commissionThresholds = commissionTiers.map((t) => t.threshold);
          positions.push({
            id: uid(),
            title: '店长',
            category: 'operations',
            headcount: num(get(2, 12)),
            performanceTarget: 0,
            performanceSource: 'aggregate',
            totalBaseSalary: 0,
            commissionTiers,
            baseSalaryTiers: parseBaseSalaryTiers(block.baseText, {
              thresholds: commissionThresholds,
            }),
            calcFlags: { ...STORE_AND_OPS_FLAGS },
          });
        }

        /* 会籍经理 */
        if (String(get(3, 0)).includes('会籍经理')) {
          const block = sliceBlock(rows, 3, 3, 8, 1);
          positions.push({
            id: uid(),
            title: '会籍经理',
            category: 'membership',
            headcount: num(get(3, 12)),
            performanceTarget: 0,
            performanceSource: 'self',
            totalBaseSalary: 0,
            commissionTiers: parseCommissionTiers(block.commissionText),
            baseSalaryTiers: parseBaseSalaryTiers(block.baseText),
            extraNote: String(get(3, 3)).includes('店长兼任') ? '店长兼任' : '',
            managerAggregateByDept: true,
          });
        }

        /* 会籍 */
        if (String(get(4, 0)).includes('会籍')) {
          const block = sliceBlock(rows, 4, 3, 8, 12);
          const commissionTiers = parseCommissionTiers(block.commissionText);
          const commissionThresholds = commissionTiers.map((t) => t.threshold);
          positions.push({
            id: uid(),
            title: '会籍',
            category: 'membership',
            headcount: num(get(4, 12)),
            performanceTarget: 0,
            performanceSource: 'self',
            totalBaseSalary: 0,
            commissionTiers,
            baseSalaryTiers: parseBaseSalaryTiers(block.baseText, {
              thresholds: commissionThresholds,
            }),
          });
        }

        /* 泳教经理 */
        if (String(get(10, 0)).includes('泳教经理')) {
          const block = sliceBlock(rows, 10, 3, 8, 6);
          const commissionTiers = parseCommissionTiers(block.commissionText);
          const commissionThresholds = commissionTiers.map((t) => t.threshold);
          positions.push({
            id: uid(),
            title: '泳教经理',
            category: 'swim',
            headcount: num(get(10, 12)),
            performanceTarget: 0,
            performanceSource: 'self',
            totalBaseSalary: 0,
            commissionTiers,
            baseSalaryTiers: parseBaseSalaryTiers(block.baseText, {
              thresholds: commissionThresholds,
            }),
            classCommissionMode: detectDefaultClassMode(block.commissionText),
            courseCommissions: [],
            managerAggregateByDept: true,
          });
        }

        /* 泳教 */
        if (String(get(14, 0)).includes('泳教')) {
          const block = sliceBlock(rows, 14, 3, 8, 12);
          positions.push({
            id: uid(),
            title: '泳教',
            category: 'swim',
            headcount: num(get(14, 12)),
            performanceTarget: 0,
            performanceSource: 'self',
            totalBaseSalary: 0,
            commissionTiers: parseCommissionTiers(block.commissionText),
            baseSalaryTiers: [],
            genderSalaryTiers: buildSwimGenderSalaryTiers(
              block.commissionText,
              block.baseText
            ),
            extraNote: '男教练3000 女教练3500 新人无责底薪3000元',
            classCommissionMode: detectDefaultClassMode(block.commissionText),
            oldClassFee: parseOldClassFee(block.commissionText),
            oldClassFees: buildSwimOldClassFees(block.commissionText),
            courseCommissions: [],
          });
        }

        /* 私教 */
        for (let r = 0; r < rows.length; r++) {
          const cell = String(get(r, 0));
          if (cell.includes('私教') && !cell.includes('经理')) {
            const block = sliceBlock(rows, r, 3, 8, 12);
            const commissionTiers = parseCommissionTiers(block.commissionText);
            const commissionThresholds = commissionTiers.map(
              (t) => t.threshold
            );
            positions.push({
              id: uid(),
              title: '私教',
              category: 'personalTraining',
              headcount: num(get(r, 12)),
              performanceTarget: 0,
              performanceSource: 'self',
              totalBaseSalary: 0,
              commissionTiers,
              baseSalaryTiers: parseBaseSalaryTiers(block.baseText, {
                keepNote: false,
                thresholds: commissionThresholds,
              }),
              classCommissionMode: detectDefaultClassMode(block.commissionText),
              oldClassFee: parseOldClassFee(block.commissionText),
              courseCommissions: [],
            });
            break;
          }
        }

        /* ⭐ 运营主管：从 Excel 读，读不到就用默认 3% / 20000；业绩不参与计算 */
        {
          let found = false;
          for (let r = 0; r < rows.length; r++) {
            const cell = String(get(r, 0));
            if (cell.includes('运营主管')) {
              const amount = num(get(r, 8));
              const rate = (() => {
                const raw = String(get(r, 3) ?? '');
                const m = raw.match(/([\d.]+)\s*%/);
                return m ? parseFloat(m[1]) / 100 : 0.03;
              })();
              positions.push({
                id: uid(),
                title: '运营主管',
                category: 'operations',
                headcount: num(get(r, 12)) || 1,
                performanceTarget: 0,
                performanceSource: 'self',
                totalBaseSalary: 0,
                commissionTiers: [
                  { id: uid(), threshold: 0, rate, note: '店长销售 × 比例' },
                ],
                baseSalaryTiers: buildFixedSalaryTier(amount || 20000),
                extraNote: `佣金 = 店长销售 × ${(rate * 100).toFixed(1)}%`,
                calcFlags: { ...STORE_AND_OPS_FLAGS },
              });
              found = true;
              break;
            }
          }
          if (!found) {
            positions.push({
              id: uid(),
              title: '运营主管',
              category: 'operations',
              headcount: 1,
              performanceTarget: 0,
              performanceSource: 'self',
              totalBaseSalary: 0,
              commissionTiers: [
                { id: uid(), threshold: 0, rate: 0.03, note: '店长销售 × 3%' },
              ],
              baseSalaryTiers: buildFixedSalaryTier(20000),
              extraNote: '佣金 = 店长销售 × 3%',
              calcFlags: { ...STORE_AND_OPS_FLAGS },
            });
          }
        }

        /* 前台：默认只参与底薪 */
        if (String(get(21, 0)).includes('前台')) {
          const amount = num(get(21, 8));
          positions.push({
            id: uid(),
            title: '前台',
            category: 'operations',
            headcount: num(get(21, 12)),
            performanceTarget: 0,
            performanceSource: 'self',
            totalBaseSalary: 0,
            commissionTiers: [],
            baseSalaryTiers: buildFixedSalaryTier(amount),
            extraNote: '上一休一（早8晚10）',
            calcFlags: { ...FIXED_ONLY_FLAGS },
          });
        }

        /* 保洁：默认只参与底薪 */
        if (String(get(23, 0)).includes('保洁')) {
          const amount = num(get(23, 8));
          positions.push({
            id: uid(),
            title: '保洁',
            category: 'operations',
            headcount: num(get(23, 12)),
            performanceTarget: 0,
            performanceSource: 'self',
            totalBaseSalary: 0,
            commissionTiers: [],
            baseSalaryTiers: buildFixedSalaryTier(amount),
            calcFlags: { ...FIXED_ONLY_FLAGS },
          });
        }

        /* 补全标准职位 */
        const existingTitles = new Set(positions.map((p) => p.title));
        POSITION_DEFINITIONS.forEach((def) => {
          if (!existingTitles.has(def.title)) {
            const isMgr =
              def.title.includes('经理') && !def.title.includes('店长');

            const isFixedOnly =
              def.title.includes('前台') || def.title.includes('保洁');

            const isStoreOrOps =
              def.title.includes('店长') || def.title === '运营主管';

            positions.push({
              id: uid(),
              title: def.title,
              category: def.category,
              headcount: 0,
              performanceTarget: 0,
              performanceSource: 'self',
              totalBaseSalary: 0,
              commissionTiers: [],
              baseSalaryTiers: [],
              genderSalaryTiers: undefined,
              extraNote: def.isManager ? '经理职位' : '',
              courseCommissions: [],
              managerAggregateByDept: isMgr ? true : undefined,
              calcFlags: isFixedOnly
                ? { ...FIXED_ONLY_FLAGS }
                : isStoreOrOps
                ? { ...STORE_AND_OPS_FLAGS }
                : undefined,
            });
          }
        });

        resolve({
          month,
          periodLabel,
          positions,
          importedFrom: file.name,
          importedAt: new Date().toISOString(),
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}