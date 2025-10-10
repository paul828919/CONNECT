/**
 * Token Counter Utility
 * Estimates token usage for cost tracking and budget management
 */

export class TokenCounter {
  /**
   * Estimate tokens for text
   * Korean: ~2.5 characters per token
   * English: ~4 characters per token
   * Mixed: ~3 characters per token
   */
  estimateTokens(text: string): number {
    const koreanChars = (text.match(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/g) || []).length;
    const totalChars = text.length;
    const nonKoreanChars = totalChars - koreanChars;

    // Weighted average based on language
    const koreanTokens = koreanChars / 2.5;
    const englishTokens = nonKoreanChars / 4;

    return Math.ceil(koreanTokens + englishTokens);
  }

  /**
   * Calculate cost in KRW
   * Sonnet 4.5: $3 per 1M input, $15 per 1M output
   * Exchange rate: 1,300 KRW per USD
   */
  calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCostUSD = (inputTokens / 1_000_000) * 3;
    const outputCostUSD = (outputTokens / 1_000_000) * 15;
    const totalUSD = inputCostUSD + outputCostUSD;
    return totalUSD * 1300; // Convert to KRW
  }

  /**
   * Calculate cost with caching
   * Cache writes: $3.75/1M tokens
   * Cache reads: $0.30/1M tokens (90% savings)
   */
  calculateCostWithCache(
    inputTokens: number,
    outputTokens: number,
    cachedTokens: number = 0
  ): number {
    const newInputTokens = inputTokens - cachedTokens;
    const newInputCost = (newInputTokens / 1_000_000) * 3;
    const cachedInputCost = (cachedTokens / 1_000_000) * 0.3;
    const outputCost = (outputTokens / 1_000_000) * 15;

    const totalUSD = newInputCost + cachedInputCost + outputCost;
    return totalUSD * 1300;
  }
}

export const tokenCounter = new TokenCounter();
