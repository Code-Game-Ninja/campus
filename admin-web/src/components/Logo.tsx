export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="brand">
    {!compact && <span><strong>Cloud-Campus</strong><small>Operations console</small></span>}
    {compact && <strong>Cloud-Campus</strong>}
  </div>;
}
