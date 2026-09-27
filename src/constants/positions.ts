import type { PositionCategory } from '../types/compensation';

/* ============================================================
 * 标准职位清单
 * ============================================================ */
export interface PositionDefinition {
  /** 标准职位标题（写入配置的 title） */
  title: string;
  /** 分类（用于 Tab） */
  category: PositionCategory;
  /** 别名：接口返回的其它写法，可回退到本职位 */
  aliases: string[];
  /** 图标 key，UI 用 */
  icon: 'membership' | 'swim' | 'personalTraining' | 'operations';
  /** 是否经理职位 */
  isManager?: boolean;
}

export const POSITION_DEFINITIONS: PositionDefinition[] = [
  /* ---------- 会籍 ---------- */
  {
    title: '会籍',
    category: 'membership',
    aliases: ['会籍顾问', '销售', 'membership'],
    icon: 'membership',
  },
  {
    title: '会籍经理',
    category: 'membership',
    aliases: ['会籍主管', '销售经理', 'membership_manager'],
    icon: 'membership',
    isManager: true,
  },

  /* ---------- 泳教 ---------- */
  {
    title: '泳教',
    category: 'swim',
    aliases: ['游泳教练', '游泳教员', 'swim_coach', 'swimming'],
    icon: 'swim',
  },
  {
    title: '泳教经理',
    category: 'swim',
    aliases: ['游泳经理', '泳教主管', 'swim_manager'],
    icon: 'swim',
    isManager: true,
  },

  /* ---------- 私教 ---------- */
  {
    title: '私教',
    category: 'personalTraining',
    aliases: ['私人教练', '私人教员', 'personal_trainer', 'pt'],
    icon: 'personalTraining',
  },
  {
    title: '私教经理',
    category: 'personalTraining',
    aliases: ['私教主管', '私人教练经理', 'pt_manager'],
    icon: 'personalTraining',
    isManager: true,
  },
  {
    title: '瑜伽',
    category: 'personalTraining',
    aliases: ['瑜伽教练', '瑜伽老师', 'yoga'],
    icon: 'personalTraining',
  },
  {
    title: '舞蹈',
    category: 'personalTraining',
    aliases: ['舞蹈教练', '舞蹈老师', 'dance'],
    icon: 'personalTraining',
  },
  {
    title: '团操',
    category: 'personalTraining',
    aliases: ['团体操', '团操教练', '团课', 'group_class'],
    icon: 'personalTraining',
  },

  /* ---------- 运营 ---------- */
  {
    title: '店长',
    category: 'operations',
    aliases: ['门店经理', 'store_manager'],
    icon: 'operations',
    isManager: true,
  },
  {
    title: '前台',
    category: 'operations',
    aliases: ['前台接待', 'reception', 'front_desk'],
    icon: 'operations',
  },
  {
    title: '保洁',
    category: 'operations',
    aliases: ['清洁', 'cleaner', 'housekeeping'],
    icon: 'operations',
  },
];

/* ============================================================
 * 工具函数
 * ============================================================ */

/** 取所有标准职位标题 */
export const ALL_POSITION_TITLES = POSITION_DEFINITIONS.map((p) => p.title);

/** 标题 → 定义 */
const TITLE_MAP = new Map<string, PositionDefinition>();
POSITION_DEFINITIONS.forEach((p) => {
  TITLE_MAP.set(p.title, p);
  p.aliases.forEach((a) => TITLE_MAP.set(a, p));
});

/** 根据任意标题或别名，找到标准职位标题 */
export function normalizePositionTitle(input: string): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();

  // 1) 精确（标准名或别名）
  if (TITLE_MAP.has(trimmed)) return TITLE_MAP.get(trimmed)!.title;

  // 2) 包含匹配
  for (const [key, def] of TITLE_MAP.entries()) {
    if (trimmed.includes(key) || key.includes(trimmed)) {
      return def.title;
    }
  }

  return undefined;
}

/** 该标题是否经理 */
export function isManagerTitle(title: string): boolean {
  const def = TITLE_MAP.get(title);
  if (def) return !!def.isManager;
  return title.includes('经理');
}

/** 取分类 */
export function getCategoryOf(title: string): PositionCategory | undefined {
  return TITLE_MAP.get(title)?.category;
}