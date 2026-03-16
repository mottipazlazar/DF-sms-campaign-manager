'use client';

interface KPICardsProps {
  totalBatches: number;
  totalMessages: number;
  totalReplies: number;
  avgConversionRate: number;
}

export default function KPICards({ totalBatches, totalMessages, totalReplies, avgConversionRate }: KPICardsProps) {
  const kpis = [
    { label: 'Total Batches', value: totalBatches, icon: '📦', color: 'border-brand-pine' },
    { label: 'Messages Sent', value: totalMessages.toLocaleString(), icon: '📤', color: 'border-brand-taupe' },
    { label: 'Total Replies', value: totalReplies.toLocaleString(), icon: '💬', color: 'border-brand-gold' },
    { label: 'Avg Conversion', value: `${avgConversionRate}%`, icon: '📈', color: 'border-brand-pine' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className={`card border-l-4 ${kpi.color}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-brand-taupe/60 text-xs font-body uppercase tracking-wider">{kpi.label}</p>
              <p className="text-2xl font-display font-bold mt-1 text-brand-taupe">{kpi.value}</p>
            </div>
            <span className="text-3xl opacity-50">{kpi.icon}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
