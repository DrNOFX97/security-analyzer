import { CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { useAnalysisStore } from '../../store/analysisStore';
import { Spinner } from '../shared/Spinner';

export function ProgressStream() {
  const { isRunning, progress, error, result } = useAnalysisStore();

  if (!isRunning && !error && progress.length === 0) {
    return null;
  }

  const totalEvents = progress.reduce((sum, p) => sum + (p.count || 0), 0);

  // Get only the latest progress event (consolidate duplicates)
  const latestProgress = progress.length > 0 ? progress[progress.length - 1] : null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-yellow-400" />
        {isRunning ? '⚡ Análise em Progresso' : error ? '❌ Falha na Análise' : '✅ Análise Concluída'}
      </h3>

      {isRunning && (
        <div className="bg-cyan-900/30 border border-cyan-700 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Spinner />
            <span className="text-cyan-300 font-semibold">A Processar</span>
          </div>
          <p className="text-cyan-200 text-sm">
            📊 Eventos processados: <span className="font-bold text-cyan-400">{totalEvents.toLocaleString()}</span>
          </p>
          <p className="text-cyan-200 text-sm">
            ⏱️ A analisar o seu sistema para ameaças de segurança...
          </p>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto min-h-32">
        {latestProgress && (
          <div className="flex items-start gap-3 text-sm">
            <div className="mt-1">
              {latestProgress.pct === 100 ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
              )}
            </div>
            <div className="flex-1">
              <div className="bg-gray-800/50 rounded p-2 mb-2 overflow-visible">
                <p className="text-gray-300 break-words whitespace-pre-wrap text-xs font-mono leading-tight">
                  {latestProgress.stage === 'reading' ? (
                    <>
                      📖 Leitura: {latestProgress.channel}
                      {latestProgress.count ? (
                        <span className="text-cyan-400">{'\n'}({latestProgress.count} eventos)</span>
                      ) : (
                        <span className="text-gray-500">{'\n'}(a digitalizar...)</span>
                      )}
                    </>
                  ) : latestProgress.stage === 'analyzing' ? (
                    <>
                      🔍 Análise: {latestProgress.detector}
                      {latestProgress.count ? (
                        <span className="text-cyan-400">{'\n'}({latestProgress.count} alertas)</span>
                      ) : null}
                    </>
                  ) : (
                    <>
                      🏁 Finalização: {latestProgress.detector}
                    </>
                  )}
                </p>
              </div>

              <div className="mt-1 w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${latestProgress.pct}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{latestProgress.pct}% concluído</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {progress.length === 0 && isRunning && (
          <div className="text-center py-8">
            <Spinner />
            <p className="text-gray-400 text-sm mt-4">⏳ A iniciar análise...</p>
          </div>
        )}

        {!isRunning && !error && result && (
          <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 mt-6">
            <h4 className="text-green-400 font-semibold mb-2 flex items-center justify-between">
              ✅ Análise Concluída com Sucesso
              <a href="/alerts" className="text-xs bg-cyan-600 hover:bg-cyan-700 px-3 py-1 rounded text-white">
                Ver Todos os Alertas →
              </a>
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-green-300 mb-4">
              <div>
                <p className="text-gray-400">📊 Total de Eventos Analisados</p>
                <p className="text-xl font-bold text-cyan-400">{(result.summary?.total_events || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-400">🚨 Alertas Críticos</p>
                <p className="text-xl font-bold text-red-400">{result.summary?.critical_alerts || 0}</p>
              </div>
              <div>
                <p className="text-gray-400">⚠️ Alertas de Prioridade Alta</p>
                <p className="text-xl font-bold text-orange-400">{result.summary?.high_alerts || 0}</p>
              </div>
              <div>
                <p className="text-gray-400">📈 Nível de Risco Geral</p>
                <p className="text-xl font-bold text-yellow-400">{result.summary?.overall_risk || 'Desconhecido'}</p>
              </div>
              <div>
                <p className="text-gray-400">⏱️ Duração da Análise</p>
                <p className="text-xl font-bold text-blue-400">{result.duration_seconds}s</p>
              </div>
              <div>
                <p className="text-gray-400">📁 Fonte de Dados</p>
                <p className="text-xl font-bold text-purple-400">{result.source === 'eventlog' ? '🔐 Registos de Eventos' : '📄 CSV'}</p>
              </div>
            </div>
            <div className="bg-orange-900/20 border border-orange-700 rounded p-3 text-sm text-orange-300">
              <p className="font-semibold">🎯 Recomendação:</p>
              <p>Revise imediatamente os {result.summary?.high_alerts || 0} alertas de prioridade alta detectados. Clique em "Ver Todos os Alertas" para analisar os eventos em detalhe.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
