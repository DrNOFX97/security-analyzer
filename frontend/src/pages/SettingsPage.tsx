import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { useSystemInfo } from '../hooks/useSystemInfo';
import { Spinner } from '../components/shared/Spinner';

const SETTINGS_KEY = 'security_analyzer_settings';

interface AnalysisSettings {
  defaultHours: number;
  bruteForceThreshold: number;
  defaultSource: 'csv' | 'eventlog';
}

const defaultSettings: AnalysisSettings = {
  defaultHours: 24,
  bruteForceThreshold: 5,
  defaultSource: 'csv',
};

export function loadAnalysisSettings(): AnalysisSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export function SettingsPage() {
  const { info, loading } = useSystemInfo();
  const [settings, setSettings] = useState<AnalysisSettings>(loadAnalysisSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadAnalysisSettings());
  }, []);

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Definições</h1>
        <p className="text-gray-400 mt-1">Configuração da análise e informações do sistema</p>
      </div>

      {/* Analysis Settings */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Configuração da Análise</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-gray-400 block mb-2">Janela de tempo predefinida (horas)</label>
            <select
              value={settings.defaultHours}
              onChange={(e) => setSettings((s) => ({ ...s, defaultHours: Number(e.target.value) }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-cyan-600"
            >
              <option value={24}>24 horas (1 dia)</option>
              <option value={48}>48 horas (2 dias)</option>
              <option value={72}>72 horas (3 dias)</option>
              <option value={168}>168 horas (7 dias)</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Threshold de Brute Force (tentativas)</label>
            <input
              type="number"
              min={3}
              max={100}
              value={settings.bruteForceThreshold}
              onChange={(e) => setSettings((s) => ({ ...s, bruteForceThreshold: Number(e.target.value) }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-cyan-600"
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo de tentativas falhadas para gerar alerta</p>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Fonte predefinida</label>
            <select
              value={settings.defaultSource}
              onChange={(e) => setSettings((s) => ({ ...s, defaultSource: e.target.value as 'csv' | 'eventlog' }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-gray-100 text-sm focus:outline-none focus:border-cyan-600"
            >
              <option value="csv">Ficheiro CSV</option>
              <option value="eventlog">Windows Event Log</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            <Save className="w-4 h-4" />
            Guardar Definições
          </button>
          {saved && <span className="text-green-400 text-sm">Guardado com sucesso</span>}
        </div>
      </div>

      {/* System Info */}
      {info && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Informações do Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-400">Nome do Computador</p>
              <p className="text-white font-medium">{info.hostname}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Plataforma</p>
              <p className="text-white font-medium capitalize">{info.platform}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Versão do SO</p>
              <p className="text-white font-medium">{info.os_version}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Endereço IP</p>
              <p className="text-white font-medium font-mono">{info.ip_address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Utilizador Atual</p>
              <p className="text-white font-medium">{info.current_user}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Domínio</p>
              <p className="text-white font-medium">{info.domain}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Administrador</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-3 h-3 rounded-full ${info.is_admin ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <p className={`font-medium ${info.is_admin ? 'text-green-400' : 'text-yellow-400'}`}>
                  {info.is_admin ? 'Sim (Modo Admin)' : 'Não (Modo Utilizador)'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-400">Wazuh Disponível</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={`w-3 h-3 rounded-full ${info.wazuh_available ? 'bg-green-500' : 'bg-gray-600'}`} />
                <p className={`font-medium ${info.wazuh_available ? 'text-green-400' : 'text-gray-400'}`}>
                  {info.wazuh_available ? 'Sim' : 'Não'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-400">Versão do Analisador</p>
              <p className="text-white font-medium">{info.analyzer_version}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
