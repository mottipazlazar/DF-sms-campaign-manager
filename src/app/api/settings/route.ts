import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  await ensureDb();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');

  const result = category
    ? await db.execute({ sql: 'SELECT * FROM settings WHERE category = ? ORDER BY key', args: [category] })
    : await db.execute('SELECT * FROM settings ORDER BY category, key');

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureDb();
  const body = await req.json();
  const { key, value, category } = body;

  if (!key || !value || !category) {
    return NextResponse.json({ error: 'Key, value, and category are required' }, { status: 400 });
  }

  const insertResult = await db.execute({
    sql: 'INSERT INTO settings (key, value, category) VALUES (?, ?, ?)',
    args: [key, value, category],
  });

  const settingResult = await db.execute({
    sql: 'SELECT * FROM settings WHERE id = ?',
    args: [Number(insertResult.lastInsertRowid)],
  });

  return NextResponse.json(settingResult.rows[0], { status: 201 });
}

export async function PATCH(req: NextRequest) {
  await ensureDb();
  const body = await req.json();
  const { id, key, value } = body;

  if (!id) return NextResponse.json({ error: 'Setting ID required' }, { status: 400 });

  const setClauses: string[] = [];
  const values: any[] = [];
  if (key !== undefined)   { setClauses.push('key = ?');   values.push(key); }
  if (value !== undefined) { setClauses.push('value = ?'); values.push(value); }

  if (setClauses.length > 0) {
    await db.execute({
      sql: `UPDATE settings SET ${setClauses.join(', ')} WHERE id = ?`,
      args: [...values, id],
    });
  }

  const result = await db.execute({ sql: 'SELECT * FROM settings WHERE id = ?', args: [id] });
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest) {
  await ensureDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Setting ID required' }, { status: 400 });

  const settingResult = await db.execute({ sql: 'SELECT * FROM settings WHERE id = ?', args: [id] });
  const setting = settingResult.rows[0] as any;
  if (!setting) return NextResponse.json({ error: 'Setting not found' }, { status: 404 });

  if (setting.category === 'template') {
    const usageResult = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM batches WHERE template = ?',
      args: [setting.value],
    });
    const count = Number((usageResult.rows[0] as any)?.count);
    if (count > 0) {
      return NextResponse.json(
        { error: `Cannot delete: "${setting.value}" is used in ${count} batch(es). Remove those batches first.` },
        { status: 409 }
      );
    }
  }

  await db.execute({ sql: 'DELETE FROM settings WHERE id = ?', args: [id] });
  return NextResponse.json({ success: true });
}
