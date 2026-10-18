import type { AIStoreProfile } from './aiConfig';

export const DEFAULT_AI_STORE_PROFILES: Record<string, AIStoreProfile> = {
  '富贵园': {
    name: '富贵园店',
    area: '3000 多平米',
    facilities: ['泳池', '操房', '乒乓球', '篮球场', '私教区', '搏击区', '有氧区', '器械区'],
    positioning:
      '综合型旗舰店，设施齐全、面积大、可承载泳教 / 篮球 / 搏击 / 操课等多业态；固定成本（水电、物业、租金、保洁）体量明显高于哈德门。',
    focus: [
      '泳池、篮球场、操房等高能耗 / 高维护区域是电费、水费、保洁费、维修费的主要来源，需要单独关注其坪效。',
      '多业态意味着收入结构更分散，需关注各业态（售卡 vs 售课 vs 泳教）的毛利差异。',
      '大面积场地固定成本刚性高，盈亏平衡点更依赖收入规模，需重点看坪效与人效。',
    ],
  },
  '哈德门': {
    name: '哈德门店',
    area: '600 多平米',
    facilities: ['私教区', '有氧区', '器械区', '操房', '乒乓球'],
    positioning:
      '小而精社区型门店，以私教、有氧、器械、操房为主；固定成本相对低，坪效 / 人效是关键指标。',
    focus: [
      '面积小、私教占比高，需关注私教课提与私教销售的贡献度。',
      '无泳池 / 篮球场，水电与保洁负担轻，固定成本压力小，利润率更容易做正。',
      '场地有限，器械 / 操房高峰期冲突概率高，需关注排课与会员体验。',
    ],
  },
};

export function getDefaultAIStoreProfile(storeId: string, storeName: string): AIStoreProfile {
  const id = String(storeId);
  const name = String(storeName || '');
  const key = id === '12279' || name.includes('富贵园') ? '富贵园'
    : id === '11536' || name.includes('哈德门') ? '哈德门' : '';
  const item = key ? DEFAULT_AI_STORE_PROFILES[key] : undefined;
  return item ? { ...item, facilities: [...item.facilities], focus: [...item.focus] }
    : { name, area: '', facilities: [], positioning: '', focus: [] };
}
