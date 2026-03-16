import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(params.id);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const batches = db.prepare(`
    SELECT b.*, u.display_name as owner_name
    FROM batches b
    LEFT JOIN users u ON b.owner_id = u.id
    WHERE b.campaign_id = ?
    ORDER BY b.planned_date, b.sort_order
  `).all(params.id);

  return NextResponse.json({ ...(campaign as any), batches });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();

  if (body.status) {
    db.prepare('UPDATE campaigns SET status = ?, updated_at = datetime("now") WHERE id = ?')
      .run(body.status, params.id);
  }
  if (body.name) {
    db.prepare('UPDATE campaigns SET name = ?, updated_at = datetime("now") WHERE id = ?')
      .run(body.name, params.id);
  }
  if (body.county) {
    db.prepare('UPDATE campaigns SET county = ?, updated_at = datetime("now") WHERE id = ?')
      .run(body.county, params.id);
  }
  if (body.state) {
    db.prepare('UPDATE campaigns SET state = ?, updated_at = datetime("now") WHERE id = ?')
      .run(body.state, params.id);
  }

  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(params.id);
  return NextResponse.json(campaign);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(params.id);
  return NextResponse.json({ success: true });
}
