import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { normalizeData, generateSQL } from '@/lib/normalize';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('csv') as File;
    if (!file) {
      // Fallback to sample
      const sample = await fetch('http://localhost:3000/data/tv_dataset.csv').then(r => r.text()); // Adjust for prod
      const parsed = Papa.parse(sample, { header: true }).data;
      const norm = normalizeData(parsed);
      return NextResponse.json({ ...norm, sql: generateSQL(norm['3nf']) });
    }

    const csv = await file.text();
    const parsed = Papa.parse(csv, { header: true }).data;
    const norm = normalizeData(parsed);
    return NextResponse.json({ ...norm, sql: generateSQL(norm['3nf']) });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to normalize' }, { status: 500 });
  }
}
