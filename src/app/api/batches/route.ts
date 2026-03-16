import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaign_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let query = `
    SELECT b.*, u.display_name as owner_name, c.name as campaign_name, c.county, c.state
    FROM batches b
    LEFT JOIN users u ON b.owner_id = u.id
    LEFT JOIN campaigns c ON b.campaign_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (campaignId) {
    query += ' AND b.campaign_id = ?';
    params.push(campaignId);
  }
  if (startDate) {
    query += ' AND b.planned_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    query += ' AND b.planned_date <= ?';
    params.push(endDate);
  }

  query += ' ORDER BY b.planned_date, b.sort_order';

  const batches = db.prepare(query).all(...params);
  return NextResponse.json(batches);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { campaign_id, batch_number, lc_batch_id, template, message_count, owner_id, local_target_time, planned_date, sort_order, notes } = body;

  if (!campaign_id || !template || !owner_id || !local_target_time || !planned_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Auto-generate batch number if not provided
  let batchNum = batch_number;
  if (!batchNum) {
    const max = db.prepare('SELECT MAX(batch_number) as max FROM batches WHERE campaign_id = ?').get(campaign_id) as any;
    batchNum = (max?.max || 0) + 1;
  }

  const result = db.prepare(`
    INSERT INTO batches (campaign_id, batch_number, lc_batch_id, template, message_count, owner_id, local_target_time, planned_date, sort_order, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(campaign_id, batchNum, lc_batch_id || '', template, message_count || 50, owner_id, local_target_time, planned_date, sort_order || 0, notes || '');

  const batch = db.prepare(`
    SELECT b.*, u.display_name as owner_name
    FROM batches b LEFT JOIN users u ON b.owner_id = u.id
    WHERE b.id = ?
  `).get(result.lastInsertRowid);

  return NextResponse.json(batch, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'Batch ID required' }, { status: 400 });

  // If conversion_rate is updated, auto-calculate reply_count
  if (updates.conversion_rate !== undefined) {
    const batch = db.prepare('SELECT message_count FROM batches WHERE id = ?').get(id) as any;
    const msgCount = updates.message_count || batch?.message_count || 0;
    updates.reply_count = Math.round(msgCount * (updates.conversion_rate / 100) * 10) / 10;
  }

  // If message_count is updated and we have a conversion_rate, recalc reply_count
  if (updates.message_count !== undefined && updates.conversion_rate === undefined) {
    const batch = db.prepare('SELECT conversion_rate FROM batches WHERE id = ?').get(id) as any;
    if (batch?.conversion_rate) {
      updates.reply_count = Math.round(updates.message_count * (batch.conversion_rate / 100) * 10) / 10;
    }
  }

  const setClauses: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = ?`);
    values.push(value);
  }

  if (setClauses.length > 0) {
    values.push(id);
    db.prepare(`UPDATE batches SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
  }

  const batch = db.prepare(`
    SELECT b.*, u.display_name as owner_name
    FROM batches b LEFT JOIN users u ON b.owner_id = u.id
    WHERE b.id = ?
  `).get(id);

  return NextResponse.json(batch);
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Batch ID required' }, { status: 400 });

  db.prepare('DELETE FROM batches WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
