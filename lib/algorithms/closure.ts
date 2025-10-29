/**
 * Attribute closure computation under a set of functional dependencies (FDs).
 * Complexity: O(|F| * |R|) per iteration in worst case (practical much lower).
 */
export type FD = { lhs: string[]; rhs: string };

/**
 * Computes the closure of a set of attributes under given FDs.
 * @param attrSet Attributes to compute closure for.
 * @param fds Functional dependencies.
 * @returns Array of attributes in the closure.
 */
export function closure(attrSet: string[], fds: FD[]): string[] {
  const clos = new Set<string>(attrSet);
  let changed = true;
  while (changed) {
    changed = false;
    for (const fd of fds) {
      const lhsHolds = fd.lhs.every(a => clos.has(a));
      if (lhsHolds && !clos.has(fd.rhs)) {
        clos.add(fd.rhs);
        changed = true;
      }
    }
  }
  return Array.from(clos);
}

/**
 * Checks if a set of attributes is a superkey.
 * @param candidate Candidate key attributes.
 * @param columns All columns in the table.
 * @param fds Functional dependencies.
 * @returns True if candidate is a superkey.
 */
export function isSuperKey(candidate: string[], columns: string[], fds: FD[]): boolean {
  const c = closure(candidate, fds);
  return columns.every(col => c.includes(col));
}
