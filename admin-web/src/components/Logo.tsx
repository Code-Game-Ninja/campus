export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="brand">
    <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
    {!compact && <span><strong>CampusSphere</strong><small>Operations console</small></span>}
  </div>;
}
