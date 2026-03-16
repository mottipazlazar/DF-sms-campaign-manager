import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  await ensureDb();
  const result = await db.execute(
    'SELECT id, username, display_name, role, timezone, tz_label, created_at FROM users ORDER BY display_name'
  );
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureDb();
  const body = await req.json();
  const { username, password, display_name, role, timezone, tz_label } = body;

  if (!username || !password || !display_name) {
    return NextResponse.json({ error: 'Username, password, and display name are required' }, { status: 400 });
  }

  const existingResult = await db.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [username] });
  if (existingResult.rows.length > 0) {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  const insertResult = await db.execute({
    sql: 'INSERT INTO users (username, password_hash, display_name, role, timezone, tz_label) VALUES (?, ?, ?, ?, ?, ?)',
    args: [username, hash, display_name, role || 'va', timezone || 'America/New_York', tz_label || 'ET'],
  });

  const userResult = await db.execute({
    sql: 'SELECT id, username, display_name, role, timezone, tz_label, created_at FROM users WHERE id = ?',
    args: [Number(insertResult.lastInsertRowid)],
  });

  return NextResponse.json(userResult.rows[0], { status: 201 });
}

export async function PATCH(req: NextRequest) {
  await ensureDb();
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
    await db.execute({
      sql: `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
      args: [...values, id],
    });
  }

  const userResult = await db.execute({
    sql: 'SELECT id, username, display_name, role, timezone, tz_label, created_at FROM users WHERE id = ?',
    args: [id],
  });

  return NextResponse.json(userResult.rows[0]);
}

export async function DELETE(req: NextRequest) {
  await ensureDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

  const usageResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM batches WHERE owner_id = ?',
    args: [id],
  });
  const count = Number((usageResult.rows[0] as any)?.count);
  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: this user is assigned to ${count} batch(es) in the planner. Reassign them first.` },
      { status: 409 }
    );
  }

  await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
  return NextResponse.json({ success: true });
}
