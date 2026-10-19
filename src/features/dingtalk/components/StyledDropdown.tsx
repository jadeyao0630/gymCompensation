import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import './dingtalkTable.css';

export interface DropdownOption { value: string; label: string; }
interface Props {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}
/** 通过 Portal 弹出，避免表格 overflow-x-auto 裁剪选项菜单。 */
export default function StyledDropdown({ value, options, onChange, disabled = false, ariaLabel, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 180, maxHeight: 280, upward: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find(o => o.value === value);
  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.max(rect.width, 176);
    const spaceBelow = window.innerHeight - rect.bottom;
    const upward = spaceBelow < 230 && rect.top > spaceBelow;
    const maxHeight = Math.max(110, Math.min(300, upward ? rect.top - 16 : spaceBelow - 16));
    setPosition({
      top: upward ? Math.max(8, rect.top - maxHeight - 5) : rect.bottom + 5,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width, maxHeight, upward,
    });
  };
  useEffect(() => {
    if (!open) return;
    updatePosition();
    const closeOnOutside = (event: MouseEvent) => {
      const node = event.target as Node;
      if (!triggerRef.current?.contains(node) && !panelRef.current?.contains(node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); } };
    const onScroll = (event: Event) => { if (panelRef.current?.contains(event.target as Node)) return; updatePosition(); };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);
  return <>
    <button
      ref={triggerRef} type="button" aria-label={ariaLabel} aria-haspopup="listbox"
      aria-expanded={open} aria-controls={open ? listId : undefined} disabled={disabled}
      onClick={() => { if (!open) updatePosition(); setOpen(!open); }}
      className={`dt-category-dropdown inline-flex h-8 max-w-full items-center justify-between gap-2 rounded-lg bg-white px-2.5 text-left text-xs text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span className="min-w-0 truncate">{selected?.label ?? '请选择'}</span>
      <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && createPortal(
      <div ref={panelRef} id={listId} role="listbox" aria-label={ariaLabel}
        style={{ position: 'fixed', top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight, zIndex: 9999 }}
        className="dt-category-menu overflow-y-auto bg-white p-1.5"
      >
        {options.map(o => <button key={o.value} type="button" role="option" aria-selected={o.value === value}
          onClick={() => { setOpen(false); onChange(o.value); }}
          data-selected={o.value === value ? "true" : "false"}
          className="dt-category-menu-item flex w-full items-center justify-between gap-2 text-left text-xs transition-colors"
        ><span className="break-words">{o.label}</span>{o.value === value && <Check className="h-3.5 w-3.5 shrink-0" />}</button>)}
      </div>, document.body
    )}
  </>;
}
