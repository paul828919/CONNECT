import { funding_programs } from '@prisma/client';
import { EligibilityCheckResult, EligibilityLevel } from '../eligibility';

export type ProgramApplicationType =
  | 'OPEN_COMPETITION'
  | 'DESIGNATED'
  | 'DEMAND_SURVEY'
  | 'INSTITUTIONAL_ONLY'
  | 'CONSOLIDATED'
  | 'UNKNOWN';

export interface EligibilityGateResult {
  passed: boolean;
  blockReasons: string[];
  applicationType: ProgramApplicationType;
  eligibilityResult: EligibilityCheckResult;
}

export interface NegativeSignal {
  code: string;
  penalty: number; // negative number
  detail: string;
}

export interface SemanticScore {
  score: number;
  breakdown: {
    domainRelevance: number; // 0-25
    capabilityFit: number; // 0-15
    intentAlignment: number; // 0-10
    negativeSignals: number; // -10 to 0
    confidenceBonus: number; // 0-10
  };
  reasons: string[];
  negativeSignals: NegativeSignal[];
}

export interface PracticalScore {
  score: number;
  breakdown: {
    trlAlignment: number; // 0-10
    scaleFit: number; // 0-8
    rdTrack: number; // 0-5
    deadlineUrgency: number; // 0-7
    certificationBonus: number; // 0-5
  };
  reasons: string[];
}

export interface V6MatchScore {
  programId: string;
  program: funding_programs;
  score: number;
  breakdown: {
    keywordScore: number;
    industryScore: number;
    trlScore: number;
    typeScore: number;
    rdScore: number;
    deadlineScore: number;
  };
  reasons: string[];
  eligibilityLevel?: EligibilityLevel;
  eligibilityDetails?: {
    hardRequirementsMet: boolean;
    softRequirementsMet: boolean;
    failedRequirements: string[];
    metRequirements: string[];
    needsManualReview: boolean;
    manualReviewReason?: string;
  };
  v6Details?: {
    semantic: SemanticScore;
    practical: PracticalScore;
  };
}
