'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import type { AnalyticsData } from '@/lib/types';

const COLORS = ['#3F6B55', '#E5A94D', '#635752', '#D9CD25', '#2D5240', '#C8912E'];

export default function AnalyticsCharts({ data }: { data: AnalyticsData }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Performance */}
      <div className="card">
        <h3 className="font-display font-semibold text-lg text-brand-taupe mb-4">Daily Performance</h3>
        {data.dailyPerformance.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.dailyPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#635752" opacity={0.1} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: 'Neue Montreal' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fontFamily: 'Neue Montreal' }} />
              <Tooltip
                contentStyle={{ fontFamily: 'Neue Montreal', fontSize: 12, borderRadius: 8, border: '1px solid #63575220' }}
              />
              <Line type="monotone" dataKey="messages" stroke="#3F6B55" strokeWidth={2} name="Messages" dot={{ r: 3 }} />
              <Line type="monotone" dataKey="replies" stroke="#E5A94D" strokeWidth={2} name="Replies" dot={{ r: 3 }} />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-brand-taupe/50 text-sm font-body text-center py-12">No data yet</p>
        )}
      </div>

      {/* Best Send Times */}
      <div className="card">
        <h3 className="font-display font-semibold text-lg text-brand-taupe mb-4">Best Send Times</h3>
        {data.bestSendTimes.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.bestSendTimes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#635752" opacity={0.1} />
              <XAxis dataKey="time" tick={{ fontSize: 11, fontFamily: 'Neue Montreal' }} />
              <YAxis tick={{ fontSize: 11, fontFamily: 'Neue Montreal' }} label={{ value: 'Avg %', angle: -90, position: 'insideLeft', style: { fontFamily: 'Neue Montreal', fontSize: 11 } }} />
              <Tooltip contentStyle={{ fontFamily: 'Neue Montreal', fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="avg_rate" fill="#3F6B55" radius={[4, 4, 0, 0]} name="Avg Rate %" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-brand-taupe/50 text-sm font-body text-center py-12">No data yet</p>
        )}
      </div>

      {/* Top Counties */}
      <div className="card">
        <h3 className="font-display font-semibold text-lg text-brand-taupe mb-4">Top Counties</h3>
        {data.topCounties.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.topCounties} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#635752" opacity={0.1} />
              <XAxis type="number" tick={{ fontSize: 11, fontFamily: 'Neue Montreal' }} />
              <YAxis type="category" dataKey="county" tick={{ fontSize: 11, fontFamily: 'Neue Montreal' }} width={80} />
              <Tooltip contentStyle={{ fontFamily: 'Neue Montreal', fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="avg_rate" fill="#E5A94D" radius={[0, 4, 4, 0]} name="Avg Rate %" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-brand-taupe/50 text-sm font-body text-center py-12">No data yet</p>
        )}
      </div>

      {/* Top Templates */}
      <div className="card">
        <h3 className="font-display font-semibold text-lg text-brand-taupe mb-4">Template Performance</h3>
        {data.topTemplates.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.topTemplates}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="avg_rate"
                nameKey="template"
                label={({ template, avg_rate }) => `${template.replace(/NewLandWS_|_/g, ' ').trim()} (${avg_rate.toFixed(1)}%)`}
                labelLine={true}
              >
                {data.topTemplates.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontFamily: 'Neue Montreal', fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-brand-taupe/50 text-sm font-body text-center py-12">No data yet</p>
        )}
      </div>
    </div>
  );
}
