import { useRef } from 'react';
import { FlaskConical } from 'lucide-react';
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
  const isDemoMode = useAnalysisStore((s) => s.isDemoMode);
  const loadDemo = useAnalysisStore((s) => s.loadDemo);
  const reset = useAnalysisStore((s) => s.reset);
  const { info } = useSystemInfo();
  const runPanelRef = useRef<HTMLDivElement>(null);

  const scrollToRunPanel = () => {
    runPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    runPanelRef.current?.querySelector('button')?.focus();
  };

  return (
    <div className="space-y-6">
      <StatusBanner info={info || null} />

      {isDemoMode && (
        <div className="flex items-center justify-between bg-purple-900/30 border border-purple-700 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-purple-300 text-sm">
            <FlaskConical className="w-4 h-4" />
            <span>Modo Demo — dados de exemplo. O backend não está disponível.</span>
          </div>
          <button
            onClick={reset}
            className="text-xs text-purple-400 hover:text-purple-200 underline"
          >
            Limpar
          </button>
        </div>
      )}

      <div ref={runPanelRef}>
        <RunAnalysisPanel />
      </div>
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
          action={{ label: 'Executar Análise', onClick: scrollToRunPanel }}
          secondaryAction={{ label: 'Ver Demo', onClick: loadDemo }}
        />
      )}
    </div>
  );
}
