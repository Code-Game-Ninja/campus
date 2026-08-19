import { RefreshCcw, UserRound } from 'lucide-react';
import { useState } from 'react';
import type { Role, WorkspaceMeta } from '../data';

export function AccountSettingsView({ role: _role, meta, onRefresh }: { role: Role; meta: WorkspaceMeta; onRefresh: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function refresh() { setBusy(true); try { await onRefresh(); } finally { setBusy(false); } }
  return <section className="settings-page page-enter">
    <div className="section-heading"><div><span className="eyebrow">Personal workspace</span><h2>Account settings</h2><p>Identity and permission details are resolved from the shared CampusSphere database.</p></div><button className="button button-primary" onClick={() => void refresh()} disabled={busy}><RefreshCcw size={14} />{busy ? 'Refreshing...' : 'Refresh identity'}</button></div>
    <article className="panel settings-form"><div className="form-section"><div><span className="policy-icon"><UserRound size={19} /></span><h3>Profile details</h3><p>Information shown in the active admin workspace.</p></div><div className="form-fields"><label><span>Display name</span><input value={meta.person} readOnly /></label><label><span>Role</span><input value={meta.label} readOnly /></label><label className="field-wide"><span>Workspace scope</span><input value={meta.scope} readOnly /></label></div></div></article>
  </section>;
}
