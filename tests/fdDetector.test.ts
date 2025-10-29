import { describe, it, expect } from 'vitest';
import { detectSingleAttrFDs, detectPairAttrFDs } from '@/lib/algorithms/fdDetector';

describe('FDDetector', () => {
  it('detects single attribute FD', () => {
    const rows = [
      { A: '1', B: 'x' },
      { A: '2', B: 'y' },
      { A: '1', B: 'x' }
    ];
    const columns = ['A', 'B'];
    const fds = detectSingleAttrFDs(rows, columns);
    expect(fds).toContainEqual({ lhs: ['A'], rhs: 'B' });
  });

  it('detects pair attribute FD', () => {
    const rows = [
      { A: '1', B: '1', C: 'x' },
      { A: '1', B: '2', C: 'y' },
      { A: '1', B: '1', C: 'x' }
    ];
    const columns = ['A', 'B', 'C'];
    const fds = detectPairAttrFDs(rows, columns, 10);
    expect(fds).toContainEqual({ lhs: ['A', 'B'], rhs: 'C' });
  });
});
