/**
 * Agency Detail Parsers
 *
 * Exports all agency-specific detail parsers for NTIS funding programs
 */

import { Page } from 'playwright';

export { parseIITPDetails, type IITPProgramDetails } from './iitp-parser';
export { parseKEITDetails, type KEITProgramDetails } from './keit-parser';
export { parseTIPADetails, type TIPAProgramDetails } from './tipa-parser';
export { parseKIMSTDetails, type KIMSTProgramDetails } from './kimst-parser';

/**
 * Unified program details interface
 */
export interface ProgramDetails {
  description: string | null;
  deadline: Date | null;
  budgetAmount: number | null;
  targetType: 'COMPANY' | 'RESEARCH_INSTITUTE' | 'BOTH';
  minTRL: number | null;
  maxTRL: number | null;
  eligibilityCriteria: Record<string, any> | null;
}

/**
 * Parse program details based on agency ID
 */
export async function parseProgramDetails(
  page: Page,
  agencyId: string,
  url: string
): Promise<ProgramDetails> {
  const agency = agencyId.toLowerCase();

  switch (agency) {
    case 'iitp': {
      const { parseIITPDetails } = await import('./iitp-parser');
      return await parseIITPDetails(page, url);
    }
    case 'keit': {
      const { parseKEITDetails } = await import('./keit-parser');
      return await parseKEITDetails(page, url);
    }
    case 'tipa': {
      const { parseTIPADetails } = await import('./tipa-parser');
      return await parseTIPADetails(page, url);
    }
    case 'kimst': {
      const { parseKIMSTDetails } = await import('./kimst-parser');
      return await parseKIMSTDetails(page, url);
    }
    default:
      console.warn(`[Parser] Unknown agency: ${agencyId}, using default parser`);
      return {
        description: null,
        deadline: null,
        budgetAmount: null,
        targetType: 'BOTH',
        minTRL: null,
        maxTRL: null,
        eligibilityCriteria: null,
      };
  }
}
