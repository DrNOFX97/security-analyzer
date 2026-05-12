import { useSystemInfo } from '../hooks/useSystemInfo';
import { Spinner } from '../components/shared/Spinner';

export function SettingsPage() {
  const { info, loading } = useSystemInfo();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  if (!info) {
    return <div className="text-center text-gray-400">Falha ao carregar informações do sistema</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Definições</h1>
        <p className="text-gray-400 mt-1">Informações e configuração do sistema</p>
      </div>

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
    </div>
  );
}
