import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowUpRight, Download, Plus, X } from 'lucide-react';
import { ActivityPanel, CampusMap, ProgressPanel, QuickActions, TrendChart } from './components/Charts';
import { AccountSettingsView } from './components/AccountSettingsView';
import { AuthView } from './components/AuthView';
import { DataTable } from './components/DataTable';
import { Header } from './components/Header';
import { HealthView } from './components/HealthView';
import { HelpView } from './components/HelpView';
import { MetricCard } from './components/MetricCard';
import { Modal } from './components/Modal';
import { Notifications } from './components/Notifications';
import { NotificationCenter } from './components/NotificationCenter';
import { ScopeBar } from './components/ScopeBar';
import { Sidebar } from './components/Sidebar';
import { SettingsView, type WorkspaceSettings } from './components/SettingsView';
import { StateView, type ViewState } from './components/StateView';
import { Toast } from './components/Toast';
import { navByRole, roleMeta, type Role, type WorkspaceMeta } from './data';
import { apiDelete, apiGet, apiPatch, apiPost, hasSession, signOut, tableEndpoint, type AdminContext, type DashboardData, type NotificationRecord, type TableData } from './lib/api';

type ModalKind = 'event' | 'manager' | 'campus' | 'post' | null;
type HealthData = { status: string; latencyMs: number; checkedAt: string; services: Array<{ name: string; status: string }> };

const pageCopy: Record<string, { title: string; description: string }> = {
  Overview: { title: 'Overview', description: 'Live operating data for your active permission scope.' },
  Events: { title: 'Events', description: 'Manage lifecycle, capacity, venues, and attendee-facing details.' },
  Registrations: { title: 'Registrations', description: 'Review attendee registrations and waitlist pressure.' },
  'Venues & Media': { title: 'Venues & media', description: 'Review event locations, media, and schedules.' },
  Posts: { title: 'Campus posts', description: 'Create and manage content in your campus scope.' },
  'All Content': { title: 'All content', description: 'Search platform content across the global operational scope.' },
  Moderation: { title: 'Moderation queue', description: 'Resolve reports with reason, scope, and audit context.' },
  Notifications: { title: 'Notifications', description: 'Review persistent operational and workflow updates.' },
  'Event Managers': { title: 'Event managers', description: 'Invite and manage event assignments for this campus.' },
  'Staff & Roles': { title: 'Staff and roles', description: 'Manage scoped assignments with an explicit policy boundary.' },
  Campuses: { title: 'Campus directory', description: 'Manage platform campuses and their lifecycle status.' },
  'Audit Log': { title: 'Audit log', description: 'Append-only evidence for sensitive operational actions.' },
  'Platform Health': { title: 'Platform health', description: 'Live reachability checks for core services.' },
  'Campus Settings': { title: 'Campus settings', description: 'Configure operational preferences for the assigned campus.' },
  'Platform Settings': { title: 'Platform settings', description: 'Configure global operational preferences.' },
  'Account Settings': { title: 'Account settings', description: 'Review the authenticated identity and permission assignment.' },
  Help: { title: 'Help centre', description: 'Guidance for the connected administration workspace.' },
};

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AD'; }

export function App() {
  const [context, setContext] = useState<AdminContext | null>(null);
  const [booting, setBooting] = useState(true);
  const [section, setSection] = useState('Overview');
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [toast, setToast] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [table, setTable] = useState<TableData | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);

  const role: Role = context?.role || 'campus_admin';
  const baseMeta = roleMeta[role];
  const meta: WorkspaceMeta = context ? { ...baseMeta, person: context.user.displayName, initials: initials(context.user.displayName), scope: context.campus?.name || 'All campuses', email: context.user.email } : baseMeta;
  const copy = pageCopy[section] || pageCopy.Overview;
  const heading = section === 'Overview' ? { title: `Good morning, ${meta.person.split(' ')[0]}.`, description: copy.description } : copy;
  const isListSection = Boolean(tableEndpoint(section));
  const unread = notifications.filter((item) => item.unread).length;

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(''), 4200); }
  async function loadMe() { const next = await apiGet<AdminContext>('/v1/me'); setContext(next); return next; }
  async function loadNotifications() { const result = await apiGet<{ records: NotificationRecord[] }>('/v1/notifications?limit=100'); setNotifications(result.records); }
  async function loadDashboard() { setDashboard(await apiGet<DashboardData>('/v1/dashboard')); }

  async function refreshSection(target = section) {
    if (!context) return;
    setViewState('loading'); setTable(null);
    try {
      if (target === 'Overview') await loadDashboard();
      else if (target === 'Notifications') await loadNotifications();
      else if (target === 'Platform Health') setHealth(await apiGet<HealthData>('/v1/health'));
      else if (target === 'Campus Settings' || target === 'Platform Settings') setSettings(await apiGet<WorkspaceSettings>('/v1/settings'));
      else {
        const endpoint = tableEndpoint(target);
        if (endpoint) { const result = await apiGet<TableData>(`${endpoint}?limit=100`); setTable(result); if (!result.rows.length) { setViewState('empty'); return; } }
      }
      setViewState('ready');
    } catch (error) {
      setViewState(error instanceof Error && 'status' in error && (error as { status: number }).status === 403 ? 'permission-denied' : 'error');
      notify(error instanceof Error ? error.message : 'The workspace could not load.');
    }
  }

  useEffect(() => {
    async function boot() {
      if (!hasSession()) { setBooting(false); return; }
      try { await loadMe(); } catch { await signOut(); setContext(null); }
      finally { setBooting(false); }
    }
    void boot();
  }, []);

  useEffect(() => {
    if (!context) return;
    void Promise.all([refreshSection(section), loadNotifications()]);
  }, [context?.user.id, section]);

  function navigate(next: string) { setSection(next); requestAnimationFrame(() => document.querySelector<HTMLElement>('.workspace')?.scrollTo({ top: 0, behavior: 'smooth' })); }
  async function searchWorkspace(query: string) {
    const normalized = query.trim().toLowerCase();
    const target = [...navByRole[role].map((item) => item.label), 'Account Settings', 'Help'].find((label) => label.toLowerCase().includes(normalized));
    if (target) { navigate(target); notify(`Opened ${target}.`); return; }
    try {
      const result = await apiGet<{ results: Array<{ section: string; type: string; label: string }> }>(`/v1/search?q=${encodeURIComponent(query.trim())}`);
      const first = result.results[0];
      if (first) { navigate(first.section); notify(`${first.type}: ${first.label}`); }
      else notify(`No live records match "${query.trim()}".`);
    } catch (error) { notify(error instanceof Error ? error.message : 'Search failed.'); }
  }
  async function logout() { await signOut(); setContext(null); setNotificationsOpen(false); setSection('Overview'); }

  async function readNotification(id: string) { await apiPost(`/v1/notifications/${id}/read`); await loadNotifications(); }
  async function readAllNotifications() { await apiPost('/v1/notifications/read-all'); await loadNotifications(); }
  async function saveWorkspaceSettings(next: WorkspaceSettings) { await apiPatch('/v1/settings', { displayName: next.display_name, supportEmail: next.support_email, adminNotice: next.admin_notice, digestEnabled: next.digest_enabled, moderationAlerts: next.moderation_alerts }); setSettings(next); }

  async function submitWorkflow(kind: Exclude<ModalKind, null>, values: Record<string, string>) {
    if (kind === 'event') await apiPost('/v1/events', { title: values.title, description: values.description, summary: values.description, startsAt: new Date(values.startsAt).toISOString(), endsAt: new Date(values.endsAt).toISOString(), venueName: values.venueName, capacity: values.capacity });
    if (kind === 'manager') await apiPost('/v1/staff/invite', { email: values.email, role: values.role || 'event_manager', campusId: context?.campusId });
    if (kind === 'campus') await apiPost('/v1/campuses', { name: values.name, slug: values.slug, countryCode: values.countryCode || 'IN' });
    if (kind === 'post') await apiPost('/v1/posts', { body: values.body, visibility: values.visibility || 'campus' });
    setModal(null); notify(`${kind[0].toUpperCase()}${kind.slice(1)} workflow completed.`); await Promise.all([refreshSection(section), loadDashboard()]);
  }

  async function rowAction(index: number) {
    const record = table?.records[index] as Record<string, string> | undefined;
    if (!record?.id) return;
    try {
      if (section === 'Posts' || section === 'All Content') {
        const status = window.prompt('Set post status: published, hidden, removed', record.status || 'published');
        if (status) await apiPatch(`/v1/posts/${record.id}/status`, { status });
      } else if (section === 'Moderation') {
        const action = window.prompt('Moderation action: dismiss, hide, remove, warn, escalate, restore', 'dismiss');
        if (action) await apiPatch(`/v1/moderation/${record.id}`, { action, reason: window.prompt('Reason for the audit log') || action });
      } else if (section === 'Events' || section === 'Venues & Media') {
        const status = window.prompt('Set event status: draft, published, cancelled, completed', record.status || 'draft');
        if (status) await apiPatch(`/v1/events/${record.id}/status`, { status });
      } else if (section === 'Event Managers' || section === 'Staff & Roles') {
        if (window.confirm(`Revoke the ${record.role} assignment for ${record.person}?`)) await apiDelete(`/v1/staff/${record.id}`);
      } else if (section === 'Campuses') {
        const status = record.status === 'active' ? 'inactive' : 'active';
        if (window.confirm(`Set ${record.name} to ${status}?`)) await apiPatch(`/v1/campuses/${record.id}/status`, { status });
      } else { notify('This record is read-only.'); return; }
      notify('Change saved and recorded in the audit log.'); await Promise.all([refreshSection(section), loadDashboard()]);
    } catch (error) { notify(error instanceof Error ? error.message : 'The action could not be completed.'); }
  }

  function exportTable() {
    if (!table?.rows.length) { notify('There is no loaded table data to export.'); return; }
    const csv = [table.columns, ...table.rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = `${section.toLowerCase().replace(/\s+/g, '-')}.csv`; link.click(); URL.revokeObjectURL(url);
  }

  const primary = useMemo(() => {
    if (section === 'Events' && ['event_manager', 'campus_admin'].includes(role)) return { label: 'New event', kind: 'event' as const };
    if (section === 'Posts' && ['campus_admin', 'super_admin'].includes(role)) return { label: 'New post', kind: 'post' as const };
    if ((section === 'Event Managers' || section === 'Staff & Roles') && ['campus_admin', 'super_admin'].includes(role)) return { label: 'Invite staff', kind: 'manager' as const };
    if (section === 'Campuses' && role === 'super_admin') return { label: 'Add campus', kind: 'campus' as const };
    return null;
  }, [role, section]);

  if (booting) return <main className="auth-shell"><div className="state-layout"><div className="skeleton hero-skeleton" /></div></main>;
  if (!context) return <AuthView onAuthenticated={async () => { await loadMe(); setBooting(false); }} />;

  function mainContent() {
    if (viewState !== 'ready') return <StateView state={viewState} onReset={() => void refreshSection(section)} />;
    if (section === 'Overview') return <Overview role={role} dashboard={dashboard} onNavigate={navigate} onAction={notify} />;
    if (section === 'Notifications') return <NotificationCenter items={notifications} onRead={readNotification} onReadAll={readAllNotifications} onAction={notify} />;
    if (section === 'Platform Health') return <HealthView role={role} data={health} onRefresh={async () => setHealth(await apiGet<HealthData>('/v1/health'))} onAction={notify} />;
    if (section === 'Help') return <HelpView onAction={notify} />;
    if (section === 'Account Settings') return <AccountSettingsView role={role} meta={meta} onAction={notify} />;
    if (section === 'Campus Settings' || section === 'Platform Settings') return <SettingsView scope={meta.scope} settings={settings} onSave={saveWorkspaceSettings} onAction={notify} />;
    if (table) return <DataTable title={copy.title} description={copy.description} scope={meta.scope} columns={table.columns} rows={table.rows} primaryAction={primary?.label} onPrimary={primary ? () => setModal(primary.kind) : undefined} onRowAction={rowAction} onAction={notify} />;
    return <StateView state="empty" onReset={() => void refreshSection(section)} />;
  }

  return <div className="app-shell"><div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <Sidebar role={role} meta={meta} active={section} onNavigate={navigate} onSignOut={() => void logout()} />
    <main className="main-content"><Header role={role} meta={meta} onSearch={searchWorkspace} onAccountSettings={() => navigate('Account Settings')} onNotifications={() => setNotificationsOpen(true)} onSignOut={() => void logout()} unread={unread} />
      <div className={`workspace ${section === 'Overview' ? 'workspace-overview' : ''} ${isListSection ? 'workspace-list' : ''}`}>
        {section !== 'Overview' && <div className="breadcrumb"><button onClick={() => navigate('Overview')}>Overview</button><span>/</span><strong>{section}</strong></div>}
        <ScopeBar role={role} meta={meta} onAction={notify} />
        <div className="page-heading"><div><span className="eyebrow">{meta.scope}</span><h1>{heading.title}</h1><p>{heading.description}</p></div><div className="heading-actions"><button className="button button-secondary" onClick={exportTable}><Download size={14} />Export</button>{section === 'Overview' && <button className="button button-primary" onClick={() => setModal(role === 'event_manager' ? 'event' : role === 'super_admin' ? 'campus' : 'manager')}><Plus size={14} />{role === 'event_manager' ? 'New event' : role === 'super_admin' ? 'Add campus' : 'Invite manager'}</button>}</div></div>
        <div className="page-transition" key={`${role}-${section}`}>{mainContent()}</div>
      </div>
    </main>
    {notificationsOpen && <Notifications items={notifications} onClose={() => setNotificationsOpen(false)} onRead={async (id) => { await readNotification(id); setNotificationsOpen(false); }} onReadAll={readAllNotifications} onViewAll={() => { setNotificationsOpen(false); navigate('Notifications'); }} />}
    {toast && <Toast message={toast} onClose={() => setToast('')} />}
    {modal && <WorkflowModal kind={modal} role={role} onClose={() => setModal(null)} onSubmit={submitWorkflow} />}
  </div>;
}

function Overview({ role, dashboard, onNavigate, onAction }: { role: Role; dashboard: DashboardData | null; onNavigate: (label: string) => void; onAction: (message: string) => void }) {
  const metrics = dashboard?.metrics || [];
  return <section className="overview page-enter"><div className="metrics-grid">{metrics.map((metric, index) => <MetricCard metric={metric} index={index} key={metric.label} />)}</div><div className="analytics-grid"><TrendChart role={role} value={metrics[0]?.display || '0'} onAction={onAction} /><ProgressPanel role={role} value={dashboard?.health.value} onAction={onAction} />{role === 'super_admin' && <CampusMap onAction={onAction} />}</div><div className="operations-grid"><ActivityPanel items={dashboard?.activity} onAction={onAction} /><QuickActions role={role} onNavigate={onNavigate} onAction={onAction} /></div></section>;
}

function WorkflowModal({ kind, role, onClose, onSubmit }: { kind: Exclude<ModalKind, null>; role: Role; onClose: () => void; onSubmit: (kind: Exclude<ModalKind, null>, values: Record<string, string>) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const titles = { event: 'Create event draft', manager: 'Invite admin staff', campus: 'Add campus', post: 'Create campus post' };
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); try { const values = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>; await onSubmit(kind, values); } finally { setBusy(false); } }
  return <Modal title={titles[kind]} description="This workflow writes to the shared CampusSphere database and records sensitive actions." onClose={onClose}><form onSubmit={submit}><div className="form-fields">
    {kind === 'event' && <><label><span>Event name</span><input name="title" required /></label><label><span>Venue</span><input name="venueName" /></label><label><span>Starts</span><input name="startsAt" type="datetime-local" required /></label><label><span>Ends</span><input name="endsAt" type="datetime-local" required /></label><label><span>Capacity</span><input name="capacity" type="number" min="1" /></label><label className="field-wide"><span>Description</span><textarea name="description" rows={4} required /></label></>}
    {kind === 'manager' && <><label><span>Work email</span><input name="email" type="email" required /></label><label><span>Role</span><select name="role" defaultValue={role === 'super_admin' ? 'campus_admin' : 'event_manager'}><option value="event_manager">Event Manager</option>{role === 'super_admin' && <option value="campus_admin">Campus Admin</option>}{role === 'super_admin' && <option value="super_admin">Super Admin</option>}</select></label></>}
    {kind === 'campus' && <><label><span>Campus name</span><input name="name" required /></label><label><span>Slug</span><input name="slug" pattern="[a-z0-9-]+" required /></label><label><span>Country code</span><input name="countryCode" defaultValue="IN" maxLength={2} required /></label></>}
    {kind === 'post' && <><label className="field-wide"><span>Post content</span><textarea name="body" rows={5} required maxLength={2000} /></label><label><span>Visibility</span><select name="visibility" defaultValue="campus"><option value="campus">Campus</option><option value="global">Global</option></select></label></>}
  </div><div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}><X size={14} />Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}<ArrowUpRight size={14} /></button></div></form></Modal>;
}
