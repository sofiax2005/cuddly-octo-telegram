import type { FD } from './closure';
import { closure, isSuperKey } from './closure';

/**
 * Candidate key finder with pruning.
 * Heuristic: search combinations increasing size up to maxSize (default 3).
 * Uses uniqueness check if rows provided to prefer minimal unique candidate keys.
 * Complexity: O(2^|C|) worst case, pruned by maxSize and early termination.
 */
export type Row = Record<string, any>;

export function findCandidateKeys(
  columns: string[],
  fds: FD[],
  rows?: Row[],
  maxSize = 3
): string[][] {
  // Quick uniqueness test helper
  const isUnique = (cols: string[]): boolean => {
    if (!rows) return false;
    const seen = new Set<string>();
    for (const r of rows) {
      const key = cols.map(c => String(r[c] ?? '')).join('||');
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  };

  // Generate combinations of size k
  function combinations(arr: string[], k: number): string[][] {
    const res: string[][] = [];
    function go(i: number, cur: string[]) {
      if (cur.length === k) {
        res.push([...cur]);
        return;
      }
      for (let j = i; j < arr.length; j++) {
        cur.push(arr[j]);
        go(j + 1, cur);
        cur.pop();
      }
    }
    go(0, []);
    return res;
  }

  const found: string[][] = [];
  for (let size = 1; size <= Math.min(maxSize, columns.length); size++) {
    const combos = combinations(columns, size);
    for (const cand of combos) {
      // Pruning: skip if any subset is already a key
      const subsetIsKey = found.some(k => k.every(x => cand.includes(x)));
      if (subsetIsKey) continue;
      // Fast uniqueness check if rows exist
      if (isUnique(cand)) {
        found.push(cand);
        continue;
      }
      // Check closure (structural key)
      if (isSuperKey(cand, columns, fds)) {
        found.push(cand);
      }
    }
    if (found.length) break; // Prefer smallest keys
  }

  return found;
}
