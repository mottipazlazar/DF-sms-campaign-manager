import { db, ensureDb } from './db';
import type { AnalyticsData } from './types';

export async function getAnalytics(startDate?: string, endDate?: string): Promise<AnalyticsData> {
  await ensureDb();

  const hasDateFilter = !!(startDate && endDate);
  const dateArgs = hasDateFilter ? [startDate!, endDate!] : [];

  // Exclude skipped batches from all stats
  const skipFilter = '(b.skipped IS NULL OR b.skipped = 0)';

  const where = (extra: string) =>
    hasDateFilter
      ? `WHERE b.planned_date >= ? AND b.planned_date <= ? AND ${skipFilter} AND ${extra}`
      : `WHERE ${skipFilter} AND ${extra}`;

  // Use actual_send_time when available (requirement: stats based on actual run time)
  const actualHour = `COALESCE(substr(actual_send_time,1,2), substr(local_target_time,1,2))`;

  // Totals
  const totalsResult = await db.execute({
    sql: `
      SELECT
        COUNT(*) as totalBatches,
        COALESCE(SUM(message_count), 0) as totalMessages,
        COALESCE(SUM(reply_count), 0) as totalReplies,
        COALESCE(AVG(conversion_rate), 0) as avgConversionRate
      FROM batches b
      ${where('conversion_rate IS NOT NULL')}
    `,
    args: dateArgs,
  });
  const totals = totalsResult.rows[0] as any;

  // Best send times — by actual send hour
  const bestResult = await db.execute({
    sql: `
      SELECT
        ${actualHour} || ':00' as time,
        AVG(conversion_rate) as avg_rate,
        COUNT(*) as count
      FROM batches b
      ${where('conversion_rate IS NOT NULL')}
      GROUP BY ${actualHour}
      ORDER BY avg_rate DESC
      LIMIT 5
    `,
    args: dateArgs,
  });
  const bestSendTimes = bestResult.rows as any[];

  // Worst send times — by actual send hour
  const worstResult = await db.execute({
    sql: `
      SELECT
        ${actualHour} || ':00' as time,
        AVG(conversion_rate) as avg_rate,
        COUNT(*) as count
      FROM batches b
      ${where('conversion_rate IS NOT NULL')}
      GROUP BY ${actualHour}
      HAVING COUNT(*) >= 1
      ORDER BY avg_rate ASC
      LIMIT 5
    `,
    args: dateArgs,
  });
  const worstSendTimes = worstResult.rows as any[];

  // Top counties
  const countiesResult = await db.execute({
    sql: `
      SELECT
        c.county,
        AVG(b.conversion_rate) as avg_rate,
        COUNT(*) as total_batches
      FROM batches b
      JOIN campaigns c ON b.campaign_id = c.id
      ${where('b.conversion_rate IS NOT NULL')}
      GROUP BY c.county
      ORDER BY avg_rate DESC
      LIMIT 10
    `,
    args: dateArgs,
  });
  const topCounties = countiesResult.rows as any[];

  // Top templates
  const templatesResult = await db.execute({
    sql: `
      SELECT
        template,
        AVG(conversion_rate) as avg_rate,
        COUNT(*) as total_batches
      FROM batches b
      ${where('conversion_rate IS NOT NULL')}
      GROUP BY template
      ORDER BY avg_rate DESC
      LIMIT 10
    `,
    args: dateArgs,
  });
  const topTemplates = templatesResult.rows as any[];

  // Daily performance — exclude skipped
  const dailyResult = await db.execute({
    sql: `
      SELECT
        planned_date as date,
        SUM(message_count) as messages,
        COALESCE(SUM(reply_count), 0) as replies,
        COALESCE(AVG(conversion_rate), 0) as rate
      FROM batches b
      WHERE ${skipFilter}
      ${hasDateFilter ? 'AND b.planned_date >= ? AND b.planned_date <= ?' : ''}
      GROUP BY planned_date
      ORDER BY planned_date DESC
      LIMIT 30
    `,
    args: dateArgs,
  });
  const dailyPerformance = [...dailyResult.rows].reverse() as any[];

  return {
    totalBatches: Number(totals?.totalBatches) || 0,
    totalMessages: Number(totals?.totalMessages) || 0,
    totalReplies: Math.round(Number(totals?.totalReplies) || 0),
    avgConversionRate: Math.round((Number(totals?.avgConversionRate) || 0) * 100) / 100,
    bestSendTimes,
    worstSendTimes,
    topCounties,
    topTemplates,
    dailyPerformance,
  };
}
