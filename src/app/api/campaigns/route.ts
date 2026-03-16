import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  const db = getDb();
  const campaigns = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM batches WHERE campaign_id = c.id) as batch_count,
      (SELECT COALESCE(AVG(conversion_rate), 0) FROM batches WHERE campaign_id = c.id AND conversion_rate IS NOT NULL) as avg_conversion
    FROM campaigns c
    ORDER BY c.updated_at DESC
  `).all();
  return NextResponse.json(campaigns);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { name, county, state } = body;

  if (!name || !county || !state) {
    return NextResponse.json({ error: 'Name, county, and state are required' }, { status: 400 });
  }

  const result = db.prepare(
    'INSERT INTO campaigns (name, county, state) VALUES (?, ?, ?)'
  ).run(name, county, state);

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(campaign, { status: 201 });
}
