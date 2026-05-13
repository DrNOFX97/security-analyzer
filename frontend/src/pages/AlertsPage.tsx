import { useState, useCallback } from 'react';
import { FilterBar } from '../components/alerts/FilterBar';
import { AlertsTable } from '../components/alerts/AlertsTable';
import { ExportButton } from '../components/shared/ExportButton';
import type { AlertLevel } from '../types';

export function AlertsPage() {
  const [selectedLevels, setSelectedLevels] = useState<AlertLevel[]>([]);
  const [typeQuery, setTypeQuery] = useState('');

  const handleLevelChange = useCallback((level: AlertLevel, checked: boolean) => {
    if (checked) {
      setSelectedLevels((prev) => [...prev, level]);
    } else {
      setSelectedLevels((prev) => prev.filter((l) => l !== level));
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Alertas</h1>
          <p className="text-gray-400 mt-1">Visualize e filtre todos os alertas de segurança</p>
        </div>
        <ExportButton />
      </div>

      <FilterBar
        selectedLevels={selectedLevels}
        typeQuery={typeQuery}
        onLevelChange={handleLevelChange}
        onTypeChange={setTypeQuery}
      />

      <AlertsTable levels={selectedLevels} typeQuery={typeQuery} />
    </div>
  );
}
