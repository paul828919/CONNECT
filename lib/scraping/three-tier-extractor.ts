/**
 * Three-Tier Extraction Orchestrator
 *
 * Extends the existing TwoTierExtractor architecture with LLM tiers:
 *   Tier 1 ($0):      Rule-based regex + template matching → handles ~80% of fields
 *   Tier 2 (~$0.003): Claude Haiku 4.5 API → handles ~15% of remaining fields
 *   Tier 3 (~$0.20):  Claude Opus 4.5 (selective) → exceptions + feedback to Tier 1/2
 *
 * Orchestration:
 *   1. Run Tier 1 patterns on announcement text → collect results with confidence
 *   2. Identify fields still null or LOW confidence
 *   3. If any failed fields AND Tier 2 enabled → call Haiku for those field groups
 *   4. If still >50% fields missing AND Tier 3 enabled → escalate to Opus
 *
 * Environment toggles:
 *   ENABLE_TIER2_EXTRACTION=true/false
 *   ENABLE_TIER3_EXTRACTION=true/false
 *
 * Cost controls:
 *   MAX_TIER2_COST_PER_JOB (default: 50 won ≈ $0.04)
 *   MAX_TIER3_COST_PER_JOB (default: 300 won ≈ $0.22)
 */

import { ExtractionLogger } from './extraction-logger';
import { TwoTierExtractor, type DetailPageData, type AttachmentData } from './two-tier-extractor';
import {
  runTier1Extraction,
  getMissingFieldsByGroup,
  groupHasMissingFields,
  type Tier1Result,
  type Tier1Field,
  type FieldGroup,
  FIELD_GROUP_MAP,
} from './tier1-patterns';
import { Tier2HaikuExtractor, type Tier2Result } from './tier2-haiku-extractor';
import { Tier3OpusExtractor, type Tier3Result } from './tier3-opus-extractor';

// ============================================================================
// Configuration
// ============================================================================

export interface ThreeTierConfig {
  /** Enable Tier 2 (Haiku) extraction for failed fields */
  enableTier2: boolean;
  /** Enable Tier 3 (Opus) extraction for persistent failures */
  enableTier3: boolean;
  /** Max Tier 2 cost per job in KRW (default: 50 won) */
  maxTier2CostPerJob: number;
  /** Max Tier 3 cost per job in KRW (default: 300 won) */
  maxTier3CostPerJob: number;
  /** Force Tier 3 escalation (admin flag) */
  forceOpus: boolean;
}

export function getConfigFromEnv(): ThreeTierConfig {
  return {
    enableTier2: process.env.ENABLE_TIER2_EXTRACTION === 'true',
    enableTier3: process.env.ENABLE_TIER3_EXTRACTION === 'true',
    maxTier2CostPerJob: parseInt(process.env.MAX_TIER2_COST_PER_JOB || '50', 10),
    maxTier3CostPerJob: parseInt(process.env.MAX_TIER3_COST_PER_JOB || '300', 10),
    forceOpus: false,
  };
}

// ============================================================================
// Extraction Result
// ============================================================================

export interface ThreeTierExtractionResult {
  /** Which tier completed extraction (1, 2, or 3) */
  highestTierUsed: 1 | 2 | 3;
  /** All extracted field values */
  fields: Map<Tier1Field, { value: any; confidence: string; tier: number; source: string }>;
  /** Tier 2 tokens used (input + output) */
  tier2TokensUsed: number;
  /** Tier 3 tokens used (input + output) */
  tier3TokensUsed: number;
  /** Estimated cost in KRW */
  estimatedCostKRW: number;
  /** Fields that remained unextracted after all tiers */
  failedFields: Tier1Field[];
  /** Tier 1 results (for debugging/logging) */
  tier1Results: Tier1Result[];
  /** Tier 2 results (for debugging/logging) */
  tier2Results: Tier2Result[];
  /** Tier 3 result (for debugging/logging) */
  tier3Result: Tier3Result | null;
}

// ============================================================================
// ThreeTierExtractor Class
// ============================================================================

export class ThreeTierExtractor {
  private jobId: string;
  private detailPageData: DetailPageData;
  private attachmentData: AttachmentData;
  private logger: ExtractionLogger;
  private config: ThreeTierConfig;
  private twoTierExtractor: TwoTierExtractor;

  constructor(
    jobId: string,
    detailPageData: DetailPageData,
    attachmentData: AttachmentData,
    logger: ExtractionLogger,
    config?: Partial<ThreeTierConfig>
  ) {
    this.jobId = jobId;
    this.detailPageData = detailPageData;
    this.attachmentData = attachmentData;
    this.logger = logger;
    this.config = { ...getConfigFromEnv(), ...config };

    // Reuse existing TwoTierExtractor for backward-compatible field extraction
    this.twoTierExtractor = new TwoTierExtractor(
      jobId,
      detailPageData,
      attachmentData,
      logger
    );
  }

  /**
   * Run the full three-tier extraction pipeline
   */
  async extract(): Promise<ThreeTierExtractionResult> {
    const result: ThreeTierExtractionResult = {
      highestTierUsed: 1,
      fields: new Map(),
      tier2TokensUsed: 0,
      tier3TokensUsed: 0,
      estimatedCostKRW: 0,
      failedFields: [],
      tier1Results: [],
      tier2Results: [],
      tier3Result: null,
    };

    // Combine announcement text for pattern matching
    const announcementText = this.getAnnouncementText();

    // ====================================================================
    // TIER 1: Rule-based extraction ($0)
    // ====================================================================
    console.log(`[3TIER] Job ${this.jobId}: Starting Tier 1 extraction...`);

    // Run new consolidated Tier 1 patterns
    const tier1Results = runTier1Extraction(announcementText);
    result.tier1Results = tier1Results;

    // Store Tier 1 results
    for (const t1r of tier1Results) {
      result.fields.set(t1r.field, {
        value: t1r.value,
        confidence: t1r.confidence,
        tier: 1,
        source: t1r.matchedPattern || 'tier1-regex',
      });
    }

    // Also run existing TwoTierExtractor methods for the fields it handles well
    // (deadline, publishedAt, applicationStart, budget, TRL, eligibility, etc.)
    await this.runLegacyTier1(result);

    const tier1FieldCount = result.fields.size;
    console.log(`[3TIER] Job ${this.jobId}: Tier 1 extracted ${tier1FieldCount} fields`);

    // ====================================================================
    // TIER 2: Haiku extraction (if enabled)
    // ====================================================================
    const missingByGroup = this.getMissingFieldGroups(result);
    const groupsWithMissing = (['A', 'B', 'C', 'D'] as FieldGroup[])
      .filter(g => missingByGroup[g].length > 0);

    if (this.config.enableTier2 && groupsWithMissing.length > 0) {
      console.log(`[3TIER] Job ${this.jobId}: Tier 2 needed for groups: ${groupsWithMissing.join(', ')}`);
      result.highestTierUsed = 2;

      try {
        const tier2Extractor = new Tier2HaikuExtractor(
          this.jobId,
          this.config.maxTier2CostPerJob
        );

        const tier2Results = await tier2Extractor.extractFields(
          announcementText,
          missingByGroup,
          groupsWithMissing
        );

        result.tier2Results = tier2Results;

        // Merge Tier 2 results (don't overwrite Tier 1 successes)
        for (const t2r of tier2Results) {
          if (!result.fields.has(t2r.field) && t2r.value !== null) {
            result.fields.set(t2r.field, {
              value: t2r.value,
              confidence: t2r.confidence,
              tier: 2,
              source: 'haiku-tier2',
            });
          }
          result.tier2TokensUsed += t2r.tokensUsed || 0;
        }

        // Estimate Tier 2 cost: ~7 KRW per 1000 tokens (Haiku pricing)
        result.estimatedCostKRW += Math.round(result.tier2TokensUsed * 0.007);

        console.log(`[3TIER] Job ${this.jobId}: Tier 2 added ${tier2Results.filter(r => r.value !== null).length} fields, ${result.tier2TokensUsed} tokens`);
      } catch (error: any) {
        console.error(`[3TIER] Job ${this.jobId}: Tier 2 failed:`, error.message);
      }
    }

    // ====================================================================
    // TIER 3: Opus extraction (selective, if enabled)
    // ====================================================================
    const shouldEscalate = this.shouldEscalateToTier3(result);

    if ((this.config.enableTier3 && shouldEscalate) || this.config.forceOpus) {
      console.log(`[3TIER] Job ${this.jobId}: Escalating to Tier 3 (Opus)${this.config.forceOpus ? ' [FORCED]' : ''}`);
      result.highestTierUsed = 3;

      try {
        const tier3Extractor = new Tier3OpusExtractor(
          this.jobId,
          this.config.maxTier3CostPerJob
        );

        const tier3Result = await tier3Extractor.extractAll(
          announcementText,
          result.tier1Results,
          result.tier2Results
        );

        result.tier3Result = tier3Result;

        // Merge Tier 3 results
        if (tier3Result.fields) {
          for (const [field, data] of Object.entries(tier3Result.fields)) {
            const fieldKey = field as Tier1Field;
            if (data !== null && data !== undefined) {
              // Tier 3 overwrites even existing values (higher quality)
              result.fields.set(fieldKey, {
                value: data,
                confidence: 'HIGH',
                tier: 3,
                source: 'opus-tier3',
              });
            }
          }
        }

        result.tier3TokensUsed = tier3Result.tokensUsed || 0;
        // Estimate Tier 3 cost: ~40 KRW per 1000 tokens (Opus pricing)
        result.estimatedCostKRW += Math.round(result.tier3TokensUsed * 0.04);

        console.log(`[3TIER] Job ${this.jobId}: Tier 3 completed, ${result.tier3TokensUsed} tokens`);
      } catch (error: any) {
        console.error(`[3TIER] Job ${this.jobId}: Tier 3 failed:`, error.message);
      }
    }

    // ====================================================================
    // Compute final stats
    // ====================================================================
    const allFields = Object.keys(FIELD_GROUP_MAP) as Tier1Field[];
    result.failedFields = allFields.filter(f => !result.fields.has(f));

    const totalFields = allFields.length;
    const extractedFields = result.fields.size;
    const coverage = Math.round((extractedFields / totalFields) * 100);

    console.log(`[3TIER] Job ${this.jobId}: Complete — ${extractedFields}/${totalFields} fields (${coverage}%), highest tier: ${result.highestTierUsed}, cost: ${result.estimatedCostKRW} KRW`);

    return result;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Get combined announcement text from all sources
   */
  private getAnnouncementText(): string {
    const parts: string[] = [];

    // Announcement files (highest priority)
    for (const file of this.attachmentData.announcementFiles) {
      if (file.text) parts.push(file.text);
    }

    // Detail page rawHtml (fallback)
    if (this.detailPageData.rawHtml) {
      parts.push(this.detailPageData.rawHtml);
    }

    // Description (additional context)
    if (this.detailPageData.description) {
      parts.push(this.detailPageData.description);
    }

    return parts.join('\n\n');
  }

  /**
   * Run existing TwoTierExtractor methods for backward compatibility
   * These handle budget semantic analysis, TRL extraction, etc.
   */
  private async runLegacyTier1(result: ThreeTierExtractionResult): Promise<void> {
    // Only run legacy extraction for fields NOT already extracted by new Tier 1 patterns

    if (!result.fields.has('deadline')) {
      const deadline = await this.twoTierExtractor.extractDeadline();
      if (deadline) {
        result.fields.set('deadline', {
          value: deadline,
          confidence: 'HIGH',
          tier: 1,
          source: 'legacy-two-tier',
        });
      }
    }

    if (!result.fields.has('publishedAt')) {
      const publishedAt = await this.twoTierExtractor.extractPublishedAt();
      if (publishedAt) {
        result.fields.set('publishedAt', {
          value: publishedAt,
          confidence: 'HIGH',
          tier: 1,
          source: 'legacy-two-tier',
        });
      }
    }

    if (!result.fields.has('applicationStart')) {
      const applicationStart = await this.twoTierExtractor.extractApplicationStart();
      if (applicationStart) {
        result.fields.set('applicationStart', {
          value: applicationStart,
          confidence: 'HIGH',
          tier: 1,
          source: 'legacy-two-tier',
        });
      }
    }

    if (!result.fields.has('budgetAmount')) {
      const budget = await this.twoTierExtractor.extractBudget();
      if (budget) {
        result.fields.set('budgetAmount', {
          value: budget,
          confidence: 'HIGH',
          tier: 1,
          source: 'legacy-two-tier-semantic',
        });
      }
    }
  }

  /**
   * Get missing fields grouped for Tier 2 batching
   */
  private getMissingFieldGroups(
    result: ThreeTierExtractionResult
  ): Record<FieldGroup, Tier1Field[]> {
    const allFields = Object.keys(FIELD_GROUP_MAP) as Tier1Field[];
    const missing: Record<FieldGroup, Tier1Field[]> = { A: [], B: [], C: [], D: [] };

    for (const field of allFields) {
      if (!result.fields.has(field)) {
        missing[FIELD_GROUP_MAP[field]].push(field);
      }
    }

    return missing;
  }

  /**
   * Determine if Tier 3 escalation is needed
   *
   * Trigger conditions:
   * 1. >50% of fields still missing after Tier 1+2
   * 2. New format detected (Tier 1 extracted <3 fields AND Tier 2 returned >50% null)
   * 3. Format anomaly (no text content extracted)
   */
  private shouldEscalateToTier3(result: ThreeTierExtractionResult): boolean {
    const allFieldCount = Object.keys(FIELD_GROUP_MAP).length;
    const extractedCount = result.fields.size;
    const missingRatio = 1 - (extractedCount / allFieldCount);

    // Condition 1: >50% fields missing
    if (missingRatio > 0.5) {
      console.log(`[3TIER] Tier 3 trigger: ${Math.round(missingRatio * 100)}% fields missing`);
      return true;
    }

    // Condition 2: Tier 1 extracted very few fields and Tier 2 also largely failed
    if (result.tier1Results.length < 3 && result.tier2Results.length > 0) {
      const tier2Successes = result.tier2Results.filter(r => r.value !== null).length;
      const tier2Total = result.tier2Results.length;
      if (tier2Total > 0 && tier2Successes / tier2Total < 0.5) {
        console.log(`[3TIER] Tier 3 trigger: new format detected (Tier 1: ${result.tier1Results.length} fields, Tier 2: ${tier2Successes}/${tier2Total} success)`);
        return true;
      }
    }

    // Condition 3: No announcement text (scanned PDF / image-only HWP)
    const announcementText = this.getAnnouncementText();
    if (announcementText.trim().length < 100) {
      console.log('[3TIER] Tier 3 trigger: no text content (possible scanned document)');
      return true;
    }

    return false;
  }
}
