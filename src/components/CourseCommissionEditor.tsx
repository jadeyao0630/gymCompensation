import React from 'react';
import { Plus, Trash2, Percent, Hash, BookOpen } from 'lucide-react';
import type { CourseCommission, ClassCommissionMode } from '../types/compensation';
import { uid } from '../utils/id';
import type { CardItem } from '../api/card';

interface CourseCommissionEditorProps {
  courses: CourseCommission[];
  onChange: (courses: CourseCommission[]) => void;
  /** ⭐ 课程下拉选项（来自 /api/card/list） */
  cardOptions?: CardItem[];
  /** ⭐ 是否正在加载课程 */
  loadingCards?: boolean;
}

const CourseCommissionEditor: React.FC<CourseCommissionEditorProps> = ({
  courses,
  onChange,
  cardOptions = [],
  loadingCards = false,
}) => {
  const add = () =>
    onChange([
      ...courses,
      { id: uid(), courseName: '', mode: 'percent', value: 0 },
    ]);

  const update = (id: string, u: Partial<CourseCommission>) =>
    onChange(courses.map((c) => (c.id === id ? { ...c, ...u } : c)));

  const remove = (id: string) => onChange(courses.filter((c) => c.id !== id));

  const setMode = (id: string, mode: ClassCommissionMode) => {
    const cur = courses.find((c) => c.id === id);
    if (!cur) return;
    let nextValue = cur.value;
    if (mode === 'fixed' && cur.mode === 'percent') nextValue = nextValue * 100;
    if (mode === 'percent' && cur.mode === 'fixed') nextValue = nextValue / 100;
    update(id, { mode, value: nextValue });
  };

  /* ⭐ 选择课程后自动带出单价 */
  const handleSelectCourse = (id: string, selectedName: string) => {
    const cur = courses.find((c) => c.id === id);
    if (!cur) return;

    const selectedCard = cardOptions.find(
      (opt) => String(opt.name) === selectedName
    );

    const patch: Partial<CourseCommission> = { courseName: selectedName };

    if (selectedCard?.single_price != null) {
      patch.singlePrice = Number(selectedCard.single_price);
      /* 备注为空时自动填单价，用户可改 */
      if (!cur.note) {
        patch.note = `单价 ¥${Number(selectedCard.single_price).toLocaleString()}`;
      }
    } else {
      patch.singlePrice = undefined;
    }

    update(id, patch);
  };

  return (
    <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/70 to-fuchsia-50/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-500" />
          <BookOpen className="w-3.5 h-3.5" />
          课程课提（按课程名）
          {loadingCards && (
            <span className="text-[10px] text-purple-400 font-normal ml-1">
              加载课程中…
            </span>
          )}
        </h3>
        <button
          onClick={add}
          className="text-xs font-medium text-purple-600 hover:text-purple-800 hover:bg-purple-100/70 px-2.5 py-1 rounded-lg transition flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> 添加课程
        </button>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-white/60 rounded-xl">
          <p className="text-xs text-gray-400">暂无课程课提，点击右上角添加</p>
        </div>
      ) : (
        <div className="space-y-2">
          {courses.map((c) => {
            const hasCustom =
              c.courseName &&
              !cardOptions.some((opt) => String(opt.name) === c.courseName);

            return (
              <div
                key={c.id}
                className="group flex flex-wrap items-center gap-1.5 bg-white/90 backdrop-blur rounded-xl border border-white shadow-sm hover:shadow-md px-3 py-2 text-sm transition-all"
              >
                {/* ⭐ 课程名下拉 */}
                <select
                  value={c.courseName || ''}
                  onChange={(e) => handleSelectCourse(c.id, e.target.value)}
                  disabled={loadingCards}
                  className="w-44 text-xs bg-purple-50/60 border border-purple-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 transition disabled:opacity-60"
                >
                  <option value="">
                    {loadingCards ? '加载课程中…' : '请选择课程'}
                  </option>

                  {/* 已存在但不在接口列表里的自定义课程，保留 */}
                  {hasCustom && (
                    <option value={c.courseName}>
                      {c.courseName}（自定义）
                    </option>
                  )}

                  {cardOptions.map((opt) => (
                    <option
                      key={String(opt.id ?? opt.name)}
                      value={String(opt.name)}
                    >
                      {String(opt.name)}
                      {opt.single_price != null
                        ? ` · ¥${Number(opt.single_price).toLocaleString()}`
                        : ''}
                    </option>
                  ))}
                </select>

                {/* 单价徽章 */}
                {c.singlePrice != null && (
                  <span className="text-[10px] text-purple-700 bg-purple-100/80 border border-purple-200 rounded-md px-1.5 py-0.5 whitespace-nowrap">
                    ¥{Number(c.singlePrice).toLocaleString()}
                  </span>
                )}

                <span className="text-[11px] text-purple-500 font-medium">
                  课提
                </span>

                <input
                  type="number"
                  step={c.mode === 'percent' ? '0.1' : '1'}
                  value={
                    c.mode === 'percent'
                      ? (c.value * 100).toFixed(1)
                      : c.value
                  }
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    update(c.id, {
                      value: c.mode === 'percent' ? v / 100 : v,
                    });
                  }}
                  className="w-16 text-xs bg-purple-50/60 border border-purple-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 transition"
                />

                <div className="inline-flex p-0.5 bg-purple-50/70 rounded-lg border border-purple-100">
                  <button
                    onClick={() => setMode(c.id, 'percent')}
                    className={`flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium transition ${
                      c.mode === 'percent'
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'text-purple-600 hover:bg-purple-100'
                    }`}
                    title="按比例"
                  >
                    <Percent className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setMode(c.id, 'fixed')}
                    className={`flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium transition ${
                      c.mode === 'fixed'
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'text-purple-600 hover:bg-purple-100'
                    }`}
                    title="按固定值（元/节）"
                  >
                    <Hash className="w-3 h-3" />
                  </button>
                </div>

                <span className="text-[11px] text-purple-500">
                  {c.mode === 'percent' ? '%' : '元/节'}
                </span>

                <input
                  type="text"
                  value={c.note || ''}
                  onChange={(e) => update(c.id, { note: e.target.value })}
                  placeholder="备注"
                  className="flex-1 min-w-[80px] text-xs bg-purple-50/60 border border-purple-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 transition placeholder:text-purple-200"
                />

                <button
                  onClick={() => remove(c.id)}
                  className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CourseCommissionEditor;