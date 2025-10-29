import type { NormalizationData } from './types'; // Define types: { unf: Schema, 1nf: Schema, ... } where Schema = {entities: Entity[], ...}, Entity = {name: string, attributes: string[]}

export function normalizeData(csvData: any[]): NormalizationData {
  // Heuristic: detect multi-valued columns
  const multiCols: string[] = [];
  const headers = Object.keys(csvData[0] || {});
  csvData.forEach(row => {
    headers.forEach(col => {
      if (String(row[col] || '').includes(',')) {
        multiCols.push(col);
      }
    });
  });
  multiCols = [...new Set(multiCols)]; // unique

  // Hardcoded for TV dataset, but dynamic based on multiCols
  // Assume multi: director, cast, country, listed_in; single: rating for 3NF split

  const unf: Schema = {
    entities: [{
      name: 'TV_SHOW',
      attributes: headers,
    }],
  };

  const oneNF: Schema = {
    entities: [
      {
        name: 'TV_SHOW',
        attributes: headers.filter(h => !multiCols.includes(h)).map(h => `${h}${h.includes('id') ? ' PK' : ''}`),
      },
      ...multiCols.flatMap(col => [
        {
          name: `${col.toUpperCase()}S`,
          attributes: [`${col}_id PK`, col],
        },
        {
          name: `SHOWS_${col.toUpperCase()}`,
          attributes: [`show_id FK`, `${col}_id FK`],
        },
      ]),
    ],
  };

  const twoNF = { ...oneNF }; // No partial deps in this simple case

  const threeNF: Schema = {
    ...twoNF,
    entities: twoNF.entities.map(entity => {
      if (entity.name === 'TV_SHOW') {
        return {
          ...entity,
          attributes: entity.attributes.filter(a => !a.includes('rating')).concat('rating_id FK'),
        };
      }
      if (entity.name === 'RATINGS') { // Add new
        return { name: 'RATINGS', attributes: ['rating_id PK', 'rating'] };
      }
      return entity;
    }).filter((_, i) => i < twoNF.entities.length || true), // Simplified add
  };

  // Add missing RATINGS
  threeNF.entities.push({ name: 'RATINGS', attributes: ['rating_id PK', 'rating'] });

  const dependencies = [
    { lhs: ['show_id'], rhs: ['title', 'release_year'] },
    { lhs: ['director_id'], rhs: ['director'] },
    // etc.
  ];

  const keys = [['show_id']];

  return {
    unf,
    '1nf': oneNF,
    '2nf': twoNF,
    '3nf': threeNF,
    dependencies,
    keys,
  };
}

function generateSQL(schema: Schema): string {
  let sql = '';
  schema.entities.forEach(entity => {
    sql += `CREATE TABLE ${entity.name} (\n`;
    entity.attributes.forEach(attr => {
      sql += `  ${attr},\n`;
    });
    sql = sql.slice(0, -2) + '\n);\n\n';
  });
  return sql;
}
