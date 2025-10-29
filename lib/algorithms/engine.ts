import type { Row } from './keyFinder';
import { detectFDs } from './fdDetector';
import { findCandidateKeys } from './keyFinder';
import { classifyDependencies } from './dependencyAnalyzer';
import type { FD } from './closure';

/**
 * Orchestrates analysis and normalization of input rows.
 * Returns: { unf, 1nf, 2nf, 3nf, dependencies, candidateKeys }
 * - UNF: Single table as-is.
 * - 1NF: Assumes atomicity (same as UNF for demo).
 * - 2NF: Decomposes on partial FDs (LHS subset of candidate key).
 * - 3NF: Removes transitive dependencies (naive approach).
 * Complexity: O(|R| * |C|^2) for FD detection + O(2^|C|) for key finding + decomposition.
 */
export type Table = { name: string; columns: string[]; rows: Row[] };

export type NormalizationResult = {
  unf: { tables: Table[] };
  '1nf': { tables: Table[] };
  '2nf': { tables: Table[] };
  '3nf': { tables: Table[] };
  dependencies: FD[];
  candidateKeys: string[][];
  warnings?: string[];
};

function uniqueRows(rows: Row[], cols: string[]): Row[] {
  const map = new Map<string, Row>();
  for (const r of rows) {
    const k = cols.map(c => String(r[c] ?? '')).join('||');
    if (!map.has(k)) {
      const nr: Row = {};
      for (const c of cols) nr[c] = r[c];
      map.set(k, nr);
    }
  }
  return Array.from(map.values());
}

export async function analyzeAndNormalize(rows: Row[], datasetName = 'dataset'): Promise<NormalizationResult> {
  const warnings: string[] = [];
  if (!rows || rows.length === 0) {
    return { unf: { tables: [] }, '1nf': { tables: [] }, '2nf': { tables: [] }, '3nf': { tables: [] }, dependencies: [], candidateKeys: [], warnings: ['empty dataset'] };
  }

  const columns = Object.keys(rows[0]);
  const fds = detectFDs(rows, columns, true);
  const candidateKeys = findCandidateKeys(columns, fds, rows, 3);

  if (candidateKeys.length === 0) warnings.push('no candidate key found within size limit');

  const unfTable: Table = { name: datasetName, columns: [...columns], rows };
  const nf1Tables = [unfTable];
  const { partial, transitive } = classifyDependencies(fds, candidateKeys);
  const decomposed: Table[] = [];
  let mainCols = new Set(columns);

  for (const pfd of partial) {
    const lhs = pfd.lhs;
    const rhs = pfd.rhs;
    const newCols = Array.from(new Set([...lhs, rhs]));
    const newRows = uniqueRows(rows, newCols);
    decomposed.push({ name: `tbl_${lhs.join('_')}_partial`, columns: newCols, rows: newRows });
    if (mainCols.has(rhs)) mainCols.delete(rhs);
  }

  const mainColsArr = Array.from(mainCols);
  const mainRows = uniqueRows(rows, mainColsArr);
  const mainTable = { name: `${datasetName}_main`, columns: mainColsArr, rows: mainRows };
  const nf2Tables = [mainTable, ...decomposed];
  const nf3Tables = [...nf2Tables];

  for (const tfd of transitive) {
    const lhs = tfd.lhs;
    const rhs = tfd.rhs;
    const newCols = Array.from(new Set([...lhs, rhs]));
    const newRows = uniqueRows(rows, newCols);
    nf3Tables.push({ name: `tbl_${lhs.join('_')}_transitive`, columns: newCols, rows: newRows });
    for (const tbl of nf3Tables) {
      if (tbl.columns.includes(rhs)) {
        tbl.columns = tbl.columns.filter(c => c !== rhs);
        tbl.rows = tbl.rows.map(r => {
          const nr: Row = {};
          for (const c of tbl.columns) nr[c] = r[c];
          return nr;
        });
      }
    }
  }

  return {
    unf: { tables: [unfTable] },
    '1nf': { tables: nf1Tables },
    '2nf': { tables: nf2Tables },
    '3nf': { tables: nf3Tables },
    dependencies: fds,
    candidateKeys,
    warnings
  };
}
