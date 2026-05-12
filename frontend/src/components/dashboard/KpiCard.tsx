import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'red' | 'orange' | 'yellow' | 'blue' | 'cyan';
  subtitle?: string;
}

const colorClasses = {
  red: { bg: 'bg-red-900/20', icon: 'text-red-400', border: 'border-red-800' },
  orange: { bg: 'bg-orange-900/20', icon: 'text-orange-400', border: 'border-orange-800' },
  yellow: { bg: 'bg-yellow-900/20', icon: 'text-yellow-400', border: 'border-yellow-800' },
  blue: { bg: 'bg-blue-900/20', icon: 'text-blue-400', border: 'border-blue-800' },
  cyan: { bg: 'bg-cyan-900/20', icon: 'text-cyan-400', border: 'border-cyan-800' },
};

export function KpiCard({ title, value, icon: Icon, color, subtitle }: KpiCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-2">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <Icon className={`w-10 h-10 ${colors.icon}`} />
      </div>
    </div>
  );
}
