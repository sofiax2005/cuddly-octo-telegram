// lib/types.ts - TypeScript interfaces for normalization data structures

export interface Entity {
  name: string;
  attributes: string[]; // e.g., ["id PK", "name", "age"]
  relationships?: Relationship[]; // Optional for future edge definitions
}

export interface Schema {
  entities: Entity[];
  // Can extend with more: primaryKeys?: string[][], foreignKeys?: {from: string, to: string}[]
}

export interface FunctionalDependency {
  lhs: string[]; // Left-hand side attributes
  rhs: string[]; // Right-hand side attributes
}

export interface NormalizationData {
  unf: Schema;
  '1nf': Schema;
  '2nf': Schema;
  '3nf': Schema;
  dependencies: FunctionalDependency[];
  keys: string[][]; // Candidate keys as arrays of attribute names
}

// Additional types for app flow
export interface NormalizationStage {
  stage: number; // 0: UNF, 1: 1NF, etc.
  schema: Schema;
  narration: string; // Tooltip text for the stage
}

// For API responses
export interface NormalizeResponse extends NormalizationData {
  sql: string; // Generated SQL schema
  error?: string;
}
