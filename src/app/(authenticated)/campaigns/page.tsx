'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StatusBadge, { nextStatus } from '@/components/StatusBadge';
import type { Setting } from '@/lib/types';

interface LocationOption {
  county: string;
  state: string;
  label: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', county: '', state: '' });
  const [locations, setLocations] = useState<LocationOption[]>([]);

  useEffect(() => {
    fetchCampaigns();
    fetchLocations();
  }, []);

  const fetchCampaigns = async () => {
    const res = await fetch('/api/campaigns');
    setCampaigns(await res.json());
    setLoading(false);
  };

  const fetchLocations = async () => {
    // County settings: key=county name, value=state abbreviation
    const res = await fetch('/api/settings?category=county');
    const countySettings: Setting[] = await res.json();
    const locs = countySettings.map(c => ({
      county: c.key,
      state: c.value,
      label: `${c.key}, ${c.value}`,
    }));
    setLocations(locs);
  };

  const handleLocationChange = (label: string) => {
    const loc = locations.find(l => l.label === label);
    if (loc) {
      setForm({ ...form, county: loc.county, state: loc.state, name: form.name || `${loc.county}_${loc.state}` });
    } else {
      setForm({ ...form, county: '', state: '' });
    }
  };

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ name: '', county: '', state: '' });
    setShowCreate(false);
    fetchCampaigns();
  };

  const toggleStatus = async (campaign: any) => {
    const newStatus = nextStatus[campaign.status];
    await fetch(`/api/campaigns/${campaign.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchCampaigns();
  };

  const deleteCampaign = async (id: number) => {
    if (!confirm('Delete this campaign and all its batches?')) return;
    await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
    fetchCampaigns();
  };

  const selectedLocation = locations.find(l => l.county === form.county && l.state === form.state);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-brand-taupe">Campaigns</h1>
          <p className="font-body text-sm text-brand-taupe/60 mt-1">Manage your SMS campaigns</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary" title="Create a new campaign">
          + New Campaign
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="card mb-6">
          <h3 className="font-display font-semibold text-lg text-brand-taupe mb-4">Create Campaign</h3>
          <form onSubmit={createCampaign} className="flex flex-wrap gap-3 items-end">
            <div className="w-56">
              <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Location</label>
              <select
                value={selectedLocation?.label || ''}
                onChange={(e) => handleLocationChange(e.target.value)}
                className="select-field"
                required
              >
                <option value="">Select location...</option>
                {locations.map(l => <option key={l.label} value={l.label}>{l.label}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Campaign Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                placeholder="e.g., Putnam_FL"
                required
              />
            </div>
            <button type="submit" className="btn-primary" title="Create this campaign">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-outline" title="Cancel">Cancel</button>
          </form>
        </div>
      )}

      {/* Campaign List */}
      {loading ? (
        <div className="text-center py-20 text-brand-taupe/50 font-body">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-brand-taupe/50 font-body">No campaigns yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="card hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <Link href={`/campaigns/${c.id}`} className="flex-1">
                  <h3 className="font-display font-semibold text-lg text-brand-taupe group-hover:text-brand-pine transition-colors">
                    {c.name}
                  </h3>
                </Link>
                <StatusBadge status={c.status} onClick={() => toggleStatus(c)} />
              </div>

              <div className="flex items-center gap-4 text-sm font-body text-brand-taupe/60 mb-4">
                <span>📍 {c.county}, {c.state}</span>
                <span>📦 {c.batch_count || 0} batches</span>
              </div>

              {c.avg_conversion > 0 && (
                <div className="bg-brand-pine/5 rounded-lg px-3 py-2 mb-3">
                  <span className="text-xs font-body text-brand-pine font-medium">
                    Avg Conversion: {Number(c.avg_conversion).toFixed(1)}%
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-brand-taupe/10">
                <Link
                  href={`/campaigns/${c.id}`}
                  className="text-brand-pine text-sm font-body font-medium hover:underline"
                >
                  View Batches →
                </Link>
                <button
                  onClick={() => deleteCampaign(c.id)}
                  className="text-red-400 hover:text-red-600 text-xs font-body transition-colors"
                  title="Delete campaign and all its batches"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
