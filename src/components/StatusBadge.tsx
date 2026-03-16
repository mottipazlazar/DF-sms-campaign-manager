'use client';

interface StatusBadgeProps {
  status: 'Planned' | 'InProgress' | 'Done';
  onClick?: () => void;
  size?: 'sm' | 'md';
}

const statusConfig = {
  Planned: { bg: 'bg-brand-taupe/10', text: 'text-brand-taupe', border: 'border-brand-taupe/30', label: 'Planned' },
  InProgress: { bg: 'bg-brand-gold/10', text: 'text-brand-gold-dark', border: 'border-brand-gold/30', label: 'In Progress' },
  Done: { bg: 'bg-brand-pine/10', text: 'text-brand-pine', border: 'border-brand-pine/30', label: 'Done' },
};

const nextStatus: Record<string, string> = {
  Planned: 'InProgress',
  InProgress: 'Done',
  Done: 'Planned',
};

export default function StatusBadge({ status, onClick, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <button
      onClick={onClick}
      className={`${config.bg} ${config.text} border ${config.border} ${sizeClasses} rounded-full font-body font-medium transition-all hover:opacity-80 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      title={onClick ? `Click to change to ${nextStatus[status]}` : undefined}
    >
      {config.label}
    </button>
  );
}

export { nextStatus };
