import { describe, it, expect } from 'vitest';
import { analyzeAndNormalize } from '@/lib/algorithms/engine';
import { parse } from 'papaparse';

describe('Engine Integration', () => {
  it('normalizes tv_dataset correctly', async () => {
    const csv = await fetch('http://localhost:3000/data/tv_dataset.csv').then(res => res.text());
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
