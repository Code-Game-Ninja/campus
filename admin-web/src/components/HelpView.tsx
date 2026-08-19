import { BookOpen, LifeBuoy, Mail, ShieldCheck } from 'lucide-react';

export function HelpView() {
  const topics = [
    ['Using the workspace', 'Open an accessible section, search records, export loaded tables, and use row actions for mutations.', BookOpen],
    ['Permission boundaries', 'Every workspace is scoped by the server-resolved admin assignment and campus relationship.', ShieldCheck],
    ['Need a hand?', 'Contact the CampusSphere operations team when an assignment or database workflow needs review.', LifeBuoy],
  ] as const;

  return <section className="help-page page-enter">
    <div className="section-heading"><div><span className="eyebrow">Support</span><h2>Help centre</h2><p>Quick guidance for using the connected admin workspace safely.</p></div><a className="button button-secondary" href="mailto:support@campussphere.app?subject=CampusSphere%20admin%20support"><Mail size={14} />Contact support</a></div>
    <div className="help-grid">{topics.map(([title, text, Icon]) => <article className="panel help-card" key={title}><span className="help-icon"><Icon size={18} /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
  </section>;
}
