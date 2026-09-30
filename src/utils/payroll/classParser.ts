import type { ClassMemberDetail } from '../../types/payroll';
import { pickPayDetail } from './payDetail';

export interface ClassSummary {
  totalCount: number;
  totalAmount: number;
  byCourse: Record<string, { count: number; amount: number }>;
  members: ClassMemberDetail[];
}

export function parseClassList(record: Record<string, any>): ClassSummary {
  const summary: ClassSummary = {
    totalCount: 0,
    totalAmount: 0,
    byCourse: {},
    members: [],
  };

  const classList: Record<string, any>[] =
    record.class_list ??
    record.classList ??
    record.classes ??
    record.detail_list ??
    record.detailList ??
    record.list ??
    [];

  if (!Array.isArray(classList)) return summary;

  classList.forEach((cls) => {
    const cardName = String(
      cls.card_name ??
        cls.cardName ??
        cls.course_name ??
        cls.courseName ??
        '未命名课程'
    );
    const classCount = Number(
      cls.class_count ?? cls.classCount ?? cls.count ?? 0
    );
    summary.totalCount += classCount || 0;
    if (!summary.byCourse[cardName]) {
      summary.byCourse[cardName] = { count: 0, amount: 0 };
    }
    summary.byCourse[cardName].count += classCount || 0;

    const userList: Record<string, any>[] =
      cls.user_list ?? cls.userList ?? cls.users ?? [];
    let courseAmount = 0;

    if (Array.isArray(userList) && userList.length > 0) {
      userList.forEach((u) => {
        const memberName = String(
          u.username ?? u.name ?? u.user_name ?? u.userName ?? ''
        ).trim();
        const memberId = String(u.user_id ?? u.userId ?? '').trim();
        const cardUserList: Record<string, any>[] =
          u.card_user_list ?? u.cardUserList ?? [];
        if (!Array.isArray(cardUserList)) return;
        cardUserList.forEach((cu) => {
          const price = Number(cu.price ?? cu.unit_price ?? cu.unitPrice ?? 0);
          const signNum = Number(cu.sign_num ?? cu.signNum ?? cu.count ?? 0);
          const amount = signNum * price;
          courseAmount += amount;

          const payDetail =
            pickPayDetail(cu).length > 0
              ? pickPayDetail(cu)
              : pickPayDetail(u).length > 0
              ? pickPayDetail(u)
              : pickPayDetail(cls);

          if (signNum > 0) {
            summary.members.push({
              courseName: cardName,
              memberName: memberName || '—',
              memberId,
              signNum,
              price,
              amount,
              payDetail,
            });
          }
        });
      });
    } else {
      const sp =
        cls.sign_price ??
        cls.signPrice ??
        cls.class_price ??
        cls.classPrice ??
        cls.price ??
        cls.amount;
      if (sp !== undefined && sp !== null && sp !== '') {
        courseAmount = Number(sp) || 0;
      }
    }

    summary.totalAmount += courseAmount;
    summary.byCourse[cardName].amount += courseAmount;
  });

  if (summary.totalAmount === 0) {
    const topSp =
      record.sign_price ??
      record.signPrice ??
      record.class_price ??
      record.classPrice ??
      record.amount;
    if (topSp !== undefined && topSp !== null && topSp !== '') {
      summary.totalAmount = Number(topSp) || 0;
    }
  }

  return summary;
}