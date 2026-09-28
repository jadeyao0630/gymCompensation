import { api } from './client';

export interface CardItem {
  id: string | number;
  name: string;
  single_price?: number | string;
  card_type?: number | string;
  [key: string]: any;
}

/* ⭐ 从 Vite 环境变量读取测试账号 */
const TEST_USERNAME = import.meta.env.VITE_TEST_USERNAME || '';
const TEST_PASSWORD = import.meta.env.VITE_TEST_PASSWORD || '';

/** ⭐ 获取课程列表（后端会自动先登录再拉课程）
 * @param busId 门店 ID
 * @param cardType 1=会籍卡 2=私教课 3=泳教课
 */
export async function fetchCardList(
  busId: string,
  cardType: 1 | 2 | 3
): Promise<CardItem[]> {
  if (!TEST_USERNAME || !TEST_PASSWORD) {
    console.warn(
      '[card] 缺少 VITE_TEST_USERNAME / VITE_TEST_PASSWORD，课程列表可能无法加载'
    );
  }

  const res = await api.post('/api/card/list', {
    bus_id: busId,
    card_type: cardType,
    username: TEST_USERNAME,
    password: TEST_PASSWORD,
  });

  const body = res.data;
  let list: any[] = [];
  if (Array.isArray(body)) list = body;
  else if (Array.isArray(body?.data)) list = body.data;
  else if (Array.isArray(body?.data?.list)) list = body.data.list;
  else if (Array.isArray(body?.list)) list = body.list;

  return list as CardItem[];
}

/** 按职位判断应该查哪种课程
 *  私教类职位 → card_type=2
 *  泳教类职位 → card_type=3
 *  其他 → null（不查）
 */
export function resolveCardTypeByPosition(
  positionTitle: string,
  category?: string
): 2 | 3 | null {
  const t = positionTitle || '';
  if (t.includes('泳教') || t.includes('游泳')) return 3;
  if (
    t.includes('私教') ||
    t.includes('私人教练') ||
    t.includes('瑜伽') ||
    t.includes('舞蹈') ||
    t.includes('团操') ||
    t.includes('团体操')
  ) {
    return 2;
  }
  if (category === 'swim') return 3;
  if (category === 'personalTraining') return 2;
  return null;
}