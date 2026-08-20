import { Check, Filter, MoreHorizontal, Search, SlidersHorizontal } from 'lucide-react';
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

const STATUS_FILTERS = ['all', 'active', 'pending', 'published', 'draft', 'hidden', 'removed', 'deleted', 'reviewing', 'open', 'resolved', 'registered', 'waitlisted', 'attended', 'revoked', 'cancelled', 'completed', 'inactive'];

export function DataTable({ title, description, scope, columns, rows, primaryAction, onPrimary, onAction, onRowAction, filterValue = 'all', onFilterChange, showAllRows = false }: { title: string; description: string; scope: string; columns: string[]; rows: string[][]; primaryAction?: string; onPrimary?: () => void; onAction: (message: string) => void; onRowAction?: (index: number) => void; filterValue?: string; onFilterChange?: (value: string) => void | Promise<void>; showAllRows?: boolean }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const statusColumn = columns.findIndex((column) => column.toLowerCase() === 'status');
  const filtered = useMemo(() => rows.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase()) && (filterValue === 'all' || statusColumn < 0 || row[statusColumn]?.toLowerCase() === filterValue)), [filterValue, query, rows, statusColumn]);
  const visibleColumns = useMemo(() => columns.map((column, index) => ({ column, index })).filter(({ column }) => !hiddenColumns.includes(column)), [columns, hiddenColumns]);
  const pageSize = showAllRows ? Math.max(filtered.length, 1) : PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const firstRecord = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const lastRecord = Math.min(safePage * pageSize, filtered.length);

  useEffect(() => {
    setPage(1);
  }, [query]);

  return <section className={`data-page page-enter ${showAllRows ? 'data-page-show-all' : ''}`}>
    <div className="panel table-panel">
      <div className="table-toolbar">
        <label className="table-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} aria-label={`Search ${title}`} /></label>
        <div className="table-actions">
          {primaryAction && <button className="button button-primary" onClick={onPrimary}>{primaryAction}</button>}
          {statusColumn >= 0 && <div className="table-menu-wrap"><button className={`button button-secondary ${filterValue !== 'all' ? 'is-active' : ''}`} onClick={() => { setFilterOpen((open) => !open); setColumnsOpen(false); }}><Filter size={14} />{filterValue === 'all' ? 'Filter' : `Status: ${filterValue}`}</button>{filterOpen && <div className="table-menu" role="menu"><strong>Status</strong>{STATUS_FILTERS.map((status) => <button key={status} role="menuitem" className={filterValue === status ? 'selected' : ''} onClick={() => { void onFilterChange?.(status); setFilterOpen(false); setPage(1); }}>{status === 'all' ? 'All statuses' : status}{filterValue === status && <Check size={14} />}</button>)}</div>}</div>}
          <div className="table-menu-wrap"><button className="icon-button" onClick={() => { setColumnsOpen((open) => !open); setFilterOpen(false); }} aria-label="Configure columns" title="Configure columns"><SlidersHorizontal size={16} /></button>{columnsOpen && <div className="table-menu table-menu-columns" role="menu"><strong>Columns</strong>{columns.map((column) => { const hidden = hiddenColumns.includes(column); const lastVisible = !hidden && visibleColumns.length === 1; return <button key={column} role="menuitem" disabled={lastVisible} onClick={() => setHiddenColumns((current) => hidden ? current.filter((item) => item !== column) : [...current, column])}><span className={hidden ? 'column-off' : 'column-on'}>{hidden ? ' ' : <Check size={14} />}</span>{column}</button>; })}</div>}</div>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">{title}. {description} Scope: {scope}.</caption>
          <thead><tr>{visibleColumns.map(({ column }) => <th key={column}>{column}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{visibleRows.map((row, index) => { const recordIndex = rows.indexOf(row); return <tr key={`${row[0]}-${(safePage - 1) * pageSize + index}`}>{visibleColumns.map(({ index: cellIndex }) => { const cell = row[cellIndex]; return <td key={`${cell}-${cellIndex}`}>{cellIndex === statusColumn ? <span className={`status-pill ${statusTone(cell)}`}><i />{cell}</span> : cell}</td>; })}<td><button className="row-button" onClick={() => onRowAction ? onRowAction(recordIndex) : onAction(`Opened ${row[0]}.`)} aria-label={`Open actions for ${row[0]}`}><MoreHorizontal size={17} /></button></td></tr>; })}</tbody>
        </table>
        {filtered.length === 0 && <div className="table-empty"><Search size={22} /><strong>No matching results</strong><span>Try a shorter name, status, or owner.</span></div>}
      </div>
      <div className="table-footer">
        <span>{filtered.length === 0 ? 'No records' : `Showing ${firstRecord}-${lastRecord} of ${filtered.length} records`}</span>
        {!showAllRows && <nav className="pagination" aria-label={`${title} pagination`}>
          <button disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
          {pageItems(safePage, pageCount).map((item, index) => item === 'ellipsis' ? <span className="pagination-ellipsis" key={`ellipsis-${index}`}>...</span> : <button key={item} className={safePage === item ? 'active' : ''} aria-current={safePage === item ? 'page' : undefined} onClick={() => setPage(item)}>{item}</button>)}
          <button disabled={safePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button>
        </nav>}
      </div>
    </div>
  </section>;
}
