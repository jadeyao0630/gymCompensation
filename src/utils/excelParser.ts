import * as XLSX from 'xlsx';
import type {
  CommissionTier,
  BaseSalaryTier,
  GenderSalaryTier,
  CourseCommission,
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

/* ---------- 门槛解析（通用） ---------- */
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

/* ---------- 课提 ---------- */
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

/* ---------- 佣金阶梯 ---------- */
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

/* ---------- 底薪阶梯（合并相同底薪） ---------- */
function parseBaseSalaryTiers(text: string): BaseSalaryTier[] {
  if (!text) return [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const raw: BaseSalaryTier[] = [];
  for (const rawLine of lines) {
    const line = normalizeText(rawLine);
    const amountMatch = line.match(/(\d{3,})/g);
    const amount = amountMatch
      ? parseInt(amountMatch[amountMatch.length - 1], 10)
      : 0;
    raw.push({ id: uid(), threshold: extractThreshold(line), amount, note: line });
  }

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

/* ---------- 通用性别底薪 ---------- */
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

/* ============================================================
 * 泳教专用
 * ============================================================ */
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
  const baseLines = baseText.split('\n').map((l) => l.trim()).filter(Boolean);

  const tierList: GenderSalaryTier[] = [];

  const firstAmount = parseInt(
    normalizeText(baseLines[0] || '').match(/(\d{3,})/)?.[1] || '0',
    10
  );
  const t0 = thresholds[0] ?? 0;
  if (firstAmount) {
    tierList.push({
      id: uid(),
      threshold: t0,
      male: firstAmount,
      female: firstAmount,
      newbie: firstAmount,
      base: firstAmount,
      note: baseLines[0] || '',
    });
  }

  const secondLine = normalizeText(baseLines[1] || '');
  const maleMatch = secondLine.match(/男(?:性|教练)?\s*[:：]?\s*(\d{3,})/);
  const femaleMatch = secondLine.match(/女(?:性|教练)?\s*[:：]?\s*(\d{3,})/);
  const newbieMatch = secondLine.match(/(?:新人|无责)[^\d]*(\d{3,})/);
  const m2 = maleMatch ? parseInt(maleMatch[1], 10) : 0;
  const f2 = femaleMatch ? parseInt(femaleMatch[1], 10) : 0;
  const n2 = newbieMatch ? parseInt(newbieMatch[1], 10) : 0;

  const t1 = thresholds[1] ?? 10000;
  if (m2 || f2 || n2) {
    tierList.push({
      id: uid(),
      threshold: t1,
      male: m2 || firstAmount,
      female: f2 || firstAmount,
      newbie: n2 || firstAmount,
      base: m2 || firstAmount,
      note: baseLines[1] || '',
    });
  }

  return tierList;
}

/** 泳教老课费用：按业绩档位拆分成数组 */
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

/* ---------- 默认课程课提 ---------- */
function defaultCourseCommissions(): CourseCommission[] {
  return [
    { id: uid(), courseName: '私教课', mode: 'percent', value: 0.3 },
    { id: uid(), courseName: '游泳课', mode: 'percent', value: 0.28 },
  ];
}

/* ============================================================
 * 按块切片
 * ============================================================ */
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

/* ============================================================
 * 主解析
 * ============================================================ */
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

        /* 店长 */
        if (String(get(2, 0)).includes('店长')) {
          const block = sliceBlock(rows, 2, 3, 8, 1);
          positions.push({
            id: uid(),
            title: '店长',
            category: 'operations',
            headcount: num(get(2, 12)),
            performanceTarget: 0,
            performanceSource: 'aggregate',
            totalBaseSalary: 0,
            commissionTiers: parseCommissionTiers(block.commissionText),
            baseSalaryTiers: parseBaseSalaryTiers(block.baseText),
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
            performanceSource: 'members',
            totalBaseSalary: 0,
            commissionTiers: parseCommissionTiers(block.commissionText),
            baseSalaryTiers: parseBaseSalaryTiers(block.baseText),
            extraNote: String(get(3, 3)).includes('店长兼任') ? '店长兼任' : '',
          });
        }

        /* 会籍 */
        if (String(get(4, 0)).includes('会籍')) {
          const block = sliceBlock(rows, 4, 3, 8, 12);
          positions.push({
            id: uid(),
            title: '会籍',
            category: 'membership',
            headcount: num(get(4, 12)),
            performanceTarget: 0,
            performanceSource: 'self',
            totalBaseSalary: 0,
            commissionTiers: parseCommissionTiers(block.commissionText),
            baseSalaryTiers: parseBaseSalaryTiers(block.baseText),
          });
        }

        /* 泳教经理 */
        if (String(get(10, 0)).includes('泳教经理')) {
          const block = sliceBlock(rows, 10, 3, 8, 6);
          positions.push({
            id: uid(),
            title: '泳教经理',
            category: 'swim',
            headcount: num(get(10, 12)),
            performanceTarget: 0,
            performanceSource: 'members',
            totalBaseSalary: 0,
            commissionTiers: parseCommissionTiers(block.commissionText),
            baseSalaryTiers: parseBaseSalaryTiers(block.baseText),
            classCommissionMode: detectDefaultClassMode(block.commissionText),
            courseCommissions: defaultCourseCommissions(),
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
            courseCommissions: defaultCourseCommissions(),
          });
        }

        /* 私教 */
        for (let r = 0; r < rows.length; r++) {
          const cell = String(get(r, 0));
          if (cell.includes('私教') && !cell.includes('经理')) {
            const block = sliceBlock(rows, r, 3, 8, 12);
            positions.push({
              id: uid(),
              title: '私教',
              category: 'personalTraining',
              headcount: num(get(r, 12)),
              performanceTarget: 0,
              performanceSource: 'self',
              totalBaseSalary: 0,
              commissionTiers: parseCommissionTiers(block.commissionText),
              baseSalaryTiers: parseBaseSalaryTiers(block.baseText),
              classCommissionMode: detectDefaultClassMode(block.commissionText),
              oldClassFee: parseOldClassFee(block.commissionText),
              courseCommissions: defaultCourseCommissions(),
            });
            break;
          }
        }

        /* ⭐ 运营主管（固定底薪 + 店长销售 × 3% 佣金） */
        for (let r = 0; r < rows.length; r++) {
          const cell = String(get(r, 0));
          if (cell.includes('运营主管')) {
            const amount = num(get(r, 8));
            positions.push({
              id: uid(),
              title: '运营主管',
              category: 'operations',
              headcount: num(get(r, 12)),
              performanceTarget: 0,
              performanceSource: 'self',
              totalBaseSalary: 0,
              commissionTiers: [],
              baseSalaryTiers: buildFixedSalaryTier(amount),
              extraNote: '佣金 = 店长销售 × 3%',
            });
            break;
          }
        }

        /* 前台 */
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
          });
        }

        /* 保洁 */
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
          });
        }

        /* 补全标准职位 */
        const existingTitles = new Set(positions.map((p) => p.title));
        POSITION_DEFINITIONS.forEach((def) => {
          if (!existingTitles.has(def.title)) {
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