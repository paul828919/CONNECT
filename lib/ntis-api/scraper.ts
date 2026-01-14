/**
 * NTIS API Scraper Service
 * 
 * Integrates NTIS API with the existing scraping system
 * Fetches R&D programs and saves them to the database
 */

import { db } from '@/lib/db';
import { AgencyId } from '@prisma/client';
import { NTISApiClient } from './client';
import { NTISXmlParser } from './parser';
import { ntisApiConfig, agencySearchConfigs, defaultSearchParams } from './config';
import { NTISProgram } from './types';
import { generateProgramHash } from '../scraping/utils';


export class NTISApiScraper {
  private client: NTISApiClient;
  private parser: NTISXmlParser;

  constructor() {
    this.client = new NTISApiClient(ntisApiConfig);
    this.parser = new NTISXmlParser();
  }

  /**
   * Scrape recent programs from all agencies
   */
  async scrapeAllAgencies(daysBack: number = 30): Promise<{
    success: boolean;
    programsNew: number;
    programsUpdated: number;
    totalFound: number;
  }> {
    console.log(`🔄 Starting NTIS API scraping (last ${daysBack} days)...`);

    let totalFound = 0;
    let programsNew = 0;
    let programsUpdated = 0;

    try {
      // Search for recent programs
      const response = await this.client.searchRecentAnnouncements(daysBack, 100);

      if (!response.success || !response.data) {
        console.error('❌ NTIS API request failed:', response.error);
        return { success: false, programsNew: 0, programsUpdated: 0, totalFound: 0 };
      }

      // Parse XML response
      const parsed = await this.parser.parseSearchResponse(response.data);
      totalFound = parsed.programs.length;

      console.log(`✅ Found ${totalFound} programs from NTIS API`);

      // Process each program
      for (const program of parsed.programs) {
        const result = await this.saveProgram(program);
        if (result === 'new') programsNew++;
        else if (result === 'updated') programsUpdated++;
      }

      console.log(`✅ NTIS API scraping completed: ${programsNew} new, ${programsUpdated} updated`);

      return {
        success: true,
        programsNew,
        programsUpdated,
        totalFound,
      };
    } catch (error: any) {
      console.error('❌ NTIS API scraping error:', error);
      return { success: false, programsNew: 0, programsUpdated: 0, totalFound: 0 };
    }
  }

  /**
   * Scrape programs from a specific agency
   */
  async scrapeByAgency(agencyKey: string): Promise<{
    success: boolean;
    programsNew: number;
    programsUpdated: number;
    totalFound: number;
  }> {
    const agencyConfig = agencySearchConfigs[agencyKey as keyof typeof agencySearchConfigs];
    
    if (!agencyConfig) {
      console.error(`❌ Unknown agency: ${agencyKey}`);
      return { success: false, programsNew: 0, programsUpdated: 0, totalFound: 0 };
    }

    console.log(`🔄 Scraping ${agencyConfig.agencyName} from NTIS API...`);

    let totalFound = 0;
    let programsNew = 0;
    let programsUpdated = 0;

    try {
      const response = await this.client.searchByAgency(agencyConfig.agencyName, {
        ...defaultSearchParams,
        displayCnt: 100,
      });

      if (!response.success || !response.data) {
        console.error('❌ NTIS API request failed:', response.error);
        return { success: false, programsNew: 0, programsUpdated: 0, totalFound: 0 };
      }

      const parsed = await this.parser.parseSearchResponse(response.data);
      totalFound = parsed.programs.length;

      console.log(`✅ Found ${totalFound} programs for ${agencyConfig.agencyName}`);

      for (const program of parsed.programs) {
        const result = await this.saveProgram(program);
        if (result === 'new') programsNew++;
        else if (result === 'updated') programsUpdated++;
      }

      console.log(`✅ ${agencyConfig.agencyName} scraping completed: ${programsNew} new, ${programsUpdated} updated`);

      return {
        success: true,
        programsNew,
        programsUpdated,
        totalFound,
      };
    } catch (error: any) {
      console.error('❌ Agency scraping error:', error);
      return { success: false, programsNew: 0, programsUpdated: 0, totalFound: 0 };
    }
  }

  /**
   * Save or update a program in the database
   */
  private async saveProgram(program: NTISProgram): Promise<'new' | 'updated' | 'skipped'> {
    try {
      // Generate content hash for deduplication (V2: title-based, not URL-based)
      const contentHash = generateProgramHash({
        agencyId: program.orderAgency || 'NTIS',
        title: program.titleKorean || '',
        deadline: program.endDate,
        ministry: program.ministry,
      });

      // Check if program exists
      const existing = await db.funding_programs.findFirst({
        where: { contentHash },
      });

      // Determine agency ID from order agency
      const agencyId = this.mapAgencyId(program.orderAgency || '');

      // Parse deadline from endDate
      const deadline = program.endDate ? new Date(program.endDate) : null;

      // Determine target type based on perform agent
      const targetType = this.mapTargetType(program.performAgent);

      if (!existing) {
        // Create new program
        await db.funding_programs.create({
          data: {
            agencyId: agencyId,
            title: program.titleKorean || program.titleEnglish || 'Untitled',
            description: this.buildDescription(program),
            announcementUrl: `https://www.ntis.go.kr/project/${program.projectNumber}`,
            deadline,
            budgetAmount: program.totalFunds,
            targetType,
            minTrl: null,
            maxTrl: null,
            eligibilityCriteria: this.buildEligibilityCriteria(program),
            contentHash,
            scrapedAt: new Date(),
            scrapingSource: 'NTIS_API',
            status: 'ACTIVE',
          },
        });

        return 'new';
      } else {
        // Update existing program
        await db.funding_programs.update({
          where: { id: existing.id },
          data: {
            scrapedAt: new Date(),
          },
        });

        return 'updated';
      }
    } catch (error: any) {
      console.error(`❌ Failed to save program ${program.projectNumber}:`, error.message);
      return 'skipped';
    }
  }

  /**
   * Build description from program data
   */
  private buildDescription(program: NTISProgram): string {
    const parts = [];

    if (program.goal) parts.push(`**연구목표**: ${program.goal}`);
    if (program.abstract) parts.push(`**연구내용**: ${program.abstract}`);
    if (program.effect) parts.push(`**기대효과**: ${program.effect}`);
    if (program.keywordsKorean.length > 0) {
      parts.push(`**키워드**: ${program.keywordsKorean.join(', ')}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Build eligibility criteria from program data
   */
  private buildEligibilityCriteria(program: NTISProgram): Record<string, any> {
    return {
      performAgent: program.performAgent,
      ministry: program.ministry,
      researchAgency: program.researchAgency,
      developmentPhases: program.developmentPhases,
      region: program.region,
      scienceClass: program.scienceClass,
    };
  }

  /**
   * Map agency name to agency ID
   *
   * CRITICAL FIX: Default must be a valid AgencyId enum value
   * Valid values: IITP, KEIT, TIPA, KIMST (no 'NTIS' in enum!)
   */
  private mapAgencyId(orderAgency: string): AgencyId {
    const agency = orderAgency.toLowerCase();

    if (agency.includes('정보통신') || agency.includes('iitp')) return 'IITP' as AgencyId;
    if (agency.includes('중소기업') || agency.includes('tipa') || agency.includes('기술정보')) return 'TIPA' as AgencyId;
    if (agency.includes('해양') || agency.includes('kimst') || agency.includes('수산')) return 'KIMST' as AgencyId;
    if (agency.includes('산업기술') || agency.includes('keit') || agency.includes('산업통상')) return 'KEIT' as AgencyId;

    // Default to IITP (most common for general R&D) instead of invalid 'NTIS'
    return 'IITP' as AgencyId;
  }

  /**
   * Map perform agent to target type
   */
  private mapTargetType(performAgent: string | null): ('COMPANY' | 'RESEARCH_INSTITUTE')[] {
    if (!performAgent) return ['COMPANY', 'RESEARCH_INSTITUTE'];

    const agent = performAgent.toLowerCase();
    if (agent.includes('대학') || agent.includes('연구소') || agent.includes('출연')) {
      return ['RESEARCH_INSTITUTE'];
    }
    if (agent.includes('기업')) {
      return ['COMPANY'];
    }
    return ['COMPANY', 'RESEARCH_INSTITUTE'];
  }
}
