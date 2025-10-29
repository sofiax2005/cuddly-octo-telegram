import type { Row } from './keyFinder';
import type { FD } from './closure';

/**
 * Naive FD detector with heuristics to avoid blow-up.
 * - Detects exact single-attribute LHS -> RHS FDs.
 * - Optionally tries pair-LHS (two-attr) but prunes when lhs values don't reduce variability.
 * Complexity: O(|R| * |C|^2) for single-attr, O(|R| * |C|^2 * limitPairs) for pairs.
 */
export function detectSingleAttrFDs(rows: Row[], columns: string[]): FD[] {
  const fds: FD[] = [];
  if (rows.length === 0) return fds;

  for (const a of columns) {
    for (const b of columns) {
      if (a === b) continue;
      const map = new Map<string, string | null>();
      let ok = true;
      for (const r of rows) {
        const key = String(r[a] ?? '__NULL__');
        const val = r[b] === undefined ? null : String(r[b]);
        if (map.has(key)) {
          if (map.get(key) !== val) {
            ok = false;
            break;
          }
        } else {
          map.set(key, val);
        }
      }
      if (ok) fds.push({ lhs: [a], rhs: b });
    }
  }
  return fds;
}

/**
 * Detect pair-LHS FDs with pruning.
 * Prunes pairs where combined distinct values are near-unique (>95% of rows).
 * @param limitPairs Max number of pairs to test.
 */
export function detectPairAttrFDs(rows: Row[], columns: string[], limitPairs = 50): FD[] {
  const fds: FD[] = [];
  if (rows.length === 0) return fds;

  const distinctCount = (col: string) => {
    const s = new Set(rows.map(r => String(r[col] ?? '__NULL__')));
    return s.size;
  };
  const counts = new Map(columns.map(c => [c, distinctCount(c)] as [string, number]));
  const sorted = columns.slice().sort((x, y) => (counts.get(x)! - counts.get(y)!));

  let tested = 0;
  for (let i = 0; i < sorted.length && tested < limitPairs; i++) {
    for (let j = i + 1; j < sorted.length && tested < limitPairs; j++) {
      const a = sorted[i], b = sorted[j];
      const comboSet = new Set(rows.map(r => `${String(r[a] ?? '__NULL__')}||${String(r[b] ?? '__NULL__')}`));
      if (comboSet.size / Math.max(1, rows.length) > 0.95) {
        tested++;
        continue;
      }
      for (const rhs of columns) {
        if (rhs === a || rhs === b) continue;
        const map = new Map<string, string | null>();
        let ok = true;
        for (const r of rows) {
          const key = `${String(r[a] ?? '__NULL__')}||${String(r[b] ?? '__NULL__')}`;
          const val = r[rhs] === undefined ? null : String(r[rhs]);
          if (map.has(key)) {
            if (map.get(key) !== val) {
              ok = false;
              break;
            }
          } else {
            map.set(key, val);
          }
        }
        if (ok) fds.push({ lhs: [a, b], rhs });
      }
      tested++;
    }
  }
  return fds;
}

/**
 * Combined detector: returns single + pair LHS FDs (unique only).
 */
export function detectFDs(rows: Row[], columns: string[], tryPairs = true): FD[] {
  const single = detectSingleAttrFDs(rows, columns);
  if (!tryPairs) return single;
  const pairs = detectPairAttrFDs(rows, columns);
  const seen = new Set(single.map(s => `${s.lhs.join(',')}->${s.rhs}`));
  for (const p of pairs) {
    const key = `${p.lhs.join(',')}->${p.rhs}`;
    if (!seen.has(key)) {
      single.push(p);
      seen.add(key);
    }
  }
  return single;
}
