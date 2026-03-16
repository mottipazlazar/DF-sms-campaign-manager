import { NextRequest, NextResponse } from 'next/server';
import { getAnalytics } from '@/lib/analytics';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get('start_date') || undefined;
  const endDate = searchParams.get('end_date') || undefined;

  const data = await getAnalytics(startDate, endDate);
  return NextResponse.json(data);
}
