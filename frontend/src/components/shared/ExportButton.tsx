import { Download } from 'lucide-react';
import { useAnalysisStore } from '../../store/analysisStore';

export function ExportButton() {
  const result = useAnalysisStore((s) => s.result);

  if (!result) return null;

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-analysis-${result.ran_at.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const headers = ['id', 'level', 'alert_type', 'timestamp', 'threat_score', 'source_ip', 'account'];
    const rows = result.alerts.map((a) => [
      a.id,
      a.level,
      a.alert_type,
      a.timestamp,
      (a as any).threat_score ?? '',
      a.details.source_ip ?? '',
      a.details.account ?? a.details.target_account ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-${result.ran_at.slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={exportCSV}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
      >
        <Download className="w-4 h-4" />
        CSV
      </button>
      <button
        onClick={exportJSON}
        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
      >
        <Download className="w-4 h-4" />
        JSON
      </button>
    </div>
  );
}
