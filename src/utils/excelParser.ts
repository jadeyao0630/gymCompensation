import * as XLSX from 'xlsx';
import type {
  CommissionTier,
  BaseSalaryTier,
  GenderSalaryTier,
  CourseCommission,
  ClassCommissionMode,
  MonthlyCompensationPlan,
  PositionConfig,
} from '../types/compensation';
import { uid } from './id';

/* ============================================================
 * 工具函数
 * ============================================================ */

function normalize(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/％/g, '%')
    .replace(/０/g, '0')
    .replace(/１/g, '1')
    .replace(/２/g, '2')
    .replace(/３/g, '3')
    .replace(/４/g, '4')
    .replace(/５/g, '5')
    .replace(/６/g, '6')
    .replace(/７/g, '7')
    .replace(/８/g, '8')
    .replace(/９/g, '9')
    .replace(/．/g, '.')
    .replace(/　/g, ' ');
}

function extractThreshold(raw: string): number {
  const text = normalize(raw);
  if (!text) return 0;
  if (/以下/.test(text)) return 0;

  const rangeMatch = text.match(
    /(\d+(?:\.\d+)?)\s*(?:万)?\s*[-~～]\s*(\d+(?:\.\d+)?)\s*万/
  );
  if (rangeMatch) return parseFloat(rangeMatch[1]) * 10000;

  const wanMatch = text.match(/(\d+(?:\.\d+)?)\s*万/);
  if (wanMatch) return parseFloat(wanMatch[1]) * 10000;

  const numMatch = text.match(/(\d{5,})/);
  if (numMatch) return parseFloat(numMatch[1]);

  return 0;
}

function parseClassCommission(
  rawLine: string
): { mode: ClassCommissionMode; value: number } | null {
  const line = normalize(rawLine);
  if (!line || !/课提/.test(line)) return null;

  const percentMatch = line.match(/课提\s*([\d.]+)\s*%/);
  if (percentMatch) {
    return { mode: 'percent', value: parseFloat(percentMatch[1]) / 100 };
  }

  const fixedMatch = line.match(/课提\s*(\d+(?:\.\d+)?)/);
  if (fixedMatch) {
    return { mode: 'fixed', value: parseFloat(fixedMatch[1]) };
  }

  return null;
}

function parseCommissionTiers(rawText: string): CommissionTier[] {
  const text = normalize(rawText);
  if (!text) return [];

  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const saleMatch = line.match(/销提\s*([\d.]+)\s*%/);
      const fallback = line.match(/([\d.]+)\s*%/);

      const rate = saleMatch
        ? parseFloat(saleMatch[1]) / 100
        : fallback
        ? parseFloat(fallback[1]) / 100
        : 0;

      const classComm = parseClassCommission(line);

      return {
        id: uid(),
        threshold: extractThreshold(line),
        rate,
        classRate: classComm?.value,
        classMode: classComm?.mode,
        note: line,
      };
    });
}

function parseBaseSalaryAmounts(rawText: string): number[] {
  const text = normalize(rawText);
  if (!text) return [];

  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const cleaned = line.replace(/\d+(?:\.\d+)?\s*万/g, '');
      const amountMatch = cleaned.match(/(\d{3,})/g);
      return amountMatch
        ? parseInt(amountMatch[amountMatch.length - 1], 10)
        : 0;
    });
}

function mergeBaseSalaryFromCommission(
  amounts: number[],
  commissionTiers: CommissionTier[]
): BaseSalaryTier[] {
  if (amounts.length === 0 || commissionTiers.length === 0) return [];

  const pairs: { threshold: number; amount: number; note: string }[] = [];
  const len = Math.min(amounts.length, commissionTiers.length);
  for (let i = 0; i < len; i++) {
    pairs.push({
      threshold: commissionTiers[i].threshold,
      amount: amounts[i],
      note: commissionTiers[i].note || '',
    });
  }

  const merged: BaseSalaryTier[] = [];
  pairs.forEach((p) => {
    const existing = merged.find((m) => m.amount === p.amount);
    if (existing) {
      if (p.threshold < existing.threshold) {
        existing.threshold = p.threshold;
        existing.note = p.note;
      }
    } else {
      merged.push({
        id: uid(),
        threshold: p.threshold,
        amount: p.amount,
        note: p.note,
      });
    }
  });

  return merged.sort((a, b) => a.threshold - b.threshold);
}

function detectDefaultClassMode(
  rawText: string
): ClassCommissionMode | undefined {
  const text = normalize(rawText);
  for (const line of text.split('\n').filter(Boolean)) {
    const c = parseClassCommission(line);
    if (c) return c.mode;
  }
  return undefined;
}

function parseOldClassFee(rawText: string): number | undefined {
  const text = normalize(rawText);
  const m = text.match(/老课\s*(\d{2,})/);
  return m ? parseInt(m[1], 10) : undefined;
}

function buildFixedSalaryTier(amount: number): BaseSalaryTier[] {
  if (!amount) return [];
  return [{ id: uid(), threshold: 0, amount, note: '固定底薪' }];
}

function parseGenderValues(rawText: string): {
  male: number;
  female: number;
  newbie: number;
} {
  const text = normalize(rawText);
  if (!text) return { male: 0, female: 0, newbie: 0 };

  const maleMatch = text.match(/男[^\d]{0,4}(\d{3,})/);
  const femaleMatch = text.match(/女[^\d]{0,4}(\d{3,})/);
  const newbieMatch = text.match(/(?:新人|无责)[^\d]{0,8}?(\d{3,})/);

  return {
    male: maleMatch ? parseInt(maleMatch[1], 10) : 0,
    female: femaleMatch ? parseInt(femaleMatch[1], 10) : 0,
    newbie: newbieMatch ? parseInt(newbieMatch[1], 10) : 0,
  };
}

/**
 * 泳教性别底薪
 * - 门槛与合并后的佣金阶梯一一对应
 * - 如果多档的性别底薪数据完全相同，合并为一档（门槛取最低）
 */
function buildGenderSalaryTiers(
  rawBaseText: string,
  mergedTiers: CommissionTier[]
): GenderSalaryTier[] {
  const baseText = normalize(rawBaseText);
  if (!baseText) return [];

  const lines = baseText.split('\n').map((l) => l.trim()).filter(Boolean);
  const gender = parseGenderValues(
    lines.find((l) => /男|女|新人|无责/.test(l)) || baseText
  );

  const firstLine = lines[0] || '';
  const firstIsGender = /男|女|新人|无责/.test(firstLine);
  const firstAmountMatch = firstLine.match(/(\d{3,})/);
  const firstAmount = firstAmountMatch
    ? parseInt(firstAmountMatch[1], 10)
    : 0;

  // 先生成原始档
  const rawTiers: GenderSalaryTier[] = [];

  mergedTiers.forEach((t, idx) => {
    if (idx === 0 && !firstIsGender && firstAmount > 0) {
      rawTiers.push({
        id: uid(),
        threshold: t.threshold,
        base: firstAmount,
        male: 0,
        female: 0,
        newbie: gender.newbie || 3000,
        newbieFixed: true,
        note: baseText,
      });
    } else {
      rawTiers.push({
        id: uid(),
        threshold: t.threshold,
        male: gender.male,
        female: gender.female,
        newbie: gender.newbie || 3000,
        newbieFixed: true,
        note: baseText,
      });
    }
  });

  if (rawTiers.length === 0) {
    rawTiers.push({
      id: uid(),
      threshold: 0,
      base: firstAmount || 0,
      male: gender.male,
      female: gender.female,
      newbie: gender.newbie || 3000,
      newbieFixed: true,
      note: baseText,
    });
  }

  // 合并相同数据
  const signatureOf = (t: GenderSalaryTier) =>
    `${t.base ?? ''}|${t.male}|${t.female}|${t.newbie}|${t.newbieFixed ?? ''}`;

  const merged: GenderSalaryTier[] = [];
  rawTiers.forEach((t) => {
    const sig = signatureOf(t);
    const existing = merged.find((m) => signatureOf(m) === sig);
    if (existing) {
      if (t.threshold < existing.threshold) {
        existing.threshold = t.threshold;
      }
    } else {
      merged.push({ ...t });
    }
  });

  return merged.sort((a, b) => a.threshold - b.threshold);
}

function defaultCourseCommissions(): CourseCommission[] {
  return [
    { id: uid(), courseName: '私教课', mode: 'percent', value: 0.3 },
    { id: uid(), courseName: '游泳课', mode: 'percent', value: 0.28 },
  ];
}

/* ============================================================
 * 主解析函数
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

        const get = (r: number, c: number) =>
          rows[r] ? rows[r][c] ?? '' : '';
        const num = (v: any) =>
          parseInt(String(v).replace(/[^\d]/g, ''), 10) || 0;

        const buildTiers = (
          commissionText: string,
          baseText: string
        ): {
          commissionTiers: CommissionTier[];
          baseSalaryTiers: BaseSalaryTier[];
        } => {
          const commissionTiers = parseCommissionTiers(commissionText);
          const amounts = parseBaseSalaryAmounts(baseText);
          const baseSalaryTiers = mergeBaseSalaryFromCommission(
            amounts,
            commissionTiers
          );
          return { commissionTiers, baseSalaryTiers };
        };

        const positions: PositionConfig[] = [];

        // 店长（第 3 行，索引 2）
        if (String(get(2, 0)).includes('店长')) {
          const { commissionTiers, baseSalaryTiers } = buildTiers(
            get(2, 3),
            get(2, 8)
          );
          positions.push({
            id: uid(),
            title: '店长',
            category: 'operations',
            headcount: num(get(2, 12)),
            performanceTarget: 0,
            performanceSource: 'aggregate',
            totalBaseSalary: 0,
            commissionTiers,
            baseSalaryTiers,
            hasCommission: true,
          });
        }

        // 会籍经理（第 4 行，索引 3）
        if (String(get(3, 0)).includes('会籍经理')) {
          const { commissionTiers, baseSalaryTiers } = buildTiers(
            get(3, 3),
            get(3, 8)
          );
          positions.push({
            id: uid(),
            title: '会籍经理',
            category: 'membership',
            headcount: num(get(3, 12)),
            performanceTarget: 0,
            performanceSource: 'members',
            totalBaseSalary: 0,
            commissionTiers,
            baseSalaryTiers,
            extraNote: String(get(3, 3)).includes('店长兼任')
              ? '店长兼任'
              : '',
            hasCommission: true,
          });
        }

        // 会籍（第 5~10 行，索引 4~9，共 6 行）
        if (String(get(4, 0)).includes('会籍')) {
          const commissionText = rows
            .slice(4, 10)
            .map((r) => r[3])
            .filter(Boolean)
            .join('\n');
          const baseText = rows
            .slice(4, 10)
            .map((r) => r[8])
            .filter(Boolean)
            .join('\n');
          const { commissionTiers, baseSalaryTiers } = buildTiers(
            commissionText,
            baseText
          );
          positions.push({
            id: uid(),
            title: '会籍',
            category: 'membership',
            headcount: num(get(4, 12)),
            performanceTarget: 0,
            performanceSource: 'self',
            totalBaseSalary: 0,
            commissionTiers,
            baseSalaryTiers,
            hasCommission: true,
          });
        }

        // 泳教经理（第 11~14 行，索引 10~13，共 4 行）
        if (String(get(10, 0)).includes('泳教经理')) {
          const commissionText = rows
            .slice(10, 14)
            .map((r) => r[3])
            .filter(Boolean)
            .join('\n');
          const baseText = rows
            .slice(10, 14)
            .map((r) => r[8])
            .filter(Boolean)
            .join('\n');
          const { commissionTiers, baseSalaryTiers } = buildTiers(
            commissionText,
            baseText
          );
          positions.push({
            id: uid(),
            title: '泳教经理',
            category: 'swim',
            headcount: num(get(10, 12)),
            performanceTarget: 0,
            performanceSource: 'members',
            totalBaseSalary: 0,
            commissionTiers,
            baseSalaryTiers,
            classCommissionMode: detectDefaultClassMode(commissionText),
            courseCommissions: defaultCourseCommissions(),
            hasCommission: true,
          });
        }

        // 泳教（第 15~21 行，索引 14~20，共 7 行）
        if (String(get(14, 0)).includes('泳教')) {
          const commissionText = rows
            .slice(14, 21)
            .map((r) => r[3])
            .filter(Boolean)
            .join('\n');
          const baseText = rows
            .slice(14, 21)
            .map((r) => r[8])
            .filter(Boolean)
            .join('\n');

          const commissionTiers = parseCommissionTiers(commissionText);

          positions.push({
            id: uid(),
            title: '泳教',
            category: 'swim',
            headcount: num(get(14, 12)),
            performanceTarget: 0,
            performanceSource: 'self',
            totalBaseSalary: 0,
            commissionTiers,
            baseSalaryTiers: [],
            genderSalaryTiers: buildGenderSalaryTiers(
              baseText,
              commissionTiers
            ),
            extraNote: '男教练3000 女教练3500 新人无责底薪3000元',
            classCommissionMode: detectDefaultClassMode(commissionText),
            oldClassFee: parseOldClassFee(commissionText),
            courseCommissions: defaultCourseCommissions(),
            hasCommission: true,
          });
        }

        // 私教
        for (let r = 0; r < rows.length; r++) {
          const cell = String(get(r, 0));
          if (cell.includes('私教') && !cell.includes('经理')) {
            const commissionText = rows
              .slice(r, r + 7)
              .map((x) => x[3])
              .filter(Boolean)
              .join('\n');
            const baseText = rows
              .slice(r, r + 7)
              .map((x) => x[8])
              .filter(Boolean)
              .join('\n');
            const { commissionTiers, baseSalaryTiers } = buildTiers(
              commissionText,
              baseText
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
              baseSalaryTiers,
              classCommissionMode: detectDefaultClassMode(commissionText),
              oldClassFee: parseOldClassFee(commissionText),
              courseCommissions: defaultCourseCommissions(),
              hasCommission: true,
            });
            break;
          }
        }

        // 前台（第 22 行，索引 21）
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
            hasCommission: false,
          });
        }

        // 保洁（第 24 行，索引 23）
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
            hasCommission: false,
          });
        }

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