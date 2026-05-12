import { Shield, AlertCircle } from 'lucide-react';
import { useSystemInfo } from '../../hooks/useSystemInfo';
import { SeverityBadge } from '../shared/SeverityBadge';
import { useAnalysisStore } from '../../store/analysisStore';

export function TopBar() {
  const { info } = useSystemInfo();
  const result = useAnalysisStore((s) => s.result);

  const lastRun = result
    ? new Date(result.ran_at).toLocaleString()
    : 'Never';

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-semibold text-white">
              {info?.hostname || 'Security Dashboard'}
            </h2>
            {info?.is_admin && info?.platform === 'windows' ? (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-900/20 border border-green-800 rounded text-xs text-green-400">
                <Shield className="w-3 h-3" />
                Administrador
              </div>
            ) : info?.platform === 'windows' ? (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-900/20 border border-red-800 rounded text-xs text-red-400">
                <AlertCircle className="w-3 h-3" />
                Sem Admin
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex gap-6 text-sm text-gray-400">
              <span>🖥️ SO: <span className="text-gray-300 font-medium">{info?.os_caption || info?.os_version || 'Desconhecido'}</span></span>
              <span>👤 Proprietário: <span className="text-gray-300 font-medium">{info?.owner || 'Desconhecido'}</span></span>
              <span>💻 Modelo: <span className="text-gray-300 font-medium">{info?.model || 'Desconhecido'}</span></span>
              <span>💾 RAM: <span className="text-gray-300 font-medium">{info?.total_ram_gb}GB (Livre: {info?.free_ram_mb}MB)</span></span>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <span>Utilizador: <span className="text-gray-300 font-medium">{info?.current_user}</span></span>
              <span>Domínio: <span className="text-gray-300 font-medium">{info?.domain}</span></span>
              <span>IP: <span className="text-gray-300 font-medium">{info?.ip_address || 'N/A'}</span></span>
              <span>Última execução: <span className="text-gray-300 font-medium">{lastRun}</span></span>
            </div>
          </div>
        </div>

        {result && (
          <div className="text-right pl-4 border-l border-gray-800">
            <p className="text-sm text-gray-400 mb-2">Risco Geral</p>
            <SeverityBadge level={result.summary.overall_risk} size="lg" />
          </div>
        )}
      </div>
    </header>
  );
}
