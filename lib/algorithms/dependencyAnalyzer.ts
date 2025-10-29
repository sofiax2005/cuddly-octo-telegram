import type { FD } from './closure';
import { closure } from './closure';

/**
 * Classifies FDs into full, partial, and transitive dependencies.
 * - Full: LHS is a candidate key.
 * - Partial: LHS is a proper subset of a candidate key.
 * - Transitive: A -> B, B -> C implies A -> C, where B is not a key.
 * Complexity: O(|F| * |K| * |C|) due to closure computations.
 */
export type DependencyClassification = {
  full: FD[];
  partial: FD[];
  transitive: FD[];
};

export function classifyDependencies(allFDs: FD[], candidateKeys: string[][]): DependencyClassification {
  const full: FD[] = [], partial: FD[] = [], transitive: FD[] = [];

  const isSubsetOfKey = (attrs: string[]) => candidateKeys.some(k => attrs.every(a => k.includes(a)));

  for (const fd of allFDs) {
    if (isSubsetOfKey(fd.lhs)) {
      const equalsKey = candidateKeys.some(k => k.length === fd.lhs.length && k.every(x => fd.lhs.includes(x)));
      if (!equalsKey) partial.push(fd);
      else full.push(fd);
    } else {
      let isTrans = false;
      for (const key of candidateKeys) {
        const cl = closure(key, allFDs);
        if (fd.lhs.every(a => cl.includes(a)) && !cl.includes(fd.rhs)) {
          isTrans = true;
          break;
        }
      }
      if (isTrans) transitive.push(fd);
      else full.push(fd);
    }
  }

  return { full, partial, transitive };
}
