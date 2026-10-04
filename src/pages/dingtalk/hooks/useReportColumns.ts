import { useState } from 'react';
import {
  COLUMNS,
  COLUMN_STORAGE_KEY,
  type ColumnKey,
} from '../utils/constants';

function loadVisibleColumns(): Set<ColumnKey> {
  try {
    const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (saved) {
      const arr = JSON.parse(saved) as ColumnKey[];
      if (Array.isArray(arr) && arr.length > 0) return new Set(arr);
    }
  } catch {
    /* ignore */
  }
  return new Set(COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key));
}

function saveVisibleColumns(set: Set<ColumnKey>) {
  try {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

export function useReportColumns() {
  const [visibleColumns, setVisibleColumns] =
    useState<Set<ColumnKey>>(loadVisibleColumns);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveVisibleColumns(next);
      return next;
    });
  };

  const resetColumns = () => {
    const set = new Set(
      COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)
    );
    setVisibleColumns(set);
    saveVisibleColumns(set);
  };

  const isColVisible = (key: ColumnKey) => visibleColumns.has(key);

  return { visibleColumns, toggleColumn, resetColumns, isColVisible };
}