import { AlertTriangle, FileSearch, LoaderCircle, LockKeyhole, RotateCcw } from 'lucide-react';

export type ViewState = 'ready' | 'loading' | 'empty' | 'error' | 'permission-denied';

export function StateView({ state, onReset }: { state: Exclude<ViewState, 'ready'>; onReset: () => void }) {
  if (state === 'loading') return <div className="state-layout" aria-label="Loading dashboard"><div className="skeleton hero-skeleton" /><div className="skeleton-grid"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div><div className="skeleton-wide"><div className="skeleton" /><div className="skeleton" /></div></div>;
  const copy = state === 'empty' ? { icon: FileSearch, title: 'Nothing in this scope yet', text: 'The shared database has no matching records for this view.' } : state === 'error' ? { icon: AlertTriangle, title: 'The workspace could not load', text: 'The protected admin service did not return a usable response. Check the backend and retry.' } : { icon: LockKeyhole, title: 'This role cannot access the view', text: 'The active database assignment does not grant this operation.' };
  const Icon = copy.icon;
  return <section className={`state-card state-${state}`}><span className="state-icon"><Icon size={22} /></span><span className="eyebrow">Workspace state</span><h2>{copy.title}</h2><p>{copy.text}</p><button className="button button-primary" onClick={onReset}>{state === 'error' ? <RotateCcw size={14} /> : <LoaderCircle size={14} />}Retry</button></section>;
}
