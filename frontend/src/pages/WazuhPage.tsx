import { useState, useEffect, useCallback } from 'react';
import {
  Shield, Server, AlertOctagon, CheckSquare,
  Wifi, WifiOff, RefreshCw, ChevronDown, ChevronRight, Zap,
} from 'lucide-react';
import { wazuhAPI } from '../api/client';
import { Spinner } from '../components/shared/Spinner';
import type {
  WazuhStatus, WazuhAgent, WazuhVulnerability,
  WazuhVulnSummary, WazuhSCAPolicy, WazuhSCACheck,
} from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: WazuhAgent['status'] }) {
  const colors: Record<string, string> = {
    active: 'bg-green-500',
    disconnected: 'bg-red-500',
    never_connected: 'bg-gray-500',
    pending: 'bg-yellow-500',
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status] ?? 'bg-gray-500'}`} />;
}

function SeverityChip({ sev }: { sev: string }) {
  const cls: Record<string, string> = {
    Critical: 'bg-red-900/50 text-red-400 border-red-700',
    High: 'bg-orange-900/50 text-orange-400 border-orange-700',
    Medium: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    Low: 'bg-blue-900/50 text-blue-400 border-blue-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs border font-medium ${cls[sev] ?? 'bg-gray-800 text-gray-400 border-gray-600'}`}>
      {sev}
    </span>
  );
}

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-300 min-w-[38px] text-right">{pct}%</span>
    </div>
  );
}

// ── Connection banner ─────────────────────────────────────────────────────────

function ConnectionBanner({ status }: { status: WazuhStatus | null }) {
  if (!status) return null;
  return status.available ? (
    <div className="flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm">
      <Wifi className="w-4 h-4" />
      Wazuh API ligada — {status.url}
    </div>
  ) : (
    <div className="flex items-center gap-2 px-4 py-2 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
      <WifiOff className="w-4 h-4" />
      Wazuh API indisponível em {status.url} — configure o acesso em Definições
    </div>
  );
}

// ── Agents tab ────────────────────────────────────────────────────────────────

function AgentsTab() {
  const [agents, setAgents] = useState<WazuhAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await wazuhAPI.getAgents();
      setAgents(r.data.agents);
    } catch {
      setError('Não foi possível carregar agentes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleActiveResponse = async (agentId: string, commandKey: string, label: string, args?: string[]) => {
    const key = `${agentId}-${commandKey}`;
    setActiveAction(key);
    try {
      await wazuhAPI.triggerActiveResponse(agentId, commandKey, args);
      setActionResult(prev => ({ ...prev, [key]: `✓ ${label} executado` }));
    } catch {
      setActionResult(prev => ({ ...prev, [key]: '✗ Falhou' }));
    } finally {
      setActiveAction(null);
    }
  };

  const active = agents.filter(a => a.status === 'active').length;
  const disconnected = agents.filter(a => a.status === 'disconnected').length;

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error) return <p className="text-red-400 text-sm py-4">{error}</p>;
  if (!agents.length) return <p className="text-gray-400 text-sm py-4">Nenhum agente encontrado</p>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: agents.length, color: 'text-white' },
          { label: 'Ativos', value: active, color: 'text-green-400' },
          { label: 'Desligados', value: disconnected, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800 rounded-lg p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50 border-b border-gray-800">
            <tr>
              {['Status', 'ID', 'Nome', 'IP', 'SO', 'Versão', 'Último contacto', 'Ações'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <tr key={agent.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StatusDot status={agent.status} />
                    <span className="text-xs text-gray-400 capitalize">{agent.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-gray-300">{agent.id}</td>
                <td className="px-4 py-3 text-white font-medium">{agent.name}</td>
                <td className="px-4 py-3 font-mono text-gray-400">{agent.ip ?? agent.registerIP ?? '—'}</td>
                <td className="px-4 py-3 text-gray-400">
                  {agent.os ? `${agent.os.name ?? ''} ${agent.os.version ?? ''}`.trim() : '—'}
                </td>
                <td className="px-4 py-3 text-gray-400">{agent.version ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {agent.lastKeepAlive
                    ? new Date(agent.lastKeepAlive).toLocaleString('pt-PT')
                    : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {[
                      { key: 'restart-wazuh', label: 'Reiniciar agente', args: undefined },
                      { key: 'block-ip-windows', label: 'Bloquear IP (Win)', args: [agent.ip ?? ''] },
                    ].map(({ key, label, args }) => {
                      const aKey = `${agent.id}-${key}`;
                      const result = actionResult[aKey];
                      return (
                        <button
                          key={key}
                          onClick={() => handleActiveResponse(agent.id, key, label, args?.filter(Boolean))}
                          disabled={activeAction === aKey || agent.status !== 'active'}
                          className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed rounded text-xs text-gray-300 hover:text-white transition-colors"
                        >
                          <Zap className="w-3 h-3" />
                          {result ?? label}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Vulnerabilities tab ───────────────────────────────────────────────────────

function VulnerabilitiesTab({ agents }: { agents: WazuhAgent[] }) {
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [vulns, setVulns] = useState<WazuhVulnerability[]>([]);
  const [summary, setSummary] = useState<WazuhVulnSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [sevFilter, setSevFilter] = useState('');

  const load = useCallback(async (agentId: string) => {
    if (!agentId) return;
    setLoading(true);
    try {
      const r = await wazuhAPI.getVulnerabilities(agentId, sevFilter || undefined);
      setVulns(r.data.vulnerabilities);
      setSummary(r.data.summary);
    } catch {
      setVulns([]);
    } finally {
      setLoading(false);
    }
  }, [sevFilter]);

  useEffect(() => {
    if (selectedAgent) load(selectedAgent);
  }, [selectedAgent, load]);

  const filtered = sevFilter ? vulns.filter(v => v.severity === sevFilter) : vulns;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-3">
        <select
          value={selectedAgent}
          onChange={e => setSelectedAgent(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-cyan-600 flex-1 max-w-xs"
        >
          <option value="">Selecionar agente...</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
          ))}
        </select>
        <select
          value={sevFilter}
          onChange={e => setSevFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-cyan-600"
        >
          <option value="">Todas severidades</option>
          {['Critical', 'High', 'Medium', 'Low'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-3">
          {([
            ['Total', summary.total, 'text-white'],
            ['Critical', summary.critical, 'text-red-400'],
            ['High', summary.high, 'text-orange-400'],
            ['Medium', summary.medium, 'text-yellow-400'],
            ['Low', summary.low, 'text-blue-400'],
          ] as [string, number, string][]).map(([label, val, color]) => (
            <div key={label} className="bg-gray-800 rounded-lg p-3 text-center">
              <p className={`text-xl font-bold ${color}`}>{val}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {!loading && selectedAgent && filtered.length === 0 && (
        <p className="text-gray-400 text-sm py-4">Nenhuma vulnerabilidade encontrada</p>
      )}

      {!loading && filtered.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50 border-b border-gray-800">
              <tr>
                {['CVE', 'Severidade', 'CVSS3', 'Pacote', 'Versão', 'Tipo'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr key={`${v.cve}-${i}`} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-mono text-cyan-400 text-xs">{v.cve}</td>
                  <td className="px-4 py-3"><SeverityChip sev={v.severity} /></td>
                  <td className="px-4 py-3 text-gray-300">{v.cvss3_score?.toFixed(1) ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{v.name}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{v.version ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{v.type ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Compliance tab ────────────────────────────────────────────────────────────

function ComplianceTab({ agents }: { agents: WazuhAgent[] }) {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [policies, setPolicies] = useState<WazuhSCAPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, WazuhSCACheck[]>>({});
  const [checksLoading, setChecksLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAgent) return;
    setLoading(true);
    setPolicies([]);
    wazuhAPI.getCompliance(selectedAgent)
      .then(r => setPolicies(r.data.policies))
      .catch(() => setPolicies([]))
      .finally(() => setLoading(false));
  }, [selectedAgent]);

  const togglePolicy = async (policyId: string) => {
    if (expanded === policyId) { setExpanded(null); return; }
    setExpanded(policyId);
    if (checks[policyId]) return;
    setChecksLoading(policyId);
    try {
      const r = await wazuhAPI.getComplianceChecks(selectedAgent, policyId);
      setChecks(prev => ({ ...prev, [policyId]: r.data.checks }));
    } catch {
      setChecks(prev => ({ ...prev, [policyId]: [] }));
    } finally {
      setChecksLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      <select
        value={selectedAgent}
        onChange={e => setSelectedAgent(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-cyan-600 max-w-xs"
      >
        <option value="">Selecionar agente...</option>
        {agents.map(a => (
          <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
        ))}
      </select>

      {loading && <div className="flex justify-center py-8"><Spinner /></div>}

      {!loading && selectedAgent && policies.length === 0 && (
        <p className="text-gray-400 text-sm py-4">Nenhuma política SCA encontrada para este agente</p>
      )}

      <div className="space-y-3">
        {policies.map(p => {
          const score = p.score ?? Math.round((p.pass / Math.max(p.pass + p.fail, 1)) * 100);
          const isOpen = expanded === p.policy_id;
          return (
            <div key={p.policy_id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/40 transition-colors"
                onClick={() => togglePolicy(p.policy_id)}
              >
                <div className="flex items-center gap-3 text-left">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                  <div>
                    <p className="text-white font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 shrink-0 ml-4">
                  <div className="text-right text-xs">
                    <span className="text-green-400">{p.pass} OK</span>
                    <span className="text-gray-500 mx-1">|</span>
                    <span className="text-red-400">{p.fail} Falhou</span>
                  </div>
                  <div className="w-32">
                    <ScoreBar value={score} />
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-gray-800 px-5 py-4">
                  {checksLoading === p.policy_id ? (
                    <div className="flex justify-center py-4"><Spinner /></div>
                  ) : (checks[p.policy_id] ?? []).length === 0 ? (
                    <p className="text-gray-500 text-xs">Sem verificações disponíveis</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {(checks[p.policy_id] ?? []).map(c => (
                        <div key={c.id} className="flex items-start gap-3 text-xs py-1.5 border-b border-gray-800/50">
                          <span className={`shrink-0 mt-0.5 font-bold ${c.result === 'passed' ? 'text-green-400' : c.result === 'failed' ? 'text-red-400' : 'text-gray-500'}`}>
                            {c.result === 'passed' ? '✓' : c.result === 'failed' ? '✗' : '—'}
                          </span>
                          <div>
                            <p className="text-gray-300">{c.title}</p>
                            {c.result === 'failed' && c.remediation && (
                              <p className="text-yellow-600 mt-0.5">Remediação: {c.remediation}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'agents' | 'vulns' | 'compliance';

const TABS: { id: Tab; label: string; icon: typeof Shield }[] = [
  { id: 'agents', label: 'Agentes', icon: Server },
  { id: 'vulns', label: 'Vulnerabilidades', icon: AlertOctagon },
  { id: 'compliance', label: 'Compliance', icon: CheckSquare },
];

export function WazuhPage() {
  const [tab, setTab] = useState<Tab>('agents');
  const [status, setStatus] = useState<WazuhStatus | null>(null);
  const [agents, setAgents] = useState<WazuhAgent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await wazuhAPI.getStatus();
      setStatus(r.data);
      if (r.data.available) {
        const ar = await wazuhAPI.getAgents();
        setAgents(ar.data.agents);
      }
    } catch {
      setStatus({ available: false, url: '', host: '', port: 55000 });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-cyan-400" />
            Wazuh
          </h1>
          <p className="text-gray-400 mt-1">Gestão de agentes, vulnerabilidades e compliance</p>
        </div>
        <button
          onClick={loadStatus}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <ConnectionBanner status={status} />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-cyan-600 text-white'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {status?.available === false ? (
        <div className="text-center py-16 text-gray-500">
          <WifiOff className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>Wazuh API não disponível.</p>
          <p className="text-sm mt-1">Configure o acesso em <strong className="text-gray-400">Definições → Wazuh API</strong>.</p>
        </div>
      ) : (
        <>
          {tab === 'agents' && <AgentsTab />}
          {tab === 'vulns' && <VulnerabilitiesTab agents={agents} />}
          {tab === 'compliance' && <ComplianceTab agents={agents} />}
        </>
      )}
    </div>
  );
}
