/**
 * LLM Comparison Test Framework — Shared Types
 *
 * Defines interfaces for ground truth data, comparison results,
 * and scoring metrics for Haiku vs Opus quality evaluation.
 */

export interface GroundTruthProgram {
  programId: string;
  title: string;
  /** Central government (중앙) or local (지방) */
  category: 'central' | 'local';
  /** Complexity: simple (clear criteria), medium, complex (tables, compound conditions) */
  complexity: 'simple' | 'medium' | 'complex';
  /** Manually verified eligibility fields */
  expected: ExpectedEligibility;
  /** Document text used for extraction (cached) */
  documentTextPath?: string;
}

export interface ExpectedEligibility {
  regions: string[]; // Korean names (서울, 대구, etc.)
  companyScale: string[];
  minEmployees: number | null;
  maxEmployees: number | null;
  minRevenue: number | null; // 억원
  maxRevenue: number | null; // 억원
  minBusinessAge: number | null;
  maxBusinessAge: number | null;
  requiredCerts: string[];
  targetIndustry: string | null;
  exclusionConditions: string[];
  supportAmountMin: number | null; // 만원
  supportAmountMax: number | null; // 만원
}

export interface ModelResult {
  model: 'haiku' | 'opus';
  modelId: string;
  programId: string;
  extracted: ExpectedEligibility;
  tokensUsed: { input: number; output: number };
  costUSD: number;
  latencyMs: number;
  jsonValid: boolean;
  error?: string;
}

export interface FieldScore {
  field: string;
  exactMatch: boolean;
  partialMatch: number; // 0-1 for array fields (Jaccard similarity)
  hallucination: boolean; // extracted value not in ground truth
}

export interface ProgramComparison {
  programId: string;
  title: string;
  category: string;
  complexity: string;
  haiku: {
    scores: FieldScore[];
    overallAccuracy: number;
    costUSD: number;
    latencyMs: number;
    jsonValid: boolean;
  };
  opus: {
    scores: FieldScore[];
    overallAccuracy: number;
    costUSD: number;
    latencyMs: number;
    jsonValid: boolean;
  };
}

export interface ComparisonReport {
  timestamp: string;
  totalPrograms: number;
  /** Per-model aggregate stats */
  summary: {
    haiku: ModelSummary;
    opus: ModelSummary;
  };
  /** Per-program detailed comparisons */
  comparisons: ProgramComparison[];
  /** Decision recommendation */
  recommendation: 'haiku' | 'opus' | 'hybrid';
  recommendationReason: string;
}

export interface ModelSummary {
  model: string;
  totalCostUSD: number;
  totalCostKRW: number;
  avgCostPerProgram: number;
  avgLatencyMs: number;
  jsonValidRate: number;
  overallAccuracy: number;
  fieldAccuracy: Record<string, number>;
  hallucinationRate: number;
}
