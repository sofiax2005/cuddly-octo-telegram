import type { Table, NormalizationResult } from './algorithms/engine';

/**
 * Generates SQL CREATE and INSERT statements for normalized tables.
 * @param result Normalization result containing tables for each normal form.
 * @param stage The normalization stage ('unf', '1nf', '2nf', '3nf').
 * @returns SQL string with CREATE and INSERT statements.
 */
export function generateSQL(result: NormalizationResult, stage: 'unf' | '1nf' | '2nf' | '3nf'): string {
  const tables = result[stage].tables;
  if (!tables.length) return '-- No tables to export\n';

  const sql: string[] = [];
  for (const table of tables) {
    // CREATE TABLE
    const columns = table.columns.map(col => `${col} VARCHAR`).join(', ');
    const primaryKey = result.candidateKeys.find(key => key.every(k => table.columns.includes(k))) || table.columns.slice(0, 1);
    const createStmt = `CREATE TABLE ${table.name} (${columns}, PRIMARY KEY (${primaryKey.join(', ')}));\n`;
    sql.push(createStmt);

    // INSERT statements (limit to first 5 rows for brevity)
    for (const row of table.rows.slice(0, 5)) {
      const values = table.columns.map(col => `'${String(row[col] ?? '').replace(/'/g, "''")}'`).join(', ');
      const insertStmt = `INSERT INTO ${table.name} (${table.columns.join(', ')}) VALUES (${values});\n`;
      sql.push(insertStmt);
    }
  }
  return sql.join('');
}
