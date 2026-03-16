'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StatusBadge, { nextStatus } from '@/components/StatusBadge';
import type { User } from '@/lib/types';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    template: '', message_count: 100, owner_id: '', local_target_time: '08:30',
    planned_date: new Date().toISOString().split('T')[0], lc_batch_id: '', notes: '',
  });

  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    const [campRes, usersRes, templatesRes] = await Promise.all([
      fetch(`/api/campaigns/${id}`).then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
      fetch('/api/settings?category=template').then(r => r.json()),
    ]);
    setCampaign(campRes);
    setBatches(campRes.batches || []);
    setUsers(usersRes);
    setTemplates(templatesRes.map((t: any) => t.value));
    if (usersRes.length > 0 && !form.owner_id) {
      setForm(f => ({ ...f, owner_id: String(usersRes[0].id) }));
    }
    if (templatesRes.length > 0 && !form.template) {
      setForm(f => ({ ...f, template: templatesRes[0].value }));
    }
    setLoading(false);
  };

  const addBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, campaign_id: id, owner_id: Number(form.owner_id) }),
    });
    setShowAdd(false);
    fetchAll();
  };

  const updateBatch = async (batchId: number) => {
    await fetch('/api/batches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: batchId, ...editForm }),
    });
    setEditingId(null);
    fetchAll();
  };

  const deleteBatch = async (batchId: number) => {
    if (!confirm('Delete this batch?')) return;
    await fetch(`/api/batches?id=${batchId}`, { method: 'DELETE' });
    fetchAll();
  };

  const duplicateBatch = async (batch: any) => {
    const tomorrow = new Date(batch.planned_date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: id,
        template: batch.template,
        message_count: batch.message_count,
        owner_id: batch.owner_id,
        local_target_time: batch.local_target_time,
        planned_date: tomorrow.toISOString().split('T')[0],
      }),
    });
    fetchAll();
  };

  const toggleCampaignStatus = async () => {
    if (!campaign) return;
    await fetch(`/api/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus[campaign.status] }),
    });
    fetchAll();
  };

  // Get optimal time class
  const getTimeClass = (time: string) => {
    const [h] = time.split(':').map(Number);
    if ((h >= 8 && h < 9) || (h >= 10 && h < 12) || (h >= 17 && h < 19)) return 'bg-brand-pine/10 text-brand-pine';
    if ((h >= 9 && h < 10) || (h >= 12 && h < 14) || (h >= 16 && h < 17)) return 'bg-brand-gold/10 text-brand-gold-dark';
    return '';
  };

  if (loading) return <div className="text-center py-20 text-brand-taupe/50 font-body">Loading...</div>;
  if (!campaign) return <div className="text-center py-20 text-brand-taupe/50 font-body">Campaign not found</div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.push('/campaigns')} className="text-brand-taupe/50 hover:text-brand-pine text-sm">
          ← Campaigns
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-bold text-brand-taupe">{campaign.name}</h1>
            <StatusBadge status={campaign.status} onClick={toggleCampaignStatus} size="md" />
          </div>
          <p className="font-body text-sm text-brand-taupe/60 mt-1">📍 {campaign.county}, {campaign.state}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary">
          + Add Batch
        </button>
      </div>

      {/* Add Batch Form */}
      {showAdd && (
        <div className="card mb-6">
          <h3 className="font-display font-semibold text-lg text-brand-taupe mb-4">Add Batch</h3>
          <form onSubmit={addBatch} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Template</label>
              <select value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} className="select-field" required>
                {templates.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Messages</label>
              <select value={form.message_count} onChange={(e) => setForm({ ...form, message_count: Number(e.target.value) })} className="select-field">
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={150}>150</option>
                <option value={200}>200</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Owner</label>
              <select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} className="select-field" required>
                {users.map(u => <option key={u.id} value={u.id}>{u.display_name} ({u.tz_label})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Local Target Time</label>
              <input type="time" value={form.local_target_time} onChange={(e) => setForm({ ...form, local_target_time: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Planned Date</label>
              <input type="date" value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">LC Batch #</label>
              <input value={form.lc_batch_id} onChange={(e) => setForm({ ...form, lc_batch_id: e.target.value })} className="input-field" placeholder="LC-XXX" />
            </div>
            <div>
              <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Notes</label>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" placeholder="Optional" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary flex-1">Add</button>
              <button type="button" onClick={() => setShowAdd(false)} className="btn-outline">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Batches Table */}
      {batches.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-brand-taupe/50 font-body">No batches yet. Add your first batch!</p>
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <th className="table-header">#</th>
                <th className="table-header">LC Batch</th>
                <th className="table-header">Template</th>
                <th className="table-header">Msgs</th>
                <th className="table-header">Owner</th>
                <th className="table-header">Date</th>
                <th className="table-header">Target Time</th>
                {users.map(u => (
                  <th key={u.id} className="table-header text-brand-gold">{u.display_name} ({u.tz_label})</th>
                ))}
                <th className="table-header">Actual Send</th>
                <th className="table-header">Conv %</th>
                <th className="table-header">Replies</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} className="hover:bg-brand-ivory/50 transition-colors">
                  <td className="table-cell font-medium">{batch.batch_number}</td>
                  <td className="table-cell text-xs">{batch.lc_batch_id || '-'}</td>
                  <td className="table-cell text-xs">{batch.template.replace(/NewLandWS_|_/g, ' ').trim()}</td>
                  <td className="table-cell">{batch.message_count}</td>
                  <td className="table-cell">{batch.owner_name}</td>
                  <td className="table-cell text-xs">{batch.planned_date}</td>
                  <td className={`table-cell font-medium ${getTimeClass(batch.local_target_time)}`}>
                    {batch.local_target_time}
                  </td>
                  {users.map(u => {
                    // Simple TZ conversion display (calculated client-side)
                    const time = convertTimeSimple(batch.local_target_time, batch.planned_date, u.timezone);
                    return (
                      <td key={u.id} className="table-cell text-xs text-brand-taupe/70">{time}</td>
                    );
                  })}
                  <td className="table-cell">
                    {editingId === batch.id ? (
                      <input
                        type="time"
                        value={editForm.actual_send_time || ''}
                        onChange={(e) => setEditForm({ ...editForm, actual_send_time: e.target.value })}
                        className="input-field text-xs w-24"
                      />
                    ) : (
                      <span className="text-xs">{batch.actual_send_time || '-'}</span>
                    )}
                  </td>
                  <td className="table-cell">
                    {editingId === batch.id ? (
                      <input
                        type="number"
                        step="0.1"
                        value={editForm.conversion_rate ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, conversion_rate: e.target.value ? Number(e.target.value) : null })}
                        className="input-field text-xs w-20"
                        placeholder="%"
                      />
                    ) : (
                      <span className={batch.conversion_rate ? 'font-medium text-brand-pine' : 'text-brand-taupe/40'}>
                        {batch.conversion_rate ? `${batch.conversion_rate}%` : '-'}
                      </span>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={batch.reply_count ? 'font-medium text-brand-gold-dark' : 'text-brand-taupe/40'}>
                      {batch.reply_count != null ? Math.round(batch.reply_count) : '-'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {editingId === batch.id ? (
                        <>
                          <button onClick={() => updateBatch(batch.id)} className="text-brand-pine text-xs hover:underline">Save</button>
                          <button onClick={() => setEditingId(null)} className="text-brand-taupe/50 text-xs hover:underline">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingId(batch.id); setEditForm({ actual_send_time: batch.actual_send_time || '', conversion_rate: batch.conversion_rate }); }}
                            className="text-brand-pine text-xs hover:underline"
                            title="Edit performance"
                          >
                            ✏️
                          </button>
                          <button onClick={() => duplicateBatch(batch)} className="text-brand-gold text-xs hover:underline" title="Duplicate to next day">📋</button>
                          <button onClick={() => deleteBatch(batch.id)} className="text-red-400 text-xs hover:underline" title="Delete">🗑️</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Client-side timezone conversion
function convertTimeSimple(localTime: string, localDate: string, targetTz: string): string {
  try {
    const [h, m] = localTime.split(':').map(Number);
    // Create date in ET (default campaign timezone)
    const dateStr = `${localDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;

    // Use Intl to format in both timezones
    const refDate = new Date(dateStr + 'Z');
    const etOffset = getOffset('America/New_York', refDate);
    const targetOffset = getOffset(targetTz, refDate);

    const diffMinutes = targetOffset - etOffset;
    const totalMinutes = h * 60 + m + diffMinutes;

    let resultH = Math.floor(totalMinutes / 60) % 24;
    let resultM = totalMinutes % 60;
    if (resultH < 0) resultH += 24;
    if (resultM < 0) resultM += 60;

    const dayShift = totalMinutes >= 24 * 60 ? ' (+1d)' : totalMinutes < 0 ? ' (-1d)' : '';

    return `${String(resultH).padStart(2, '0')}:${String(resultM).padStart(2, '0')}${dayShift}`;
  } catch {
    return localTime;
  }
}

function getOffset(tz: string, date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: tz });
  return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 60000;
}
