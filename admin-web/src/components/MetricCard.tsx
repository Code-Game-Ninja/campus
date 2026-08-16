import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { Metric } from '../data';
import { AnimatedNumber } from './AnimatedNumber';

export function MetricCard({ metric, index }: { metric: Metric; index: number }) {
  const positive = metric.delta.startsWith('+') || metric.delta === 'Operational';
  const neutral = metric.delta === 'Operational' || metric.delta.includes('pending') || metric.delta.includes('urgent');
  return <article className={`metric-card tone-${metric.tone}`} style={{ '--delay': `${index * 65}ms` } as React.CSSProperties}>
    <div className="metric-top"><span>{metric.label}</span><span className="metric-spark" aria-hidden="true"><i /><i /><i /><i /><i /></span></div>
    <strong className="metric-value"><AnimatedNumber value={metric.value} display={metric.display} /></strong>
    <div className="metric-bottom"><span className={`metric-delta ${neutral ? 'neutral' : positive ? 'positive' : 'negative'}`}>{neutral ? <Minus size={12} /> : positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{metric.delta}</span><span>{metric.context}</span></div>
  </article>;
}
