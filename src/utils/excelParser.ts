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

function extractThreshold(text: string): number {
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
  line: string
): { mode: ClassCommissionMode; value: number } | null {
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

/** 佣金阶梯：原样解析，不合并 */
function parseCommissionTiers(commissionText: string): CommissionTier[] {
  if (!commissionText) return [];

  return commissionText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const saleMatch = line.match(/销提\s*([\d.]+)\s*%/);
      const rate = saleMatch
        ? parseFloat(saleMatch[1]) / 100
        : (() => {
            const m = line.match(/([\d.]+)\s*%/);
            return m ? parseFloat(m[1]) / 100 : 0;
          })();

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

/** 底薪阶梯：解析出每条的 amount */
function parseBaseSalaryTiers(text: string): BaseSalaryTier[] {
  if (!text) return [];

  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const cleaned = line.replace(/\d+(?:\.\d+)?\s*万/g, '');
      const amountMatch = cleaned.match(/(\d{3,})/g);
      const amount = amountMatch
        ? parseInt(amountMatch[amountMatch.length - 1], 10)
        : 0;
      return {
        id: uid(),
        threshold: extractThreshold(line),
        amount,
        note: line,
      };
    });
}

/**
 * 合并底薪阶梯：相同底薪只保留一条，门槛取最低值
 * 佣金阶梯不受影响
 */
function mergeBaseSalaryTiersByAmount(
  tiers: BaseSalaryTier[]
): BaseSalaryTier[] {
  if (tiers.length === 0) return [];

  const sorted = [...tiers].sort((a, b) => a.threshold - b.threshold);

  const merged: BaseSalaryTier[] = [];
  for (const t of sorted) {
    const existing = merged.find((m) => m.amount === t.amount);
    if (!existing) {
      merged.push({ ...t });
    }
    // 已有相同 amount → 跳过（门槛更低的保留在前面）
  }

  return merged.sort((a, b) => a.threshold - b.threshold);
}

function detectDefaultClassMode(
  text: string
): ClassCommissionMode | undefined {
  for (const line of text.split('\n').filter(Boolean)) {
    const c = parseClassCommission(line);
    if (c) return c.mode;
  }
  return undefined;
}

function parseOldClassFee(text: string): number | undefined {
  const m = text.match(/老课\s*(\d{2,})/);
  return m ? parseInt(m[1], 10) : undefined;
}

function buildFixedSalaryTier(amount: number): BaseSalaryTier[] {
  if (!amount) return [];
  return [{ id: uid(), threshold: 0, amount, note: '固定底薪' }];
}

function parseGenderValues(text: string): {
  male: number;
  female: number;
  newbie: number;
} {
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
 * 泳教性别底薪：按底薪文本生成
 * 门槛与合并后的底薪阶梯一一对应（如果有）
 */
function buildGenderSalaryTiers(
  baseText: string,
  mergedBaseTiers: BaseSalaryTier[]
): GenderSalaryTier[] {
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

  const thresholds = mergedBaseTiers.length > 0
    ? mergedBaseTiers.map((t) => t.threshold)
    : [0];

  const tiers: GenderSalaryTier[] = [];

  thresholds.forEach((th, idx) => {
    if (idx === 0 && !firstIsGender && firstAmount > 0) {
      tiers.push({
        id: uid(),
        threshold: th,
        base: firstAmount,
        male: 0,
        female: 0,
        newbie: gender.newbie || 3000,
        newbieFixed: true,
        note: baseText,
      });
    } else {
      tiers.push({
        id: uid(),
        threshold: th,
        male: gender.male,
        female: gender.female,
        newbie: gender.newbie || 3000,
        newbieFixed: true,
        note: baseText,
      });
    }
  });

  if (tiers.length === 0) {
    tiers.push({
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

  return tiers;
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

        /** 佣金保持原样；底薪按 amount 合并 */
        const buildTiers = (
          commissionText: string,
          baseText: string
        ): {
          commissionTiers: CommissionTier[];
          baseSalaryTiers: BaseSalaryTier[];
        } => {
          const rawBaseTiers = parseBaseSalaryTiers(baseText);
          const baseSalaryTiers = mergeBaseSalaryTiersByAmount(rawBaseTiers);
          const commissionTiers = parseCommissionTiers(commissionText);
          return { commissionTiers, baseSalaryTiers };
        };

        const positions: PositionConfig[] = [];

        // 店长
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

        // 会籍经理
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

        // 会籍
        if (String(get(4, 0)).includes('会籍')) {
          const commissionText = rows
            .slice(4, 11)
            .map((r) => r[3])
            .filter(Boolean)
            .join('\n');
          const baseText = rows
            .slice(4, 11)
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

        // 泳教经理
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

        // 泳教
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
          const rawBaseTiers = parseBaseSalaryTiers(baseText);
          const mergedBaseTiers = mergeBaseSalaryTiersByAmount(rawBaseTiers);

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
            genderSalaryTiers: buildGenderSalaryTiers(baseText, mergedBaseTiers),
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

        // 前台
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

        // 保洁
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