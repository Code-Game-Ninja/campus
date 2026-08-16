import { Filter, MoreHorizontal, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 5;

function statusTone(value: string) {
  const normalized = value.toLowerCase();
  if (['published', 'active', 'healthy', 'recorded'].some((term) => normalized.includes(term))) return 'success';
  if (['review', 'pending', 'waitlist', 'onboarding', 'attention'].some((term) => normalized.includes(term))) return 'warning';
  if (['escalated', 'failed', 'suspended'].some((term) => normalized.includes(term))) return 'danger';
  return 'neutral';
}

function pageItems(page: number, pageCount: number): Array<number | 'ellipsis'> {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1);
  if (page <= 3) return [1, 2, 3, 4, 'ellipsis', pageCount];
  if (page >= pageCount - 2) return [1, 'ellipsis', pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', pageCount];
}

export function DataTable({ title, description, scope, columns, rows, primaryAction, onPrimary, onAction, onRowAction }: { title: string; description: string; scope: string; columns: string[]; rows: string[][]; primaryAction?: string; onPrimary?: () => void; onAction: (message: string) => void; onRowAction?: (index: number) => void }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => rows.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase())), [query, rows]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const firstRecord = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const lastRecord = Math.min(safePage * PAGE_SIZE, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [query]);

  return <section className="data-page page-enter">
    <div className="panel table-panel">
      <div className="table-toolbar">
        <label className="table-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title}`} /></label>
        <div className="table-actions">
          {primaryAction && <button className="button button-primary" onClick={onPrimary}>{primaryAction}</button>}
          <button className="button button-secondary" onClick={() => onAction('Filters are ready for API-backed data.')}><Filter size={14} />Filter</button>
          <button className="icon-button" onClick={() => onAction('Column preferences saved locally.')} aria-label="Configure columns"><SlidersHorizontal size={16} /></button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">{title}. {description} Scope: {scope}.</caption>
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{visibleRows.map((row, index) => { const recordIndex = filtered.indexOf(row); return <tr key={`${row[0]}-${(safePage - 1) * PAGE_SIZE + index}`}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cellIndex === row.length - 1 ? <span className={`status-pill ${statusTone(cell)}`}><i />{cell}</span> : cell}</td>)}<td><button className="row-button" onClick={() => onRowAction ? onRowAction(recordIndex) : onAction(`Opened ${row[0]}.`)} aria-label={`Open actions for ${row[0]}`}><MoreHorizontal size={17} /></button></td></tr>; })}</tbody>
        </table>
        {filtered.length === 0 && <div className="table-empty"><Search size={22} /><strong>No matching results</strong><span>Try a shorter name, status, or owner.</span></div>}
      </div>
      <div className="table-footer">
        <span>{filtered.length === 0 ? 'No records' : `Showing ${firstRecord}-${lastRecord} of ${filtered.length} records`}</span>
        <nav className="pagination" aria-label={`${title} pagination`}>
          <button disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
          {pageItems(safePage, pageCount).map((item, index) => item === 'ellipsis' ? <span className="pagination-ellipsis" key={`ellipsis-${index}`}>...</span> : <button key={item} className={safePage === item ? 'active' : ''} aria-current={safePage === item ? 'page' : undefined} onClick={() => setPage(item)}>{item}</button>)}
          <button disabled={safePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button>
        </nav>
      </div>
    </div>
  </section>;
}
