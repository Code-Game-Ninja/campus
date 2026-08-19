import { ArrowUpRight, Database, LockKeyhole } from 'lucide-react';
import type { Role, WorkspaceMeta } from '../data';

export function ScopeBar({ role: _role, meta, onNavigate }: { role: Role; meta: WorkspaceMeta; onNavigate: (label: string) => void }) {
  return <div className="scope-bar">
    <div className="scope-bar-main"><span className="scope-icon"><LockKeyhole size={15} /></span><span><span className="eyebrow">Permission context</span><strong>{meta.scope}</strong></span></div>
    <div className="scope-bar-note"><Database size={14} /><span>Shared Supabase database</span><span className="divider-dot" /><span>Server-enforced scope</span></div>
    <button className="scope-link" onClick={() => onNavigate('Account Settings')}>View policy <ArrowUpRight size={14} /></button>
  </div>;
}
