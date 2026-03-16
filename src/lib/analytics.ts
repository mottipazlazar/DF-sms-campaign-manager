import getDb from './db';
import type { AnalyticsData } from './types';

export function getAnalytics(startDate?: string, endDate?: string): AnalyticsData {
  const db = getDb();

  let dateFilter = '';
  const params: any[] = [];

  if (startDate && endDate) {
    dateFilter = 'WHERE b.planned_date >= ? AND b.planned_date <= ?';
    params.push(startDate, endDate);
  }

  // Totals
  const totals = db.prepare(`
    SELECT
      COUNT(*) as totalBatches,
      COALESCE(SUM(message_count), 0) as totalMessages,
      COALESCE(SUM(reply_count), 0) as totalReplies,
      COALESCE(AVG(conversion_rate), 0) as avgConversionRate
    FROM batches b
    ${dateFilter}
    ${dateFilter ? 'AND' : 'WHERE'} conversion_rate IS NOT NULL
  `).get(...params) as any;

  // Best send times (by local target time hour)
  const bestSendTimes = db.prepare(`
    SELECT
      substr(local_target_time, 1, 2) || ':00' as time,
      AVG(conversion_rate) as avg_rate,
      COUNT(*) as count
    FROM batches b
    ${dateFilter}
    ${dateFilter ? 'AND' : 'WHERE'} conversion_rate IS NOT NULL
    GROUP BY substr(local_target_time, 1, 2)
    ORDER BY avg_rate DESC
    LIMIT 5
  `).all(...params) as any[];

  // Worst send times
  const worstSendTimes = db.prepare(`
    SELECT
      substr(local_target_time, 1, 2) || ':00' as time,
      AVG(conversion_rate) as avg_rate,
      COUNT(*) as count
    FROM batches b
    ${dateFilter}
    ${dateFilter ? 'AND' : 'WHERE'} conversion_rate IS NOT NULL
    GROUP BY substr(local_target_time, 1, 2)
    HAVING COUNT(*) >= 1
    ORDER BY avg_rate ASC
    LIMIT 5
  `).all(...params) as any[];

  // Top counties
  const topCounties = db.prepare(`
    SELECT
      c.county,
      AVG(b.conversion_rate) as avg_rate,
      COUNT(*) as total_batches
    FROM batches b
    JOIN campaigns c ON b.campaign_id = c.id
    ${dateFilter ? 'WHERE b.planned_date >= ? AND b.planned_date <= ?' : ''}
    ${dateFilter ? 'AND' : 'WHERE'} b.conversion_rate IS NOT NULL
    GROUP BY c.county
    ORDER BY avg_rate DESC
    LIMIT 10
  `).all(...params) as any[];

  // Top templates
  const topTemplates = db.prepare(`
    SELECT
      template,
      AVG(conversion_rate) as avg_rate,
      COUNT(*) as total_batches
    FROM batches b
    ${dateFilter}
    ${dateFilter ? 'AND' : 'WHERE'} conversion_rate IS NOT NULL
    GROUP BY template
    ORDER BY avg_rate DESC
    LIMIT 10
  `).all(...params) as any[];

  // Daily performance
  const dailyPerformance = db.prepare(`
    SELECT
      planned_date as date,
      SUM(message_count) as messages,
      COALESCE(SUM(reply_count), 0) as replies,
      COALESCE(AVG(conversion_rate), 0) as rate
    FROM batches b
    ${dateFilter}
    GROUP BY planned_date
    ORDER BY planned_date DESC
    LIMIT 30
  `).all(...params) as any[];

  return {
    totalBatches: totals?.totalBatches || 0,
    totalMessages: totals?.totalMessages || 0,
    totalReplies: Math.round(totals?.totalReplies || 0),
    avgConversionRate: Math.round((totals?.avgConversionRate || 0) * 100) / 100,
    bestSendTimes,
    worstSendTimes,
    topCounties,
    topTemplates,
    dailyPerformance: dailyPerformance.reverse(),
  };
}
