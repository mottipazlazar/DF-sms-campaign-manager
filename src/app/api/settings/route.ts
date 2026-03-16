import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');

  let settings;
  if (category) {
    settings = db.prepare('SELECT * FROM settings WHERE category = ? ORDER BY key').all(category);
  } else {
    settings = db.prepare('SELECT * FROM settings ORDER BY category, key').all();
  }
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { key, value, category } = body;

  if (!key || !value || !category) {
    return NextResponse.json({ error: 'Key, value, and category are required' }, { status: 400 });
  }

  const result = db.prepare('INSERT INTO settings (key, value, category) VALUES (?, ?, ?)').run(key, value, category);
  const setting = db.prepare('SELECT * FROM settings WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(setting, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, key, value } = body;

  if (!id) return NextResponse.json({ error: 'Setting ID required' }, { status: 400 });

  const setClauses: string[] = [];
  const values: any[] = [];

  if (key !== undefined) { setClauses.push('key = ?'); values.push(key); }
  if (value !== undefined) { setClauses.push('value = ?'); values.push(value); }

  if (setClauses.length > 0) {
    values.push(id);
    db.prepare(`UPDATE settings SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  }

  const setting = db.prepare('SELECT * FROM settings WHERE id = ?').get(id);
  return NextResponse.json(setting);
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Setting ID required' }, { status: 400 });

  // Get the setting to check its category
  const setting = db.prepare('SELECT * FROM settings WHERE id = ?').get(id) as any;
  if (!setting) return NextResponse.json({ error: 'Setting not found' }, { status: 404 });

  // If it's a template, check if it's used in any batches
  if (setting.category === 'template') {
    const usage = db.prepare('SELECT COUNT(*) as count FROM batches WHERE template = ?').get(setting.value) as any;
    if (usage?.count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: "${setting.value}" is used in ${usage.count} batch(es). Remove those batches first.` },
        { status: 409 }
      );
    }
  }

  db.prepare('DELETE FROM settings WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
