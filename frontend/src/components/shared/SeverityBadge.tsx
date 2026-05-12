import type { AlertLevel } from '../../types';

interface SeverityBadgeProps {
  level: AlertLevel;
  size?: 'sm' | 'md' | 'lg';
}

const severityColors: Record<AlertLevel, { bg: string; text: string; dot: string }> = {
  CRITICAL: { bg: 'bg-red-900/20', text: 'text-red-400', dot: 'bg-red-500' },
  HIGH: { bg: 'bg-orange-900/20', text: 'text-orange-400', dot: 'bg-orange-500' },
  MEDIUM: { bg: 'bg-yellow-900/20', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  LOW: { bg: 'bg-blue-900/20', text: 'text-blue-400', dot: 'bg-blue-500' },
};

export function SeverityBadge({ level, size = 'md' }: SeverityBadgeProps) {
  const colors = severityColors[level];
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : size === 'lg' ? 'px-4 py-2 text-base' : 'px-3 py-1.5 text-sm';

  return (
    <span className={`${colors.bg} ${colors.text} ${sizeClass} rounded-full font-medium inline-flex items-center gap-2`}>
      <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
      {level}
    </span>
  );
}
