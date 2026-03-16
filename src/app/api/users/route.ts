import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  const db = getDb();
  const users = db.prepare('SELECT id, username, display_name, role, timezone, tz_label, created_at FROM users ORDER BY display_name').all();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { username, password, display_name, role, timezone, tz_label } = body;

  if (!username || !password || !display_name) {
    return NextResponse.json({ error: 'Username, password, and display name are required' }, { status: 400 });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, display_name, role, timezone, tz_label) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(username, hash, display_name, role || 'va', timezone || 'America/New_York', tz_label || 'ET');

  const user = db.prepare('SELECT id, username, display_name, role, timezone, tz_label, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);
  return NextResponse.json(user, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, password, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

  const setClauses: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (['display_name', 'role', 'timezone', 'tz_label', 'username'].includes(key)) {
      setClauses.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (password) {
    const hash = await bcrypt.hash(password, 10);
    setClauses.push('password_hash = ?');
    values.push(hash);
  }

  if (setClauses.length > 0) {
    values.push(id);
    db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  }

  const user = db.prepare('SELECT id, username, display_name, role, timezone, tz_label, created_at FROM users WHERE id = ?').get(id);
  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

  // Check if user is referenced in any batches
  const usage = db.prepare('SELECT COUNT(*) as count FROM batches WHERE owner_id = ?').get(id) as any;
  if (usage?.count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: this user is assigned to ${usage.count} batch(es) in the planner. Reassign them first.` },
      { status: 409 }
    );
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
