import React from 'react';
import { Plus, Trash2, Percent, Hash, BookOpen } from 'lucide-react';
import type { CourseCommission, ClassCommissionMode } from '../types/compensation';
import { uid } from '../utils/id';

interface CourseCommissionEditorProps {
  courses: CourseCommission[];
  onChange: (courses: CourseCommission[]) => void;
}

const CourseCommissionEditor: React.FC<CourseCommissionEditorProps> = ({
  courses,
  onChange,
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

  return (
    <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/70 to-fuchsia-50/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-purple-900 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gradient-to-br from-purple-400 to-fuchsia-500" />
          <BookOpen className="w-3.5 h-3.5" />
          课程课提（按课程名）
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
          {courses.map((c) => (
            <div
              key={c.id}
              className="group flex flex-wrap items-center gap-1.5 bg-white/90 backdrop-blur rounded-xl border border-white shadow-sm hover:shadow-md px-3 py-2 text-sm transition-all"
            >
              <input
                type="text"
                value={c.courseName}
                onChange={(e) => update(c.id, { courseName: e.target.value })}
                placeholder="课程名（如：私教课）"
                className="w-32 text-xs bg-purple-50/60 border border-purple-100 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-400 transition"
              />
              <span className="text-[11px] text-purple-500 font-medium">课提</span>
              <input
                type="number"
                step={c.mode === 'percent' ? '0.1' : '1'}
                value={
                  c.mode === 'percent' ? (c.value * 100).toFixed(1) : c.value
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
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseCommissionEditor;
