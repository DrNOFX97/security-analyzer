import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SeverityBadge } from '../shared/SeverityBadge';
import { Spinner } from '../shared/Spinner';
import { EmptyState } from '../shared/EmptyState';
import { useAlerts } from '../../hooks/useAlerts';
import type { AlertLevel } from '../../types';

interface AlertsTableProps {
  levels?: AlertLevel[];
  typeQuery?: string;
}

export function AlertsTable({ levels = [], typeQuery = '' }: AlertsTableProps) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { alerts, total, loading, error } = useAlerts({
    page,
    per_page: 25,
    levels: levels.length > 0 ? levels : undefined,
    typeQuery: typeQuery || undefined,
    sort_by: 'timestamp',
    order: 'desc',
  });

  if (error) {
    return <EmptyState title="Erro" description={error} />;
  }

  if (!loading && alerts.length === 0) {
    return <EmptyState title="Nenhum alerta" description="Nenhum alerta corresponde aos seus filtros" />;
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-800/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Gravidade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tipo de Alerta</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Hora</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8">
                  <div className="flex justify-center">
                    <Spinner />
                  </div>
                </td>
              </tr>
            ) : (
              alerts.map((alert) => (
                <>
                  <tr
                    key={alert.id}
                    className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                  >
                    <td className="px-6 py-4">
                      <SeverityBadge level={alert.level} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{alert.alert_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(alert.timestamp).toLocaleString('pt-PT')}
                    </td>
                    <td className="px-6 py-4">
                      <ChevronDown
                        className={`w-4 h-4 text-gray-500 transition-transform ${
                          expandedId === alert.id ? 'rotate-180' : ''
                        }`}
                      />
                    </td>
                  </tr>
                  {expandedId === alert.id && (
                    <tr className="bg-gray-800/30 border-b border-gray-800">
                      <td colSpan={4} className="px-6 py-4">
                        <div className="space-y-4 text-sm">
                          {/* Threat Score */}
                          <div className="bg-gray-800/50 rounded p-3">
                            <p className="text-gray-400 font-semibold mb-2">🎯 Threat Score</p>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    (alert as any).threat_score >= 85 ? 'bg-red-500' :
                                    (alert as any).threat_score >= 70 ? 'bg-orange-500' :
                                    (alert as any).threat_score >= 50 ? 'bg-yellow-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${(alert as any).threat_score || 0}%` }}
                                />
                              </div>
                              <span className="text-gray-300 font-bold min-w-[50px]">
                                {(alert as any).threat_score || 0}/100
                              </span>
                            </div>
                          </div>

                          {/* Context */}
                          {(alert as any).context && (
                            <div className="bg-gray-800/50 rounded p-3 border-l-4 border-cyan-500">
                              <p className="text-gray-400 font-semibold mb-2">📋 Contexto da Ameaça</p>
                              <p className="text-gray-300 whitespace-pre-wrap text-xs">{(alert as any).context}</p>
                            </div>
                          )}

                          {/* IOCs */}
                          {(alert as any).iocs && (
                            <div className="bg-gray-800/50 rounded p-3 border-l-4 border-red-500">
                              <p className="text-gray-400 font-semibold mb-2">🔍 Indicadores Detectados (IOCs)</p>
                              <div className="space-y-2 text-xs">
                                {(alert as any).iocs.ips?.length > 0 && (
                                  <div><span className="text-red-400">IPs:</span> <span className="text-gray-300">{(alert as any).iocs.ips.join(', ')}</span></div>
                                )}
                                {(alert as any).iocs.domains?.length > 0 && (
                                  <div><span className="text-red-400">Domínios:</span> <span className="text-gray-300">{(alert as any).iocs.domains.join(', ')}</span></div>
                                )}
                                {(alert as any).iocs.file_paths?.length > 0 && (
                                  <div><span className="text-red-400">Ficheiros:</span> <span className="text-gray-300">{(alert as any).iocs.file_paths.join(', ')}</span></div>
                                )}
                                {(alert as any).iocs.registry_keys?.length > 0 && (
                                  <div><span className="text-red-400">Registos:</span> <span className="text-gray-300">{(alert as any).iocs.registry_keys.join(', ')}</span></div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Remediation Steps */}
                          {(alert as any).remediation && (
                            <div className="bg-gray-800/50 rounded p-3 border-l-4 border-green-500">
                              <p className="text-gray-400 font-semibold mb-2">✅ Passos de Remediação (SIEM)</p>
                              <ol className="space-y-1 text-xs text-gray-300 list-inside">
                                {(alert as any).remediation.map((step: string, idx: number) => (
                                  <li key={idx} className="text-gray-300">{step}</li>
                                ))}
                              </ol>
                            </div>
                          )}

                          {/* Original Details */}
                          <div className="bg-gray-800/50 rounded p-3">
                            <p className="text-gray-400 font-semibold mb-2">📊 Detalhes</p>
                            <div className="space-y-1">
                              {Object.entries(alert.details).map(([key, value]) => (
                                <div key={key} className="text-xs">
                                  <span className="text-gray-500">{key}:</span>
                                  <span className="text-gray-300 ml-2">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            A mostrar {(page - 1) * 25 + 1} a {Math.min(page * 25, total)} de {total} alertas
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-gray-700 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * 25 >= total}
              className="px-3 py-1 text-sm border border-gray-700 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400"
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
