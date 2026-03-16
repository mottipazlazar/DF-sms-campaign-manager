import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  await ensureDb();
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get('campaign_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let sql = `
    SELECT b.*, u.display_name as owner_name, c.name as campaign_name, c.county, c.state
    FROM batches b
    LEFT JOIN users u ON b.owner_id = u.id
    LEFT JOIN campaigns c ON b.campaign_id = c.id
    WHERE 1=1
  `;
  const args: any[] = [];

  if (campaignId) { sql += ' AND b.campaign_id = ?'; args.push(campaignId); }
  if (startDate)  { sql += ' AND b.planned_date >= ?'; args.push(startDate); }
  if (endDate)    { sql += ' AND b.planned_date <= ?'; args.push(endDate); }

  sql += ' ORDER BY b.planned_date, b.sort_order';

  const result = await db.execute({ sql, args });
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  await ensureDb();
  const body = await req.json();
  const { campaign_id, batch_number, lc_batch_id, template, message_count, owner_id, local_target_time, planned_date, sort_order, notes } = body;

  if (!campaign_id || !template || !owner_id || !local_target_time || !planned_date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  let batchNum = batch_number;
  if (!batchNum) {
    const maxResult = await db.execute({
      sql: 'SELECT MAX(batch_number) as max FROM batches WHERE campaign_id = ?',
      args: [campaign_id],
    });
    batchNum = (Number((maxResult.rows[0] as any)?.max) || 0) + 1;
  }

  const insertResult = await db.execute({
    sql: `INSERT INTO batches (campaign_id, batch_number, lc_batch_id, template, message_count, owner_id, local_target_time, planned_date, sort_order, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [campaign_id, batchNum, lc_batch_id || '', template, message_count || 50, owner_id, local_target_time, planned_date, sort_order || 0, notes || ''],
  });

  const batchResult = await db.execute({
    sql: `SELECT b.*, u.display_name as owner_name FROM batches b LEFT JOIN users u ON b.owner_id = u.id WHERE b.id = ?`,
    args: [Number(insertResult.lastInsertRowid)],
  });

  return NextResponse.json(batchResult.rows[0], { status: 201 });
}

export async function PATCH(req: NextRequest) {
  await ensureDb();
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: 'Batch ID required' }, { status: 400 });

  // If conversion_rate updated, auto-calculate reply_count
  if (updates.conversion_rate !== undefined) {
    const r = await db.execute({ sql: 'SELECT message_count FROM batches WHERE id = ?', args: [id] });
    const msgCount = updates.message_count || Number((r.rows[0] as any)?.message_count) || 0;
    updates.reply_count = Math.round(msgCount * (updates.conversion_rate / 100) * 10) / 10;
  }

  // If message_count updated and conversion_rate exists, recalc reply_count
  if (updates.message_count !== undefined && updates.conversion_rate === undefined) {
    const r = await db.execute({ sql: 'SELECT conversion_rate FROM batches WHERE id = ?', args: [id] });
    const rate = Number((r.rows[0] as any)?.conversion_rate);
    if (rate) {
      updates.reply_count = Math.round(updates.message_count * (rate / 100) * 10) / 10;
    }
  }

  const setClauses: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = ?`);
    values.push(value);
  }

  if (setClauses.length > 0) {
    await db.execute({
      sql: `UPDATE batches SET ${setClauses.join(', ')} WHERE id = ?`,
      args: [...values, id],
    });
  }

  const batchResult = await db.execute({
    sql: `SELECT b.*, u.display_name as owner_name FROM batches b LEFT JOIN users u ON b.owner_id = u.id WHERE b.id = ?`,
    args: [id],
  });

  return NextResponse.json(batchResult.rows[0]);
}

export async function DELETE(req: NextRequest) {
  await ensureDb();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Batch ID required' }, { status: 400 });

  await db.execute({ sql: 'DELETE FROM batches WHERE id = ?', args: [id] });
  return NextResponse.json({ success: true });
}
