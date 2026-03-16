import { NextRequest, NextResponse } from 'next/server';
import { db, ensureDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureDb();
  const campaignResult = await db.execute({
    sql: 'SELECT * FROM campaigns WHERE id = ?',
    args: [params.id],
  });
  const campaign = campaignResult.rows[0];
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const batchesResult = await db.execute({
    sql: `SELECT b.*, u.display_name as owner_name
          FROM batches b
          LEFT JOIN users u ON b.owner_id = u.id
          WHERE b.campaign_id = ?
          ORDER BY b.planned_date, b.sort_order`,
    args: [params.id],
  });

  return NextResponse.json({ ...(campaign as any), batches: batchesResult.rows });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureDb();
  const body = await req.json();

  const fields: [string, any][] = [];
  if (body.status) fields.push(['status', body.status]);
  if (body.name)   fields.push(['name', body.name]);
  if (body.county) fields.push(['county', body.county]);
  if (body.state)  fields.push(['state', body.state]);

  for (const [field, val] of fields) {
    await db.execute({
      sql: `UPDATE campaigns SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [val, params.id],
    });
  }

  const result = await db.execute({
    sql: 'SELECT * FROM campaigns WHERE id = ?',
    args: [params.id],
  });
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await ensureDb();
  await db.execute({ sql: 'DELETE FROM campaigns WHERE id = ?', args: [params.id] });
  return NextResponse.json({ success: true });
}
