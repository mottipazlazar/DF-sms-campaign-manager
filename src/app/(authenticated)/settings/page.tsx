'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { User, Setting } from '@/lib/types';
import { TIMEZONE_OPTIONS } from '@/lib/timezone';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

type Tab = 'users' | 'locations' | 'templates';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [counties, setCounties] = useState<Setting[]>([]);
  const [templates, setTemplates] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '', password: '', display_name: '', role: 'va' as const,
    timezone: 'America/New_York', tz_label: 'ET', customTz: false, customTzValue: '', customTzLabel: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserForm, setEditUserForm] = useState<any>({});
  const [showEditPassword, setShowEditPassword] = useState(false);

  const [newCountyName, setNewCountyName] = useState('');
  const [newCountyState, setNewCountyState] = useState('FL');
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [editLocationForm, setEditLocationForm] = useState({ key: '', value: '' });

  const [newTemplate, setNewTemplate] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editTemplateValue, setEditTemplateValue] = useState('');

  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    if (tab === 'users') {
      setUsers(await fetch('/api/users').then(r => r.json()));
    } else if (tab === 'locations') {
      setCounties(await fetch('/api/settings?category=county').then(r => r.json()));
    } else {
      setTemplates(await fetch('/api/settings?category=template').then(r => r.json()));
    }
    setLoading(false);
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const tz = userForm.customTz ? userForm.customTzValue : userForm.timezone;
    const tzLabel = userForm.customTz ? userForm.customTzLabel : (TIMEZONE_OPTIONS.find(o => o.value === userForm.timezone)?.label.match(/\((.+)\)/)?.[1] || '');
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...userForm, timezone: tz, tz_label: tzLabel }) });
    if (!res.ok) { setError((await res.json()).error || 'Failed'); return; }
    setShowUserForm(false);
    setUserForm({ username: '', password: '', display_name: '', role: 'va', timezone: 'America/New_York', tz_label: 'ET', customTz: false, customTzValue: '', customTzLabel: '' });
    setShowNewPassword(false);
    fetchData();
  };

  const startEditUser = (user: User) => {
    const isKnown = TIMEZONE_OPTIONS.some(o => o.value === user.timezone);
    setEditingUserId(user.id);
    setEditUserForm({ display_name: user.display_name, username: user.username, role: user.role, timezone: isKnown ? user.timezone : '__custom__', tz_label: user.tz_label, password: '', customTz: !isKnown, customTzValue: !isKnown ? user.timezone : '', customTzLabel: !isKnown ? user.tz_label : '' });
    setShowEditPassword(false);
  };

  const saveEditUser = async () => {
    if (!editingUserId) return;
    const tz = editUserForm.customTz ? editUserForm.customTzValue : editUserForm.timezone;
    const tzLabel = editUserForm.customTz ? editUserForm.customTzLabel : (TIMEZONE_OPTIONS.find((o: any) => o.value === editUserForm.timezone)?.label.match(/\((.+)\)/)?.[1] || '');
    const payload: any = { id: editingUserId, display_name: editUserForm.display_name, username: editUserForm.username, role: editUserForm.role, timezone: tz, tz_label: tzLabel };
    if (editUserForm.password) payload.password = editUserForm.password;
    await fetch('/api/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setEditingUserId(null); setShowEditPassword(false); fetchData();
  };

  const handleEditTzChange = (value: string) => {
    if (value === '__custom__') { setEditUserForm({ ...editUserForm, timezone: '__custom__', customTz: true }); return; }
    const option = TIMEZONE_OPTIONS.find(o => o.value === value);
    setEditUserForm({ ...editUserForm, timezone: value, tz_label: option ? option.label.match(/\((.+)\)/)?.[1] || '' : '', customTz: false });
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    setError('');
    const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { setError((await res.json()).error || 'Failed'); return; }
    fetchData();
  };

  const handleTzChange = (value: string) => {
    if (value === '__custom__') { setUserForm({ ...userForm, customTz: true }); return; }
    const option = TIMEZONE_OPTIONS.find(o => o.value === value);
    setUserForm({ ...userForm, timezone: value, tz_label: option ? option.label.match(/\((.+)\)/)?.[1] || '' : '', customTz: false });
  };

  const addLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCountyName.trim()) return;
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: newCountyName.trim(), value: newCountyState, category: 'county' }) });
    const existingStates: Setting[] = await fetch('/api/settings?category=state').then(r => r.json());
    if (!existingStates.find(s => s.value === newCountyState)) {
      await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: newCountyState, value: newCountyState, category: 'state' }) });
    }
    setNewCountyName(''); fetchData();
  };

  const startEditLocation = (loc: Setting) => { setEditingLocationId(loc.id); setEditLocationForm({ key: loc.key, value: loc.value }); };

  const saveEditLocation = async () => {
    if (!editingLocationId) return;
    await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingLocationId, key: editLocationForm.key, value: editLocationForm.value }) });
    setEditingLocationId(null); fetchData();
  };

  const addTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.trim()) return;
    await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: newTemplate.trim(), value: newTemplate.trim(), category: 'template' }) });
    setNewTemplate(''); fetchData();
  };

  const startEditTemplate = (t: Setting) => { setEditingTemplateId(t.id); setEditTemplateValue(t.value); };

  const saveEditTemplate = async () => {
    if (!editingTemplateId) return;
    await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingTemplateId, key: editTemplateValue, value: editTemplateValue }) });
    setEditingTemplateId(null); fetchData();
  };

  const deleteSetting = async (id: number) => {
    setError('');
    const res = await fetch(`/api/settings?id=${id}`, { method: 'DELETE' });
    if (!res.ok) { setError((await res.json()).error || 'Failed'); return; }
    fetchData();
  };

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'users', label: 'Users & VAs', icon: '👥' },
    { key: 'locations', label: 'Locations', icon: '📍' },
    { key: 'templates', label: 'Templates', icon: '📝' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-brand-taupe">Settings</h1>
        <p className="font-body text-sm text-brand-taupe/60 mt-1">Manage users, locations, and templates</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-body flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      <div className="flex gap-1 mb-6 bg-brand-ivory rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setError(''); }} className={`px-4 py-2 rounded-md text-sm font-body transition-all ${tab === t.key ? 'bg-brand-pine text-white shadow-sm' : 'text-brand-taupe/70 hover:text-brand-taupe'}`} title={`Manage ${t.label.toLowerCase()}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-brand-taupe/50 font-body">Loading...</div>

      ) : tab === 'users' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-xl text-brand-taupe">Team Members</h2>
            <button onClick={() => setShowUserForm(!showUserForm)} className="btn-primary text-sm" title="Add a new team member">+ Add User</button>
          </div>

          {showUserForm && (
            <div className="card mb-4">
              <form onSubmit={addUser} className="grid grid-cols-2 md:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Username</label>
                  <input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Password</label>
                  <div className="relative">
                    <input type={showNewPassword ? 'text' : 'password'} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="input-field pr-9" required />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-taupe/40 hover:text-brand-taupe text-sm" title={showNewPassword ? 'Hide' : 'Show'}>{showNewPassword ? '🙈' : '👁️'}</button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Display Name</label>
                  <input value={userForm.display_name} onChange={(e) => setUserForm({ ...userForm, display_name: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Role</label>
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })} className="select-field">
                    <option value="admin">Admin</option>
                    <option value="va">VA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Timezone</label>
                  <select value={userForm.customTz ? '__custom__' : userForm.timezone} onChange={(e) => handleTzChange(e.target.value)} className="select-field">
                    {TIMEZONE_OPTIONS.map(tz => (<option key={tz.value} value={tz.value}>{tz.label}</option>))}
                    <option value="__custom__">+ Custom timezone...</option>
                  </select>
                </div>
                {userForm.customTz && (
                  <>
                    <div>
                      <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">IANA Timezone</label>
                      <input value={userForm.customTzValue} onChange={(e) => setUserForm({ ...userForm, customTzValue: e.target.value })} className="input-field" placeholder="e.g. Europe/Berlin" required />
                    </div>
                    <div>
                      <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">Label</label>
                      <input value={userForm.customTzLabel} onChange={(e) => setUserForm({ ...userForm, customTzLabel: e.target.value })} className="input-field" placeholder="e.g. CET" required />
                    </div>
                  </>
                )}
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1" title="Save">Add</button>
                  <button type="button" onClick={() => { setShowUserForm(false); setShowNewPassword(false); }} className="btn-outline" title="Cancel">Cancel</button>
                </div>
              </form>
            </div>
          )}

          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead><tr>
                <th className="table-header">Name</th>
                <th className="table-header">Username</th>
                <th className="table-header">Role</th>
                <th className="table-header">Timezone</th>
                <th className="table-header">Password</th>
                <th className="table-header">Actions</th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-brand-ivory/50">
                    {editingUserId === u.id ? (
                      <>
                        <td className="table-cell"><input value={editUserForm.display_name} onChange={(e) => setEditUserForm({ ...editUserForm, display_name: e.target.value })} className="input-field text-sm" /></td>
                        <td className="table-cell"><input value={editUserForm.username} onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })} className="input-field text-sm" /></td>
                        <td className="table-cell">
                          <select value={editUserForm.role} onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })} className="select-field text-sm">
                            <option value="admin">Admin</option><option value="va">VA</option>
                          </select>
                        </td>
                        <td className="table-cell">
                          <select value={editUserForm.customTz ? '__custom__' : editUserForm.timezone} onChange={(e) => handleEditTzChange(e.target.value)} className="select-field text-sm">
                            {TIMEZONE_OPTIONS.map(tz => (<option key={tz.value} value={tz.value}>{tz.label}</option>))}
                            <option value="__custom__">+ Custom...</option>
                          </select>
                          {editUserForm.customTz && (
                            <div className="mt-1 space-y-1">
                              <input value={editUserForm.customTzValue} onChange={(e) => setEditUserForm({ ...editUserForm, customTzValue: e.target.value })} className="input-field text-xs" placeholder="IANA TZ" />
                              <input value={editUserForm.customTzLabel} onChange={(e) => setEditUserForm({ ...editUserForm, customTzLabel: e.target.value })} className="input-field text-xs" placeholder="Label" />
                            </div>
                          )}
                        </td>
                        <td className="table-cell">
                          <div className="relative">
                            <input type={showEditPassword ? 'text' : 'password'} value={editUserForm.password} onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })} className="input-field text-sm pr-9" placeholder="Leave blank to keep" />
                            <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-taupe/40 hover:text-brand-taupe text-xs" title={showEditPassword ? 'Hide' : 'Show'}>{showEditPassword ? '🙈' : '👁️'}</button>
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <button onClick={saveEditUser} className="text-brand-pine text-xs font-medium hover:underline" title="Save">Save</button>
                            <button onClick={() => { setEditingUserId(null); setShowEditPassword(false); }} className="text-brand-taupe/50 text-xs hover:underline" title="Cancel">Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="table-cell font-medium">{u.display_name}</td>
                        <td className="table-cell text-brand-taupe/60">{u.username}</td>
                        <td className="table-cell"><span className={`px-2 py-0.5 rounded-full text-xs font-body ${u.role === 'admin' ? 'bg-brand-pine/10 text-brand-pine' : 'bg-brand-gold/10 text-brand-gold-dark'}`}>{u.role}</span></td>
                        <td className="table-cell text-sm">{u.tz_label} ({u.timezone})</td>
                        <td className="table-cell text-sm text-brand-taupe/30">••••••</td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEditUser(u)} className="text-brand-pine text-xs hover:underline" title="Edit user">Edit</button>
                            <button onClick={() => deleteUser(u.id)} className="text-red-400 hover:text-red-600 text-xs" title="Delete (blocked if in batches)">Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      ) : tab === 'locations' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-xl text-brand-taupe">Counties & States</h2>
          </div>
          <form onSubmit={addLocation} className="flex gap-3 mb-4 items-end">
            <div className="flex-1 max-w-xs">
              <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">County Name</label>
              <input value={newCountyName} onChange={(e) => setNewCountyName(e.target.value)} className="input-field" placeholder="e.g. Putnam" required />
            </div>
            <div className="w-28">
              <label className="block text-xs font-body font-medium text-brand-taupe/70 mb-1">State</label>
              <select value={newCountyState} onChange={(e) => setNewCountyState(e.target.value)} className="select-field">
                {US_STATES.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <button type="submit" className="btn-primary text-sm" title="Add new location">Add</button>
          </form>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead><tr>
                <th className="table-header">County</th>
                <th className="table-header w-24">State</th>
                <th className="table-header w-32">Actions</th>
              </tr></thead>
              <tbody>
                {counties.map(s => (
                  <tr key={s.id} className="hover:bg-brand-ivory/50">
                    {editingLocationId === s.id ? (
                      <>
                        <td className="table-cell"><input value={editLocationForm.key} onChange={(e) => setEditLocationForm({ ...editLocationForm, key: e.target.value })} className="input-field text-sm" /></td>
                        <td className="table-cell">
                          <select value={editLocationForm.value} onChange={(e) => setEditLocationForm({ ...editLocationForm, value: e.target.value })} className="select-field text-sm">
                            {US_STATES.map(st => (<option key={st} value={st}>{st}</option>))}
                          </select>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <button onClick={saveEditLocation} className="text-brand-pine text-xs font-medium hover:underline" title="Save">Save</button>
                            <button onClick={() => setEditingLocationId(null)} className="text-brand-taupe/50 text-xs hover:underline" title="Cancel">Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="table-cell font-medium">{s.key}</td>
                        <td className="table-cell"><span className="px-2 py-0.5 rounded bg-brand-pine/10 text-brand-pine text-xs font-body font-medium">{s.value}</span></td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEditLocation(s)} className="text-brand-pine text-xs hover:underline" title="Edit location">Edit</button>
                            <button onClick={() => deleteSetting(s.id)} className="text-red-400 hover:text-red-600 text-xs" title="Delete">Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {counties.length === 0 && <tr><td colSpan={3} className="table-cell text-center text-brand-taupe/40">No locations yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-xl text-brand-taupe">Templates</h2>
          </div>
          <form onSubmit={addTemplate} className="flex gap-3 mb-4">
            <input value={newTemplate} onChange={(e) => setNewTemplate(e.target.value)} className="input-field max-w-sm" placeholder="Add new template name..." required />
            <button type="submit" className="btn-primary text-sm" title="Add new template">Add</button>
          </form>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead><tr>
                <th className="table-header">Template Name</th>
                <th className="table-header w-32">Actions</th>
              </tr></thead>
              <tbody>
                {templates.map(s => (
                  <tr key={s.id} className="hover:bg-brand-ivory/50">
                    {editingTemplateId === s.id ? (
                      <>
                        <td className="table-cell"><input value={editTemplateValue} onChange={(e) => setEditTemplateValue(e.target.value)} className="input-field text-sm" /></td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <button onClick={saveEditTemplate} className="text-brand-pine text-xs font-medium hover:underline" title="Save">Save</button>
                            <button onClick={() => setEditingTemplateId(null)} className="text-brand-taupe/50 text-xs hover:underline" title="Cancel">Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="table-cell font-medium">{s.value}</td>
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEditTemplate(s)} className="text-brand-pine text-xs hover:underline" title="Edit template">Edit</button>
                            <button onClick={() => deleteSetting(s.id)} className="text-red-400 hover:text-red-600 text-xs" title="Delete (blocked if in batches)">Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {templates.length === 0 && <tr><td colSpan={2} className="table-cell text-center text-brand-taupe/40">No templates yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
