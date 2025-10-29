import { describe, it, expect } from 'vitest';
import { closure, isSuperKey } from '@/lib/algorithms/closure';

describe('Closure', () => {
  it('computes closure for single FD', () => {
    const fds = [{ lhs: ['A'], rhs: 'B' }];
    const result = closure(['A'], fds);
    expect(result).toEqual(['A', 'B']);
  });

  it('computes closure with multiple FDs', () => {
    const fds = [
      { lhs: ['A'], rhs: 'B' },
      { lhs: ['B'], rhs: 'C' }
    ];
    const result = closure(['A'], fds);
    expect(result).toEqual(['A', 'B', 'C']);
  });

  it('checks superkey', () => {
    const fds = [{ lhs: ['A'], rhs: 'B' }, { lhs: ['B'], rhs: 'C' }];
    const columns = ['A', 'B', 'C'];
    expect(isSuperKey(['A'], columns, fds)).toBe(true);
    expect(isSuperKey(['B'], columns, fds)).toBe(false);
  });
});
