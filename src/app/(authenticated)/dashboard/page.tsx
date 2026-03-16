'use client';

import { useState, useEffect, useCallback } from 'react';
import KPICards from '@/components/KPICards';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import type { AnalyticsData } from '@/lib/types';

export default function DashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);

    const res = await fetch(`/api/analytics?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for refresh trigger from planner (when a batch is marked Done)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'dashboard_refresh') {
        fetchData();
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [fetchData]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-taupe">Analytics Dashboard</h1>
          <p className="font-body text-sm text-brand-taupe/60 mt-1">Campaign performance insights</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field w-auto text-sm"
            placeholder="Start date"
          />
          <span className="text-brand-taupe/40 text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field w-auto text-sm"
            placeholder="End date"
          />
          <button onClick={fetchData} className="btn-primary text-sm flex items-center gap-1.5">
            <span>🔄</span> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-brand-taupe/50 font-body">Loading analytics...</div>
      ) : data ? (
        <div className="space-y-6">
          <KPICards
            totalBatches={data.totalBatches}
            totalMessages={data.totalMessages}
            totalReplies={data.totalReplies}
            avgConversionRate={data.avgConversionRate}
          />
          <AnalyticsCharts data={data} />
        </div>
      ) : null}
    </div>
  );
}
