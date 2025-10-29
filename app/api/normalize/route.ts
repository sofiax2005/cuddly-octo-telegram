import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'papaparse';
import { analyzeAndNormalize } from '@/lib/algorithms/engine';
import { generateSQL } from '@/lib/sqlExport';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let rows: Record<string, any>[] = [];
    let datasetName = 'dataset';

    if (contentType.includes('text/csv')) {
      const text = await req.text();
      const { data } = parse(text, { header: true, skipEmptyLines: true });
      rows = data as Record<string, any>[];
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      rows = body.rows || [];
      datasetName = body.name || datasetName;
    } else {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 400 });
    }

    if (!rows.length) {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 });
    }

    const result = await analyzeAndNormalize(rows, datasetName);
    const format = req.nextUrl.searchParams.get('format');

    if (format === 'sql') {
      const stage = (req.nextUrl.searchParams.get('stage') || '2nf') as 'unf' | '1nf' | '2nf' | '3nf';
      const sql = generateSQL(result, stage);
      return new NextResponse(sql, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Normalization error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const sample = req.nextUrl.searchParams.get('sample');
  if (sample === 'tv') {
    try {
      const csv = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/data/tv_dataset.csv`).then(res => res.text());
      const { data } = parse(csv, { header: true, skipEmptyLines: true });
      const result = await analyzeAndNormalize(data as Record<string, any>[], 'tv_dataset');
      const format = req.nextUrl.searchParams.get('format');
      if (format === 'sql') {
        const stage = (req.nextUrl.searchParams.get('stage') || '2nf') as 'unf' | '1nf' | '2nf' | '3nf';
        const sql = generateSQL(result, stage);
        return new NextResponse(sql, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
      return NextResponse.json(result);
    } catch (error) {
      console.error('TV dataset fetch error:', error);
      // Fallback sample data
      const fallbackRows = [
        { channel: 'HBO', show: 'Game of Thrones', genre: 'Drama', network: 'HBO', day: 'Sunday' },
        { channel: 'Netflix', show: 'Stranger Things', genre: 'Drama', network: 'Netflix', day: 'Friday' }
      ];
      const result = await analyzeAndNormalize(fallbackRows, 'tv_dataset_fallback');
      return NextResponse.json(result);
    }
  }
  return NextResponse.json({ error: 'Invalid sample' }, { status: 400 });
}
