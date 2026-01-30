/**
 * Three-tier duplicate detection algorithm for program tables.
 *
 * Tier 1: Exact contentHash match (O(n) grouping)
 * Tier 2: Same pblancSeq, different IDs — SME only (O(n) grouping)
 * Tier 3: Title similarity >= 90% using Damerau-Levenshtein (O(n²) with length pre-filter)
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const damerauLevenshtein = require('damerau-levenshtein');

export interface DuplicateProgram {
  id: string;
  title: string;
  pblancSeq?: number | null;
  contentHash?: string | null;
  status: string;
  completeness: { percent: number; filled: number; total: number };
  matchCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateGroup {
  groupId: string;
  reason: 'contentHash' | 'pblancSeq' | 'titleSimilarity';
  similarity: number;
  programs: DuplicateProgram[];
  suggestedKeepId: string;
}

export interface DuplicateDetectionResult {
  groups: DuplicateGroup[];
  summary: {
    totalGroups: number;
    totalDuplicates: number;
    byReason: Record<string, number>;
  };
}

interface DetectOptions {
  /** Enable pblancSeq matching (SME only) */
  enablePblancSeq?: boolean;
  /** Title similarity threshold (default 0.90) */
  similarityThreshold?: number;
}

/**
 * Select the best program to keep: highest completeness → most matches → most recent.
 */
function pickSuggestedKeep(programs: DuplicateProgram[]): string {
  const sorted = [...programs].sort((a, b) => {
    if (a.completeness.percent !== b.completeness.percent)
      return b.completeness.percent - a.completeness.percent;
    if (a.matchCount !== b.matchCount) return b.matchCount - a.matchCount;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  return sorted[0].id;
}

/**
 * Detect duplicates across all provided programs.
 */
export function detectDuplicates(
  programs: DuplicateProgram[],
  options: DetectOptions = {}
): DuplicateDetectionResult {
  const { enablePblancSeq = false, similarityThreshold = 0.9 } = options;

  const groups: DuplicateGroup[] = [];
  // Track which IDs have already been assigned to a group (avoid double-counting)
  const assignedIds = new Set<string>();
  let groupCounter = 0;

  // ── Tier 1: Exact contentHash match ─────────────────────────
  const hashMap = new Map<string, DuplicateProgram[]>();
  for (const p of programs) {
    if (!p.contentHash) continue;
    const existing = hashMap.get(p.contentHash);
    if (existing) {
      existing.push(p);
    } else {
      hashMap.set(p.contentHash, [p]);
    }
  }

  for (const [, groupPrograms] of hashMap) {
    if (groupPrograms.length < 2) continue;
    const ids = groupPrograms.map((p) => p.id);
    ids.forEach((id) => assignedIds.add(id));
    const suggestedKeepId = pickSuggestedKeep(groupPrograms);
    groups.push({
      groupId: `hash-${++groupCounter}`,
      reason: 'contentHash',
      similarity: 1.0,
      programs: groupPrograms,
      suggestedKeepId,
    });
  }

  // ── Tier 2: Same pblancSeq (SME only) ──────────────────────
  if (enablePblancSeq) {
    const seqMap = new Map<number, DuplicateProgram[]>();
    for (const p of programs) {
      if (assignedIds.has(p.id)) continue;
      if (p.pblancSeq == null) continue;
      const existing = seqMap.get(p.pblancSeq);
      if (existing) {
        existing.push(p);
      } else {
        seqMap.set(p.pblancSeq, [p]);
      }
    }

    for (const [, groupPrograms] of seqMap) {
      if (groupPrograms.length < 2) continue;
      const ids = groupPrograms.map((p) => p.id);
      ids.forEach((id) => assignedIds.add(id));
      const suggestedKeepId = pickSuggestedKeep(groupPrograms);
      groups.push({
        groupId: `seq-${++groupCounter}`,
        reason: 'pblancSeq',
        similarity: 1.0,
        programs: groupPrograms,
        suggestedKeepId,
      });
    }
  }

  // ── Tier 3: Title similarity (Damerau-Levenshtein) ──────────
  // Pre-filter: two strings with length ratio < threshold cannot possibly match.
  // For threshold t, if |a|/|b| < t (or vice versa), similarity < t.
  const unassigned = programs.filter((p) => !assignedIds.has(p.id) && p.title);

  // Union-Find for merging transitive title-similarity pairs
  const parent = new Map<string, string>();
  function find(x: string): string {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root)!;
    // Path compression
    let cur = x;
    while (cur !== root) {
      const next = parent.get(cur)!;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (const p of unassigned) {
    parent.set(p.id, p.id);
  }

  // Track best (minimum) similarity per group pair for reporting
  const pairSimilarity = new Map<string, number>();

  for (let i = 0; i < unassigned.length; i++) {
    const a = unassigned[i];
    const aLen = a.title.length;
    for (let j = i + 1; j < unassigned.length; j++) {
      const b = unassigned[j];
      const bLen = b.title.length;

      // Length pre-filter: skip if lengths are too different
      const ratio = Math.min(aLen, bLen) / Math.max(aLen, bLen);
      if (ratio < similarityThreshold) continue;

      const result = damerauLevenshtein(a.title, b.title);
      if (result.similarity >= similarityThreshold) {
        union(a.id, b.id);
        // Track minimum similarity across pairs in same group
        const rootKey = find(a.id);
        const existing = pairSimilarity.get(rootKey);
        if (existing === undefined || result.similarity < existing) {
          pairSimilarity.set(rootKey, result.similarity);
        }
      }
    }
  }

  // Collect groups from union-find
  const titleGroups = new Map<string, DuplicateProgram[]>();
  for (const p of unassigned) {
    const root = find(p.id);
    const existing = titleGroups.get(root);
    if (existing) {
      existing.push(p);
    } else {
      titleGroups.set(root, [p]);
    }
  }

  for (const [root, groupPrograms] of titleGroups) {
    if (groupPrograms.length < 2) continue;
    const ids = groupPrograms.map((p) => p.id);
    ids.forEach((id) => assignedIds.add(id));
    const suggestedKeepId = pickSuggestedKeep(groupPrograms);
    groups.push({
      groupId: `title-${++groupCounter}`,
      reason: 'titleSimilarity',
      similarity: pairSimilarity.get(root) ?? similarityThreshold,
      programs: groupPrograms,
      suggestedKeepId,
    });
  }

  // Build summary
  const byReason: Record<string, number> = {};
  let totalDuplicates = 0;
  for (const g of groups) {
    byReason[g.reason] = (byReason[g.reason] || 0) + 1;
    // Duplicates = all programs minus the suggested keep
    totalDuplicates += g.programs.length - 1;
  }

  return {
    groups,
    summary: {
      totalGroups: groups.length,
      totalDuplicates,
      byReason,
    },
  };
}
