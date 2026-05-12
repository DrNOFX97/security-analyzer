import { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import { useRunAnalysis } from '../../hooks/useAnalysis';
import { useSystemInfo } from '../../hooks/useSystemInfo';
import type { AnalysisSource } from '../../types';

export function RunAnalysisPanel() {
  const { run, isRunning } = useRunAnalysis();
  const { info } = useSystemInfo();
  const [source, setSource] = useState<AnalysisSource>('csv');
  const [csvPath, setCsvPath] = useState('logs.csv');
  const [hours, setHours] = useState(24);

  // Set Windows Event Log as default when info is available and admin
  useEffect(() => {
    if (info && info.is_admin && info.platform === 'windows') {
      setSource('eventlog');
    }
  }, [info]);

  const handleRun = () => {
    if (source === 'eventlog' && !info?.is_admin) {
      alert('Administrator privileges required for Event Log analysis');
      return;
    }
    run(source, csvPath, hours);
  };

  const isEventLogAvailable = info?.is_admin && info?.platform === 'windows';
  const showAdminWarning = !isEventLogAvailable && info?.platform === 'windows';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4">Executar Análise</h3>

      <div className="space-y-4">
        {/* Source Selection */}
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 block">Fonte de Dados</label>
          <div className="space-y-2">
            <div>
              <label className={`flex items-center gap-3 ${isEventLogAvailable ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                <input
                  type="radio"
                  value="eventlog"
                  checked={source === 'eventlog'}
                  onChange={(e) => setSource(e.target.value as AnalysisSource)}
                  disabled={!isEventLogAvailable}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-400">🔐 Registos de Eventos Windows <span className="text-cyan-400 text-xs">(Recomendado)</span></span>
              </label>
              {showAdminWarning && (
                <p className="text-xs text-red-400 mt-1 ml-6">Requer privilégios de Administrador</p>
              )}
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                value="csv"
                checked={source === 'csv'}
                onChange={(e) => setSource(e.target.value as AnalysisSource)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-400">📄 Ficheiro CSV</span>
            </label>
          </div>
        </div>

        {/* CSV Path */}
        {source === 'csv' && (
          <div>
            <label htmlFor="csv-path" className="text-sm font-medium text-gray-300 mb-2 block">
              Caminho do Ficheiro CSV
            </label>
            <input
              id="csv-path"
              type="text"
              value={csvPath}
              onChange={(e) => setCsvPath(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-cyan-600"
              placeholder="logs.csv"
            />
          </div>
        )}

        {/* Hours */}
        {source === 'eventlog' && (
          <div>
            <label htmlFor="hours" className="text-sm font-medium text-gray-300 mb-2 block">
              Horas para analisar
            </label>
            <input
              id="hours"
              type="number"
              value={hours}
              onChange={(e) => setHours(Math.max(1, parseInt(e.target.value)))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-cyan-600"
              min="1"
              max="1000"
            />
          </div>
        )}

        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={isRunning}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isRunning
              ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-700 text-white'
          }`}
        >
          <Play className="w-4 h-4" />
          {isRunning ? 'A analisar...' : 'Executar Análise'}
        </button>
      </div>
    </div>
  );
}
