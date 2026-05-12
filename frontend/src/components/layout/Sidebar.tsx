import { BarChart3, AlertTriangle, Settings, BookOpen } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { id: 'dashboard', label: 'Painel', icon: BarChart3, path: '/' },
  { id: 'alerts', label: 'Alertas', icon: AlertTriangle, path: '/alerts' },
  { id: 'settings', label: 'Definições', icon: Settings, path: '/settings' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-600 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">Segurança</h1>
            <p className="text-xs text-gray-400">Analisador</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <a
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-cyan-400 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-sm font-medium">API Docs</span>
        </a>
      </div>
    </aside>
  );
}
