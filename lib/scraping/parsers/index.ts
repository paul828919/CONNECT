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
export { parseNTISAnnouncementDetails, type NTISAnnouncementDetails } from './ntis-announcement-parser';

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
  publishedAt?: Date | null; // Optional: Only NTIS announcement parser provides this
  ministry?: string | null; // Optional: 부처명 (extracted from NTIS announcements)
  announcingAgency?: string | null; // Optional: 공고기관명 (extracted from NTIS announcements)
  category?: string | null; // Optional: Industry sector (extracted from agency)
  keywords?: string[]; // Optional: Technology keywords (agency defaults + extracted from title/description)
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
      const result = await parseIITPDetails(page, url);
      return { ...result, publishedAt: null, ministry: null, announcingAgency: null, category: null, keywords: [] } as ProgramDetails;
    }
    case 'keit': {
      const { parseKEITDetails } = await import('./keit-parser');
      const result = await parseKEITDetails(page, url);
      return { ...result, publishedAt: null, ministry: null, announcingAgency: null, category: null, keywords: [] } as ProgramDetails;
    }
    case 'tipa': {
      const { parseTIPADetails } = await import('./tipa-parser');
      const result = await parseTIPADetails(page, url);
      return { ...result, publishedAt: null, ministry: null, announcingAgency: null, category: null, keywords: [] } as ProgramDetails;
    }
    case 'kimst': {
      const { parseKIMSTDetails } = await import('./kimst-parser');
      const result = await parseKIMSTDetails(page, url);
      return { ...result, publishedAt: null, ministry: null, announcingAgency: null, category: null, keywords: [] } as ProgramDetails;
    }
    case 'ntis': {
      const { parseNTISAnnouncementDetails } = await import('./ntis-announcement-parser');
      return await parseNTISAnnouncementDetails(page, url);
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
        publishedAt: null,
        ministry: null,
        announcingAgency: null,
        category: null,
        keywords: [],
      };
  }
}
