import { Inbox } from 'lucide-react';

interface ActionButton {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ActionButton;
  secondaryAction?: ActionButton;
}

export function EmptyState({ title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Inbox className="w-12 h-12 text-gray-600 mb-4" />
      <h3 className="text-lg font-medium text-gray-300 mb-2">{title}</h3>
      <p className="text-gray-400 text-sm mb-6">{description}</p>
      <div className="flex gap-3">
        {action && (
          <button
            onClick={action.onClick}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {action.label}
          </button>
        )}
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-600 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
