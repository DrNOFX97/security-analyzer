import { Search } from 'lucide-react';
import type { AlertLevel } from '../../types';

interface FilterBarProps {
  selectedLevels: AlertLevel[];
  typeQuery: string;
  onLevelChange: (level: AlertLevel, checked: boolean) => void;
  onTypeChange: (query: string) => void;
}

const levels: AlertLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const levelColors: Record<AlertLevel, string> = {
  CRITICAL: 'text-red-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-yellow-400',
  LOW: 'text-blue-400',
};

export function FilterBar({ selectedLevels, typeQuery, onLevelChange, onTypeChange }: FilterBarProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4">Filtros</h3>

      <div className="space-y-4">
        {/* Severity Levels */}
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 block">Gravidade</label>
          <div className="flex flex-wrap gap-3">
            {levels.map((level) => (
              <label key={level} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedLevels.includes(level)}
                  onChange={(e) => onLevelChange(level, e.target.checked)}
                  className="w-4 h-4"
                />
                <span className={`text-sm font-medium ${levelColors[level]}`}>{level}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Type Search */}
        <div>
          <label htmlFor="type-search" className="text-sm font-medium text-gray-300 mb-2 block">
            Tipo de Alerta
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              id="type-search"
              type="text"
              placeholder="Pesquisar tipos de alerta..."
              value={typeQuery}
              onChange={(e) => onTypeChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 text-sm focus:outline-none focus:border-cyan-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
