export interface User {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'va';
  timezone: string;
  tz_label: string;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  county: string;
  state: string;
  status: 'Planned' | 'InProgress' | 'Done';
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: number;
  campaign_id: number;
  batch_number: number;
  lc_batch_id: string;
  template: string;
  message_count: number;
  owner_id: number;
  owner_name?: string;
  local_target_time: string;
  actual_send_time: string | null;
  conversion_rate: number | null;
  reply_count: number | null;
  planned_date: string;
  sort_order: number;
  notes: string;
  created_at: string;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
  category: 'county' | 'state' | 'template' | 'general';
}

export interface BatchWithTZ extends Batch {
  tz_times: { user_id: number; display_name: string; tz_label: string; converted_time: string }[];
  campaign_name?: string;
}

export interface AnalyticsData {
  totalBatches: number;
  totalMessages: number;
  totalReplies: number;
  avgConversionRate: number;
  bestSendTimes: { time: string; avg_rate: number; count: number }[];
  worstSendTimes: { time: string; avg_rate: number; count: number }[];
  topCounties: { county: string; avg_rate: number; total_batches: number }[];
  topTemplates: { template: string; avg_rate: number; total_batches: number }[];
  dailyPerformance: { date: string; messages: number; replies: number; rate: number }[];
}
