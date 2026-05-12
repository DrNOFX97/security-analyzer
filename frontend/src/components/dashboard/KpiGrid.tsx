import { Activity, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { KpiCard } from './KpiCard';
import type { AnalysisSummary } from '../../types';

interface KpiGridProps {
  summary: AnalysisSummary | null;
}

export function KpiGrid({ summary }: KpiGridProps) {
  if (!summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-800 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Total Events"
        value={summary.total_events}
        icon={Activity}
        color="blue"
        subtitle="Analyzed"
      />
      <KpiCard
        title="CRITICAL"
        value={summary.critical_alerts}
        icon={AlertTriangle}
        color="red"
        subtitle="Alerts"
      />
      <KpiCard
        title="HIGH"
        value={summary.high_alerts}
        icon={TrendingUp}
        color="orange"
        subtitle="Alerts"
      />
      <KpiCard
        title="MEDIUM"
        value={summary.medium_alerts}
        icon={Zap}
        color="yellow"
        subtitle="Alerts"
      />
    </div>
  );
}
