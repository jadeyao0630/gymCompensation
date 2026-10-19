import React from 'react';
import StyledDropdown from './components/StyledDropdown';
import { MANUAL_CATEGORIES } from './manualCategory';
interface Props { processInstanceId: string; category: string | null; automaticCategory: string; disabled?: boolean; onChange: (category: string | null) => Promise<void> | void; }
export default function CategoryAssignCell({ processInstanceId, category, automaticCategory, disabled, onChange }: Props) {
  return <StyledDropdown
    ariaLabel="调整流程分类"
    className="w-[160px]"
    disabled={disabled || !processInstanceId || processInstanceId.startsWith('__row_')}
    value={category || ''}
    options={[{ value: '', label: `自动（${automaticCategory}）` }, ...MANUAL_CATEGORIES.map(c => ({ value: c, label: c }))]}
    onChange={v => void onChange(v || null)}
  />;
}
