'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import type { User } from '@/lib/types';

interface PlannerBatch {
  id: number;
  campaign_id: number;
  campaign_name: string;
  county: string;
  state: string;
  batch_number: number;
  lc_batch_id: string;
  template: string;
  message_count: number;
  owner_id: number;
  owner_name: string;
  local_target_time: string;
  actual_send_time: string | null;
  conversion_rate: number | null;
  reply_count: number | null;
  planned_date: string;
  notes: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'info';
}

const STATE_TZ_MAP: Record<string, string> = {
  AL:'America/Chicago',AK:'America/Anchorage',AZ:'America/Phoenix',AR:'America/Chicago',
  CA:'America/Los_Angeles',CO:'America/Denver',CT:'America/New_York',DE:'America/New_York',
  FL:'America/New_York',GA:'America/New_York',HI:'Pacific/Honolulu',ID:'America/Boise',
  IL:'America/Chicago',IN:'America/Indiana/Indianapolis',IA:'America/Chicago',KS:'America/Chicago',
  KY:'America/New_York',LA:'America/Chicago',ME:'America/New_York',MD:'America/New_York',
  MA:'America/New_York',MI:'America/New_York',MN:'America/Chicago',MS:'America/Chicago',
  MO:'America/Chicago',MT:'America/Denver',NE:'America/Chicago',NV:'America/Los_Angeles',
  NH:'America/New_York',NJ:'America/New_York',NM:'America/Denver',NY:'America/New_York',
  NC:'America/New_York',ND:'America/Chicago',OH:'America/New_York',OK:'America/Chicago',
  OR:'America/Los_Angeles',PA:'America/New_York',RI:'America/New_York',SC:'America/New_York',
  SD:'America/Chicago',TN:'America/Chicago',TX:'America/Chicago',UT:'America/Denver',
  VT:'America/New_York',VA:'America/New_York',WA:'America/Los_Angeles',WV:'America/New_York',
  WI:'America/Chicago',WY:'America/Denver',
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am–9pm

export default function PlannerPage() {
  const { data: session } = useSession();
  const [batches, setBatches] = useState<PlannerBatch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<string[]>([]);
  const [counties, setCounties] = useState<{ county: string; state: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // Time converter widget state
  const [convCounty, setConvCounty] = useState('');
  const [convHour, setConvHour] = useState(9);
  const [convDirection, setConvDirection] = useState<'myToCounty' | 'countyToMy'>('myToCounty');

  const [addingSlot, setAddingSlot] = useState<{ date: string; hour: number } | null>(null);
  const [form, setForm] = useState({
    campaign_id: '', template: '', message_count: 100, owner_id: '',
    local_target_hour: 8,
  });

  const [completingBatch, setCompletingBatch] = useState<PlannerBatch | null>(null);
  const [completeForm, setCompleteForm] = useState({ lc_batch_id: '', actual_send_hour: 8, conversion_rate: '' });

  // Edit batch
  const [editingBatch, setEditingBatch] = useState<PlannerBatch | null>(null);
  const [editForm, setEditForm] = useState({
    campaign_id: '', template: '', message_count: 100, owner_id: '', local_target_hour: 8,
  });

  // Drag state
  const draggingBatchId = useRef<number | null>(null);

  const weekDates = useMemo(() => {
    const today = new Date();
    const dow = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [weekOffset]);

  const startDate = weekDates[0];
  const endDate = weekDates[6];

  useEffect(() => { fetchAll(); }, [startDate, endDate]);

  // Load counties once on mount
  useEffect(() => {
    fetch('/api/settings?category=county').then(r => r.json()).then((data: any[]) => {
      const locs = data.map(d => ({ county: d.key, state: d.value }));
      setCounties(locs);
      if (locs.length > 0 && !convCounty) setConvCounty(locs[0].county);
    });
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [batchRes, usersRes, campRes, templatesRes] = await Promise.all([
      fetch(`/api/batches?start_date=${startDate}&end_date=${endDate}`).then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
      fetch('/api/campaigns').then(r => r.json()),
      fetch('/api/settings?category=template').then(r => r.json()),
    ]);
    setBatches(batchRes);
    setUsers(usersRes);
    setCampaigns(campRes);
    setTemplates(templatesRes.map((t: any) => t.value));
    setForm(f => ({
      ...f,
      owner_id: f.owner_id || (usersRes[0]?.id ? String(usersRes[0].id) : ''),
      template: f.template || templatesRes[0]?.value || '',
      campaign_id: f.campaign_id || (campRes[0]?.id ? String(campRes[0].id) : ''),
    }));
    setLoading(false);
  };

  const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    const id = ++toastId.current;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const batchGrid = useMemo(() => {
    const grid: Record<string, Record<number, PlannerBatch[]>> = {};
    weekDates.forEach(d => { grid[d] = {}; HOURS.forEach(h => { grid[d][h] = []; }); });
    batches.forEach(b => {
      if (!grid[b.planned_date]) return;
      const hour = parseInt(b.local_target_time.split(':')[0]);
      const nearest = HOURS.reduce((prev, curr) => Math.abs(curr - hour) < Math.abs(prev - hour) ? curr : prev);
      grid[b.planned_date][nearest].push(b);
    });
    return grid;
  }, [batches, weekDates]);

  const addBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingSlot) return;
    const time = `${String(form.local_target_hour).padStart(2, '0')}:00`;
    await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: Number(form.campaign_id),
        template: form.template,
        message_count: form.message_count,
        owner_id: Number(form.owner_id),
        local_target_time: time,
        planned_date: addingSlot.date,
      }),
    });
    setAddingSlot(null);
    await fetchAll();
    const camp = campaigns.find(c => String(c.id) === form.campaign_id);
    showToast(`Batch scheduled for ${camp?.name || 'campaign'} at ${formatHour(form.local_target_hour)}`, 'info');
  };

  const deleteBatch = async (id: number) => {
    if (!confirm('Delete this batch?')) return;
    await fetch(`/api/batches?id=${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const openEditBatch = (batch: PlannerBatch) => {
    setEditingBatch(batch);
    setEditForm({
      campaign_id: String(batch.campaign_id),
      template: batch.template,
      message_count: batch.message_count,
      owner_id: String(batch.owner_id),
      local_target_hour: parseInt(batch.local_target_time.split(':')[0]),
    });
  };

  const saveEditBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    const newTime = `${String(editForm.local_target_hour).padStart(2, '0')}:00`;
    await fetch('/api/batches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingBatch.id,
        campaign_id: Number(editForm.campaign_id),
        template: editForm.template,
        message_count: editForm.message_count,
        owner_id: Number(editForm.owner_id),
        local_target_time: newTime,
      }),
    });
    setEditingBatch(null);
    await fetchAll();
    showToast('Batch updated', 'info');
  };

  const duplicateBatch = async (batch: PlannerBatch, idx: number) => {
    // Next day in the week, or same day if last
    const currentIdx = weekDates.indexOf(batch.planned_date);
    const nextDate = weekDates[Math.min(currentIdx + 1, 6)];
    await fetch('/api/batches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: batch.campaign_id,
        template: batch.template,
        message_count: batch.message_count,
        owner_id: batch.owner_id,
        local_target_time: batch.local_target_time,
        planned_date: nextDate,
      }),
    });
    await fetchAll();
    const nextDayName = new Date(nextDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    showToast(`✅ Batch duplicated → ${nextDayName}`, 'success');
  };

  const markDone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingBatch) return;
    const convRate = parseFloat(completeForm.conversion_rate) || 0;
    const replyCount = Math.round(completingBatch.message_count * (convRate / 100) * 10) / 10;
    const actualTime = `${String(completeForm.actual_send_hour).padStart(2, '0')}:00`;
    await fetch('/api/batches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: completingBatch.id,
        lc_batch_id: completeForm.lc_batch_id,
        actual_send_time: actualTime,
        conversion_rate: convRate,
        reply_count: replyCount,
      }),
    });
    const batchRef = completingBatch;
    setCompletingBatch(null);
    setCompleteForm({ lc_batch_id: '', actual_send_hour: 8, conversion_rate: '' });
    await fetchAll();
    if (typeof window !== 'undefined') localStorage.setItem('dashboard_refresh', Date.now().toString());
    showToast(
      `🎉 Batch #${batchRef.batch_number} completed — ${Math.round(replyCount)} responses (${convRate}%)`,
      'success'
    );
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, batchId: number) => {
    draggingBatchId.current = batchId;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string, targetHour: number) => {
    e.preventDefault();
    const id = draggingBatchId.current;
    if (!id) return;
    const batch = batches.find(b => b.id === id);
    if (!batch) return;
    const newTime = `${String(targetHour).padStart(2, '0')}:00`;
    if (batch.planned_date === targetDate && batch.local_target_time === newTime) return;
    await fetch('/api/batches', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, planned_date: targetDate, local_target_time: newTime }),
    });
    draggingBatchId.current = null;
    await fetchAll();
    showToast(`Batch moved to ${new Date(targetDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${formatHour(targetHour)}`, 'info');
  };

  const getTimeQuality = useCallback((time: string, state: string): 'optimal' | 'good' | 'neutral' => {
    const h = parseInt(time.split(':')[0]);
    if ((h >= 8 && h < 9) || (h >= 10 && h < 12) || (h >= 17 && h < 19)) return 'optimal';
    if ((h >= 9 && h < 10) || (h >= 12 && h < 14) || (h >= 16 && h < 17)) return 'good';
    return 'neutral';
  }, []);

  const qualityStyle = (q: 'optimal' | 'good' | 'neutral', done: boolean) => {
    if (done) return 'border-l-emerald-600 bg-emerald-50 border-emerald-200';
    if (q === 'optimal') return 'border-l-emerald-500 bg-emerald-50/60 border-blue-200';
    if (q === 'good') return 'border-l-amber-400 bg-amber-50/60 border-blue-200';
    return 'border-l-slate-300 bg-slate-50/60 border-blue-200';
  };

  const qualityDot = (q: 'optimal' | 'good' | 'neutral') => {
    if (q === 'optimal') return 'bg-emerald-500';
    if (q === 'good') return 'bg-amber-400';
    return 'bg-slate-300';
  };

  const isDone = (b: PlannerBatch) => b.conversion_rate != null && b.actual_send_time != null;

  const formatWeekRange = () => {
    const s = new Date(startDate + 'T12:00:00');
    const e = new Date(endDate + 'T12:00:00');
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const selectedCampaign = campaigns.find(c => String(c.id) === form.campaign_id);
  const today = new Date().toISOString().split('T')[0];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Time converter: my TZ (session user) → county's local TZ
  const convSelectedCounty = counties.find(c => c.county === convCounty);
  const convStateTz = convSelectedCounty ? (STATE_TZ_MAP[convSelectedCounty.state] || 'America/New_York') : null;
  // Use session user's TZ (pulled from their user record)
  const sessionUserTz = useMemo(() => {
    if (!session?.user) return 'America/New_York';
    const su = users.find(u => u.username === (session.user as any).username || u.display_name === session.user?.name);
    return su?.timezone || (session.user as any).timezone || 'America/New_York';
  }, [session, users]);
  const sessionUserLabel = useMemo(() => {
    const su = users.find(u => u.username === (session?.user as any)?.username || u.display_name === session?.user?.name);
    return su?.tz_label || (session?.user as any)?.tz_label || 'My TZ';
  }, [session, users]);
  const convResult = useMemo(() => {
    if (!convStateTz) return null;
    const refDate = new Date(`${today}T${String(convHour).padStart(2,'0')}:00:00Z`);
    const myOffset = getOffset(sessionUserTz, refDate);
    const countyOffset = getOffset(convStateTz, refDate);
    // myToCounty: diff = county - my  |  countyToMy: diff = my - county
    const diff = convDirection === 'myToCounty' ? countyOffset - myOffset : myOffset - countyOffset;
    const total = convHour * 60 + diff;
    let rh = Math.floor(total / 60) % 24;
    if (rh < 0) rh += 24;
    const shift = total >= 24 * 60 ? ' +1d' : total < 0 ? ' -1d' : '';
    // Quality ALWAYS reflects the county local time, regardless of direction
    // myToCounty → county time is rh (the output)
    // countyToMy → county time is convHour (the input)
    const countyLocalHour = convDirection === 'myToCounty' ? rh : convHour;
    const quality = getTimeQuality(`${String(countyLocalHour).padStart(2,'0')}:00`, convSelectedCounty?.state || '');
    return { time: formatHour(rh) + shift, quality, countyIsResult: convDirection === 'myToCounty' };
  }, [convHour, convStateTz, sessionUserTz, convDirection, today]);

  return (
    <div className="h-full flex flex-col relative">

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-xl shadow-lg text-sm font-body font-medium flex items-center gap-2 pointer-events-auto animate-fade-in ${
            t.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-brand-pine text-white'
          }`}>
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4 flex-shrink-0">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-taupe">Weekly Planner</h1>
          <p className="font-body text-sm text-brand-taupe/60 mt-1">{formatWeekRange()}</p>
        </div>

        {/* Time Converter Widget */}
        {counties.length > 0 && users.length > 0 && (
          <div className="flex items-center gap-2 bg-brand-ivory border border-brand-taupe/15 rounded-xl px-3 py-2 flex-shrink-0">
            <span className="text-[11px] font-body font-semibold text-brand-taupe/50 uppercase tracking-wide mr-1" title="Quick time converter between your timezone and county local time">TZ Check</span>

            {/* Left side: input (source) — when countyToMy, this IS the county time → show quality here */}
            <div className={`flex flex-col items-center px-1.5 py-0.5 rounded-lg ${
              convResult && !convResult.countyIsResult
                ? convResult.quality === 'optimal' ? 'bg-emerald-50 border border-emerald-200'
                : convResult.quality === 'good'    ? 'bg-amber-50 border border-amber-200'
                :                                   'bg-slate-50 border border-slate-200'
                : ''
            }`}>
              <span className={`text-[9px] font-body mb-0.5 ${
                convResult && !convResult.countyIsResult
                  ? convResult.quality === 'optimal' ? 'text-emerald-500'
                  : convResult.quality === 'good'    ? 'text-amber-500'
                  :                                   'text-slate-400'
                  : 'text-brand-taupe/40'
              }`}>
                {convDirection === 'myToCounty' ? sessionUserLabel : `${convSelectedCounty?.state || 'County'} Local`}
              </span>
              <select
                value={convHour}
                onChange={e => setConvHour(Number(e.target.value))}
                className="text-xs font-body font-semibold text-brand-taupe bg-white border border-brand-taupe/20 rounded-lg px-2 py-1 focus:outline-none focus:border-brand-pine"
                title={convDirection === 'myToCounty' ? 'Your time to convert' : 'County local time to convert'}
              >
                {HOURS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
              </select>
              {/* Quality badge on input side when county time is the input */}
              {convResult && !convResult.countyIsResult && (
                <span className={`text-[9px] font-body capitalize mt-0.5 ${
                  convResult.quality === 'optimal' ? 'text-emerald-500'
                  : convResult.quality === 'good'  ? 'text-amber-500'
                  :                                  'text-slate-400'
                }`}>{convResult.quality}</span>
              )}
            </div>

            {/* Swap button */}
            <button
              onClick={() => setConvDirection(d => d === 'myToCounty' ? 'countyToMy' : 'myToCounty')}
              className="flex flex-col items-center text-brand-taupe/40 hover:text-brand-pine transition-colors group"
              title={convDirection === 'myToCounty' ? 'Switch: show county → my time' : 'Switch: show my → county time'}
            >
              <span className="text-[8px] font-body mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">swap</span>
              <span className="text-base leading-none">⇄</span>
            </button>

            {/* County selector */}
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-body text-brand-taupe/40 mb-0.5">County</span>
              <select
                value={convCounty}
                onChange={e => setConvCounty(e.target.value)}
                className="text-xs font-body font-semibold text-brand-taupe bg-white border border-brand-taupe/20 rounded-lg px-2 py-1 focus:outline-none focus:border-brand-pine"
                title="Select county"
              >
                {counties.map(c => <option key={c.county} value={c.county}>{c.county}, {c.state}</option>)}
              </select>
            </div>

            <span className="text-brand-taupe/30 text-sm">→</span>

            {/* Result — quality coloring only when county time is on this side (myToCounty) */}
            {convResult && (
              <div className={`flex flex-col items-center min-w-[56px] px-2.5 py-1 rounded-lg border ${
                convResult.countyIsResult
                  ? convResult.quality === 'optimal' ? 'bg-emerald-50 border-emerald-200'
                  : convResult.quality === 'good'    ? 'bg-amber-50 border-amber-200'
                  :                                   'bg-slate-50 border-slate-200'
                  : 'bg-white border-brand-taupe/15'
              }`}>
                <span className="text-[9px] font-body text-brand-taupe/40 mb-0.5">
                  {convDirection === 'myToCounty' ? `${convSelectedCounty?.state || 'County'} Local` : sessionUserLabel}
                </span>
                <span className={`text-sm font-body font-bold ${
                  convResult.countyIsResult
                    ? convResult.quality === 'optimal' ? 'text-emerald-700'
                    : convResult.quality === 'good'    ? 'text-amber-700'
                    :                                   'text-slate-600'
                    : 'text-brand-taupe'
                }`}>{convResult.time}</span>
                {/* Quality label only when this is the county-local side */}
                {convResult.countyIsResult && (
                  <span className={`text-[9px] font-body capitalize ${
                    convResult.quality === 'optimal' ? 'text-emerald-500' :
                    convResult.quality === 'good'    ? 'text-amber-500' :
                                                       'text-slate-400'
                  }`}>{convResult.quality}</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="btn-outline text-sm px-3" title="Previous week">← Prev</button>
          <button onClick={() => setWeekOffset(0)} className="btn-secondary text-sm px-3" title="Jump to current week">This Week</button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="btn-outline text-sm px-3" title="Next week">Next →</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-3 text-xs font-body flex-shrink-0">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Optimal (8–9am, 10am–12pm, 5–7pm)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Good (9–10am, 12–2pm, 4–5pm)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-blue-400 bg-blue-50"></span> Planned</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-emerald-600 bg-emerald-100"></span> Done</span>
        <span className="flex items-center gap-1.5 text-brand-taupe/50">Drag cards to move · Hover cell → <kbd className="bg-brand-taupe/10 px-1 rounded text-[10px]">+</kbd> to add</span>
      </div>

      {loading ? (
        <div className="text-center py-20 text-brand-taupe/50 font-body">Loading planner...</div>
      ) : (
        <div className="flex-1 overflow-auto border border-brand-taupe/15 rounded-xl bg-white">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            {/* Day Headers */}
            <thead className="sticky top-0 z-20 bg-white">
              <tr>
                <th className="w-14 border-b border-r border-brand-taupe/15 bg-brand-ivory px-1 py-2 text-[10px] font-body font-semibold text-brand-taupe/40 text-center">TIME</th>
                {weekDates.map((date, idx) => {
                  const isToday = date === today;
                  return (
                    <th key={date} className={`border-b border-r last:border-r-0 border-brand-taupe/15 px-2 py-2 text-center ${isToday ? 'bg-brand-pine/10' : 'bg-brand-ivory'}`}>
                      <div className={`font-display font-semibold text-sm ${isToday ? 'text-brand-pine' : 'text-brand-taupe'}`}>{dayNames[idx]}</div>
                      <div className={`text-xs font-body mt-0.5 ${isToday ? 'text-brand-pine font-medium' : 'text-brand-taupe/50'}`}>
                        {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Time Grid */}
            <tbody>
              {HOURS.map(hour => {
                const isOptimal = (hour >= 8 && hour < 9) || (hour >= 10 && hour < 12) || (hour >= 17 && hour < 19);
                const isGood = (hour >= 9 && hour < 10) || (hour >= 12 && hour < 14) || (hour >= 16 && hour < 17);
                return (
                  <tr key={hour} className={isOptimal ? 'bg-emerald-50/25' : isGood ? 'bg-amber-50/15' : ''}>
                    {/* Time label */}
                    <td className="border-b border-r border-brand-taupe/10 px-1 py-1.5 text-center align-top">
                      <span className={`text-[11px] font-body font-semibold ${isOptimal ? 'text-emerald-600' : isGood ? 'text-amber-600' : 'text-brand-taupe/35'}`}>
                        {formatHour(hour)}
                      </span>
                    </td>

                    {/* Day cells */}
                    {weekDates.map((date) => {
                      const isToday = date === today;
                      const cellBatches = batchGrid[date]?.[hour] || [];
                      return (
                        <td
                          key={date}
                          className={`border-b border-r last:border-r-0 border-brand-taupe/10 px-1 py-1 align-top min-h-[52px] ${isToday ? 'bg-brand-pine/[0.03]' : ''} group/cell hover:bg-brand-pine/[0.04] transition-colors`}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, date, hour)}
                        >
                          <div className="space-y-1 min-h-[44px]">
                            {cellBatches.map((batch) => {
                              const done = isDone(batch);
                              const quality = getTimeQuality(batch.local_target_time, batch.state);
                              return (
                                <div
                                  key={batch.id}
                                  draggable={!done}
                                  onDragStart={(e) => handleDragStart(e, batch.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`rounded-md border-l-[3px] border px-2 py-1.5 text-[11px] font-body transition-all hover:shadow-md ${done ? '' : 'cursor-grab active:cursor-grabbing'} ${qualityStyle(quality, done)} group/card`}
                                  title={done ? 'Batch completed' : 'Drag to move to a different time/day'}
                                >
                                  {/* Row 1: Status badge + time + quality dot + actions */}
                                  <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1.5">
                                      {done ? (
                                        <span className="px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wide bg-emerald-600 text-white">Done</span>
                                      ) : (
                                        <span className="px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wide bg-blue-500 text-white">Plan</span>
                                      )}
                                      <span className="font-medium text-brand-taupe">{formatHour(hour)}</span>
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${qualityDot(quality)}`} title={`${quality} window`}></span>
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                      {!done && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setCompletingBatch(batch); setCompleteForm({ lc_batch_id: batch.lc_batch_id || '', actual_send_hour: hour, conversion_rate: '' }); }}
                                          className="hover:scale-110 transition-transform text-[10px]"
                                          title="Mark as Done — enter results"
                                        >✅</button>
                                      )}
                                      <button onClick={(e) => { e.stopPropagation(); openEditBatch(batch); }} className="hover:scale-110 transition-transform text-[10px]" title="Edit batch details">✏️</button>
                                      <button onClick={(e) => { e.stopPropagation(); duplicateBatch(batch, weekDates.indexOf(date)); }} className="hover:scale-110 transition-transform text-[10px]" title="Duplicate to next day">📋</button>
                                      <button onClick={(e) => { e.stopPropagation(); deleteBatch(batch.id); }} className="hover:scale-110 transition-transform text-[10px]" title="Delete batch">🗑️</button>
                                    </div>
                                  </div>

                                  {/* Row 2: Campaign + Template */}
                                  <div className="mt-1">
                                    <p className="font-semibold text-brand-taupe truncate" title={batch.campaign_name}>{batch.campaign_name}</p>
                                    <p className="text-brand-taupe/55 truncate" title={batch.template}>{batch.template.replace(/NewLandWS_|_/g, ' ').trim()}</p>
                                  </div>

                                  {/* Row 3: Volume + Owner */}
                                  <div className="flex items-center justify-between mt-1 text-[10px]">
                                    <span className="text-brand-taupe/60">{batch.message_count} msgs</span>
                                    <span className="font-medium text-brand-taupe">{batch.owner_name}</span>
                                  </div>

                                  {/* Row 4: TZ conversions — always visible */}
                                  <div className="mt-1 pt-1 border-t border-brand-taupe/10">
                                    {users.map(u => (
                                      <div key={u.id} className="flex justify-between text-[9px] text-brand-taupe/45">
                                        <span>{u.display_name} ({u.tz_label})</span>
                                        <span className="font-medium">{convertTimeSimple(batch.local_target_time, batch.planned_date, u.timezone)}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Row 5: Results if done */}
                                  {done && (
                                    <div className="mt-1 pt-1 border-t border-emerald-200 flex items-center justify-between text-[10px] group/results">
                                      <span className="text-emerald-700 font-medium">{batch.conversion_rate}% conv</span>
                                      <span className="text-emerald-700 font-medium">{Math.round(batch.reply_count || 0)} replies</span>
                                      {batch.lc_batch_id && <span className="text-emerald-600/60">LC#{batch.lc_batch_id}</span>}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const actualHour = batch.actual_send_time ? parseInt(batch.actual_send_time.split(':')[0]) : hour;
                                          setCompletingBatch(batch);
                                          setCompleteForm({ lc_batch_id: batch.lc_batch_id || '', actual_send_hour: actualHour, conversion_rate: String(batch.conversion_rate ?? '') });
                                        }}
                                        className="opacity-0 group-hover/results:opacity-100 transition-opacity text-emerald-500 hover:text-emerald-700 hover:scale-110"
                                        title="Update results"
                                      >✏️</button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* + Add button — always visible on hover */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setAddingSlot({ date, hour }); setForm(f => ({ ...f, local_target_hour: hour })); }}
                              className={`w-full text-center rounded py-0.5 text-[10px] font-body text-brand-taupe transition-opacity ${cellBatches.length === 0 ? 'opacity-0 group-hover/cell:opacity-50 min-h-[40px] flex items-center justify-center' : 'opacity-0 group-hover/cell:opacity-70 hover:!opacity-100 hover:bg-brand-pine/10'}`}
                              title="Add batch to this slot"
                            >
                              + {cellBatches.length === 0 ? 'Add' : ''}
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ===================== EDIT BATCH MODAL ===================== */}
      {editingBatch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditingBatch(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display font-semibold text-xl text-brand-taupe">Edit Batch</h3>
              <span className="text-xs font-body text-brand-taupe/40 bg-brand-ivory px-2 py-1 rounded-lg">
                #{editingBatch.batch_number} · {new Date(editingBatch.planned_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <p className="font-body text-sm text-brand-taupe/60 mb-4">{editingBatch.campaign_name}</p>

            <form onSubmit={saveEditBatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Campaign</label>
                  <select value={editForm.campaign_id} onChange={(e) => setEditForm({ ...editForm, campaign_id: e.target.value })} className="select-field" required>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} ({c.county}, {c.state})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Template</label>
                  <select value={editForm.template} onChange={(e) => setEditForm({ ...editForm, template: e.target.value })} className="select-field" required>
                    {templates.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Volume</label>
                  <select value={editForm.message_count} onChange={(e) => setEditForm({ ...editForm, message_count: Number(e.target.value) })} className="select-field">
                    <option value={50}>50 messages</option>
                    <option value={100}>100 messages</option>
                    <option value={150}>150 messages</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Owner</label>
                  <select value={editForm.owner_id} onChange={(e) => setEditForm({ ...editForm, owner_id: e.target.value })} className="select-field" required>
                    {users.map(u => <option key={u.id} value={u.id}>{u.display_name} ({u.tz_label})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Target Local Time</label>
                  <select value={editForm.local_target_hour} onChange={(e) => setEditForm({ ...editForm, local_target_hour: Number(e.target.value) })} className="select-field">
                    {HOURS.map(h => {
                      const camp = campaigns.find(c => String(c.id) === editForm.campaign_id);
                      const q = getTimeQuality(`${String(h).padStart(2,'0')}:00`, camp?.state || '');
                      return (
                        <option key={h} value={h}>
                          {formatHour(h)}{q === 'optimal' ? ' ⭐ Optimal' : q === 'good' ? ' ✓ Good' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Time quality indicator */}
              {(() => {
                const camp = campaigns.find(c => String(c.id) === editForm.campaign_id);
                if (!camp) return null;
                const q = getTimeQuality(`${String(editForm.local_target_hour).padStart(2, '0')}:00`, camp.state);
                return (
                  <div className={`rounded-lg px-3 py-2.5 text-sm font-body flex items-center gap-2 ${
                    q === 'optimal' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    q === 'good'    ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                     'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${qualityDot(q)}`}></span>
                    <span className="font-medium capitalize">{q} send window</span>
                    <span className="text-xs opacity-70">for {camp.state} ({camp.county})</span>
                  </div>
                );
              })()}

              {/* TZ preview */}
              <div className="bg-brand-ivory rounded-lg p-3">
                <p className="text-xs font-body font-semibold text-brand-taupe/70 mb-2">Team Schedule Preview</p>
                <div className="space-y-1.5">
                  {users.map(u => {
                    const converted = convertTimeSimple(`${String(editForm.local_target_hour).padStart(2,'0')}:00`, editingBatch.planned_date, u.timezone);
                    return (
                      <div key={u.id} className="flex justify-between text-sm font-body">
                        <span className="text-brand-taupe/60">{u.display_name} ({u.tz_label})</span>
                        <span className="font-semibold text-brand-taupe">{converted}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" title="Save changes">Save Changes</button>
                <button type="button" onClick={() => setEditingBatch(null)} className="btn-outline" title="Cancel">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== ADD BATCH MODAL ===================== */}
      {addingSlot && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setAddingSlot(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-semibold text-xl text-brand-taupe mb-1">Schedule Batch</h3>
            <p className="font-body text-sm text-brand-taupe/60 mb-4">
              {new Date(addingSlot.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>

            <form onSubmit={addBatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Campaign</label>
                  <select value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })} className="select-field" required>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name} ({c.county}, {c.state})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Template</label>
                  <select value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} className="select-field" required>
                    {templates.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Volume</label>
                  <select value={form.message_count} onChange={(e) => setForm({ ...form, message_count: Number(e.target.value) })} className="select-field">
                    <option value={50}>50 messages</option>
                    <option value={100}>100 messages</option>
                    <option value={150}>150 messages</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Owner</label>
                  <select value={form.owner_id} onChange={(e) => setForm({ ...form, owner_id: e.target.value })} className="select-field" required>
                    {users.map(u => <option key={u.id} value={u.id}>{u.display_name} ({u.tz_label})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Target Local Time</label>
                  <select value={form.local_target_hour} onChange={(e) => setForm({ ...form, local_target_hour: Number(e.target.value) })} className="select-field">
                    {HOURS.map(h => (
                      <option key={h} value={h}>
                        {formatHour(h)}{getTimeQuality(`${String(h).padStart(2,'0')}:00`, selectedCampaign?.state || '') === 'optimal' ? ' ⭐ Optimal' : getTimeQuality(`${String(h).padStart(2,'0')}:00`, selectedCampaign?.state || '') === 'good' ? ' ✓ Good' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Time quality indicator */}
              {selectedCampaign && (() => {
                const q = getTimeQuality(`${String(form.local_target_hour).padStart(2, '0')}:00`, selectedCampaign.state);
                return (
                  <div className={`rounded-lg px-3 py-2.5 text-sm font-body flex items-center gap-2 ${
                    q === 'optimal' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    q === 'good' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-gray-50 text-gray-600 border border-gray-200'
                  }`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${qualityDot(q)}`}></span>
                    <span className="font-medium capitalize">{q} send window</span>
                    <span className="text-xs opacity-70">for {selectedCampaign.state} ({selectedCampaign.county})</span>
                  </div>
                );
              })()}

              {/* TZ preview */}
              <div className="bg-brand-ivory rounded-lg p-3">
                <p className="text-xs font-body font-semibold text-brand-taupe/70 mb-2">Team Schedule Preview</p>
                <div className="space-y-1.5">
                  {users.map(u => {
                    const converted = convertTimeSimple(`${String(form.local_target_hour).padStart(2,'0')}:00`, addingSlot.date, u.timezone);
                    return (
                      <div key={u.id} className="flex justify-between text-sm font-body">
                        <span className="text-brand-taupe/60">{u.display_name} ({u.tz_label})</span>
                        <span className="font-semibold text-brand-taupe">{converted}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1" title="Schedule this batch">Schedule Batch</button>
                <button type="button" onClick={() => setAddingSlot(null)} className="btn-outline" title="Cancel">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MARK DONE MODAL ===================== */}
      {completingBatch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setCompletingBatch(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-semibold text-xl text-brand-taupe mb-1">
              {isDone(completingBatch) ? 'Update Results' : 'Mark Batch as Done'}
            </h3>
            <p className="font-body text-sm text-brand-taupe/60 mb-4">
              {completingBatch.campaign_name} — Batch #{completingBatch.batch_number}
            </p>
            <form onSubmit={markDone} className="space-y-4">
              <div>
                <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">LC Batch # (from Launch Control)</label>
                <input
                  value={completeForm.lc_batch_id}
                  onChange={(e) => setCompleteForm({ ...completeForm, lc_batch_id: e.target.value })}
                  className="input-field"
                  placeholder="e.g. 12345"
                />
              </div>
              <div>
                <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Actual Send Time</label>
                <select value={completeForm.actual_send_hour} onChange={(e) => setCompleteForm({ ...completeForm, actual_send_hour: Number(e.target.value) })} className="select-field">
                  {HOURS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Conversion Rate (%)</label>
                <input
                  type="number" step="0.1" min="0" max="100"
                  value={completeForm.conversion_rate}
                  onChange={(e) => setCompleteForm({ ...completeForm, conversion_rate: e.target.value })}
                  className="input-field"
                  placeholder="e.g. 3.5"
                  required
                />
              </div>

              {completeForm.conversion_rate && (
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-emerald-700">Estimated Replies:</span>
                    <span className="font-bold text-emerald-800 text-base">
                      {Math.round(completingBatch.message_count * (parseFloat(completeForm.conversion_rate) / 100) * 10) / 10}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-600/70 mt-0.5">{completingBatch.message_count} msgs × {completeForm.conversion_rate}%</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 py-2.5 px-4 rounded-lg font-body font-medium text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-colors" title="Confirm completion">
                  Mark as Done
                </button>
                <button type="button" onClick={() => setCompletingBatch(null)} className="btn-outline" title="Cancel">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function convertTimeSimple(localTime: string, localDate: string, targetTz: string): string {
  try {
    const [h, m] = localTime.split(':').map(Number);
    const refDate = new Date(`${localDate}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00Z`);
    const etOffset = getOffset('America/New_York', refDate);
    const targetOffset = getOffset(targetTz, refDate);
    const diff = targetOffset - etOffset;
    const total = h * 60 + m + diff;
    let rh = Math.floor(total / 60) % 24;
    let rm = total % 60;
    if (rh < 0) rh += 24;
    if (rm < 0) rm += 60;
    const shift = total >= 24 * 60 ? ' +1d' : total < 0 ? ' -1d' : '';
    const hh = rh === 0 || rh === 24 ? '12' : rh <= 12 ? String(rh) : String(rh - 12);
    const ampm = rh < 12 ? 'am' : 'pm';
    return `${hh}:${String(rm).padStart(2,'0')}${ampm}${shift}`;
  } catch { return localTime; }
}

function getOffset(tz: string, date: Date): number {
  const utcStr = date.toLocaleString('en-US', { timeZone: 'UTC' });
  const tzStr = date.toLocaleString('en-US', { timeZone: tz });
  return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 60000;
}
