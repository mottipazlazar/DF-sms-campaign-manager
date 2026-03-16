import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';

export async function GET() {
  await ensureDb();
  const result = await db.execute(`
    SELECT c.*,
      (SELECT COUNT(*) FROM batches WHERE campaign_id = c.id) as batch_count,
      (SELECT COALESCE(AVG(conversion_rate), 0) FROM batches WHERE campaign_id = c.id AND conversion_rate IS NOT NULL) as avg_conversion
    FROM campaigns c
    ORDER BY c.updated_at DESC
  `);
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureDb();
  const body = await req.json();
  const { name, county, state } = body;

  if (!name || !county || !state) {
    return NextResponse.json({ error: 'Name, county, and state are required' }, { status: 400 });
  }

  const insertResult = await db.execute({
    sql: 'INSERT INTO campaigns (name, county, state) VALUES (?, ?, ?)',
    args: [name, county, state],
  });

  const campaignResult = await db.execute({
    sql: 'SELECT * FROM campaigns WHERE id = ?',
    args: [Number(insertResult.lastInsertRowid)],
  });

  return NextResponse.json(campaignResult.rows[0], { status: 201 });
}
