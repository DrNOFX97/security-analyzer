import { Shield, Lock } from 'lucide-react';
import type { SystemInfo } from '../../types';

interface StatusBannerProps {
  info: SystemInfo | null;
}

export function StatusBanner({ info }: StatusBannerProps) {
  if (!info) return null;

  const isWindows = info.platform === 'windows';
  const isAdmin = info.is_admin;

  // If Windows and NOT admin, show error banner
  if (isWindows && !isAdmin) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-5 flex items-start gap-3 mb-6">
        <Lock className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-400">⚠️ Privilégios de Administrador Necessários</h3>
          <p className="text-sm text-red-300 mt-2">
            Esta aplicação requer privilégios de administrador para ler os Registos de Eventos do Windows.
          </p>
          <p className="text-sm text-red-300 mt-2">
            <strong>Para executar como admin:</strong> Clique com o botão direito na aplicação ou terminal e selecione "Executar como Administrador"
          </p>
          <p className="text-sm text-red-300 mt-2">
            Atualmente apenas a análise de ficheiros CSV está disponível.
          </p>
        </div>
      </div>
    );
  }

  // If Windows and admin, show success banner
  if (isWindows && isAdmin) {
    return (
      <div className="bg-green-900/20 border border-green-800 rounded-lg p-4 flex items-start gap-3 mb-6">
        <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-green-400">✓ A Executar com Privilégios de Administrador</h3>
          <p className="text-sm text-green-300 mt-1">
            Acesso completo aos Registos de Eventos do Windows ativado.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
