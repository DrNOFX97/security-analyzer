import { useAnalysisStore } from '../store/analysisStore';
import { useSystemInfo } from '../hooks/useSystemInfo';
import { RunAnalysisPanel } from '../components/analysis/RunAnalysisPanel';
import { ProgressStream } from '../components/analysis/ProgressStream';
import { StatusBanner } from '../components/shared/StatusBanner';
import { KpiGrid } from '../components/dashboard/KpiGrid';
import { AlertsTimeline } from '../components/dashboard/AlertsTimeline';
import { SeverityBreakdown } from '../components/dashboard/SeverityBreakdown';
import { EmptyState } from '../components/shared/EmptyState';

export function DashboardPage() {
  const result = useAnalysisStore((s) => s.result);
  const { info } = useSystemInfo();

  return (
    <div className="space-y-6">
      <StatusBanner info={info || null} />
      <RunAnalysisPanel />
      <ProgressStream />

      {result ? (
        <>
          <KpiGrid summary={result.summary} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AlertsTimeline />
            <SeverityBreakdown />
          </div>
        </>
      ) : (
        <EmptyState
          title="Nenhuma Análise Realizada"
          description="Execute uma análise para ver resultados e gráficos"
          action={{ label: 'Executar Análise', onClick: () => {} }}
        />
      )}
    </div>
  );
}
