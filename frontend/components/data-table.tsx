'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Column<T> = {
  key: keyof T;
  label: string;
};

type XlsxLike = {
  utils: {
    json_to_sheet: (data: unknown[]) => unknown;
    book_new: () => unknown;
    book_append_sheet: (workbook: unknown, worksheet: unknown, name: string) => void;
  };
  writeFile: (workbook: unknown, fileName: string) => void;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  title,
  pageSize = 8,
  actions,
}: {
  rows: T[];
  columns: Array<Column<T>>;
  title: string;
  pageSize?: number;
  actions?: (row: T) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof T>(columns[0]?.key);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filtered = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return rows.filter((row) => !lowered || columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(lowered)));
  }, [rows, columns, query]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const av = String(a[sortKey] ?? '');
    const bv = String(b[sortKey] ?? '');
    return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  }), [filtered, sortKey, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  async function exportExcel() {
    try {
      const importer = new Function('m', 'return import(m)') as (m: string) => Promise<XlsxLike>;
      const XLSX = await importer('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(filtered);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, title.slice(0, 28) || 'Sheet1');
      XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
      return;
    } catch {
      const header = columns.map((c) => String(c.label)).join(',');
      const csvRows = filtered.map((row) => columns.map((c) => JSON.stringify(String(row[c.key] ?? ''))).join(','));
      const blob = new Blob([[header, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_').toLowerCase()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 overflow-x-auto">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <div className="flex gap-2">
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search..." className="rounded bg-black/30 px-3 py-1 text-sm" />
          <Button variant="secondary" onClick={exportExcel}>Export Excel</Button>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} className="cursor-pointer text-left" onClick={() => {
                if (sortKey === column.key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else { setSortKey(column.key); setSortOrder('asc'); }
              }}>
                {column.label} {sortKey === column.key ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
            ))}
            {actions ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {paginated.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              {columns.map((column) => <td key={String(column.key)} className="py-2 pr-2">{String(row[column.key] ?? '')}</td>)}
              {actions ? <td className="py-2">{actions(row)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
        <span className="text-xs text-slate-300">{page}/{totalPages}</span>
        <Button variant="secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
      </div>
    </div>
  );
}
