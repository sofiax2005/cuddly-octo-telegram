import { describe, it, expect } from 'vitest';
import { analyzeAndNormalize } from '@/lib/algorithms/engine';
import { parse } from 'papaparse';
import fs from 'fs/promises';
import path from 'path';

describe('Engine Integration', () => {
  it('normalizes tv_dataset correctly', async () => {
    const csv = await fs.readFile(path.join(__dirname, '../public/data/tv_dataset.csv'), 'utf-8');
    const { data } = parse(csv, { header: true, skipEmptyLines: true });
    const result = await analyzeAndNormalize(data as Record<string, any>[], 'tv_dataset');

    expect(result.unf.tables).toHaveLength(1);
    expect(result['1nf'].tables).toHaveLength(1);
    expect(result['2nf'].tables.length).toBeGreaterThanOrEqual(1);
    expect(result['2nf'].tables.some(t => t.name.includes('channel'))).toBe(true);
    expect(result.dependencies.length).toBeGreaterThan(0);
    expect(result.candidateKeys.length).toBeGreaterThan(0);
  });
});
