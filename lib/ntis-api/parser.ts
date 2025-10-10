/**
 * NTIS API XML Parser
 * 
 * Parses XML responses from NTIS API into structured program data
 */

import { parseStringPromise } from 'xml2js';
import { NTISProgram, NTISParsedResponse } from './types';

export class NTISXmlParser {
  /**
   * Parse XML response into structured data
   */
  async parseSearchResponse(xmlData: string): Promise<NTISParsedResponse> {
    try {
      const result = await parseStringPromise(xmlData, {
        explicitArray: false,
        mergeAttrs: true,
        trim: true,
      });

      const hits = result.RESULT?.RESULTSET?.HIT;
      
      if (!hits) {
        return {
          programs: [],
          totalHits: 0,
          searchTime: 0,
        };
      }

      // Convert to array if single result
      const hitArray = Array.isArray(hits) ? hits : [hits];
      
      const programs = hitArray.map((hit) => this.parseProgram(hit));

      return {
        programs,
        totalHits: parseInt(result.RESULT?.TOTALHITS || '0'),
        searchTime: parseFloat(result.RESULT?.SEARCHTIME || '0'),
      };
    } catch (error: any) {
      console.error('XML parsing error:', error);
      return {
        programs: [],
        totalHits: 0,
        searchTime: 0,
      };
    }
  }

  /**
   * Parse individual program data from HIT element
   */
  private parseProgram(hit: any): NTISProgram {
    return {
      // Basic info
      projectNumber: this.extractText(hit.ProjectNumber),
      titleKorean: this.extractText(hit.ProjectTitle?.Korean),
      titleEnglish: this.extractText(hit.ProjectTitle?.English),
      
      // Manager and researchers
      manager: this.extractText(hit.Manager?.n),
      researchers: this.extractResearchers(hit.Researchers),
      
      // Goals and abstract
      goal: this.extractText(hit.Goal?.Full),
      abstract: this.extractText(hit.Abstract?.Full),
      effect: this.extractText(hit.Effect?.Full),
      
      // Keywords
      keywordsKorean: this.extractKeywords(hit.Keyword?.Korean),
      keywordsEnglish: this.extractKeywords(hit.Keyword?.English),
      
      // Organizations
      orderAgency: this.extractText(hit.OrderAgency?.n),
      researchAgency: this.extractText(hit.ResearchAgency?.n),
      manageAgency: this.extractText(hit.ManageAgency?.Name),
      ministry: this.extractText(hit.Ministry?.n),
      
      // Budget
      governmentFunds: this.parseNumber(hit.GovernmentFunds),
      sbusinessFunds: this.parseNumber(hit.SbusinessFunds),
      totalFunds: this.parseNumber(hit.TotalFunds),
      
      // Project details
      budgetProject: this.extractText(hit.BudgetProject?.n),
      businessName: this.extractText(hit.BusinessName),
      bigprojectTitle: this.extractText(hit.BigprojectTitle),
      
      // Dates
      projectYear: this.parseNumber(hit.ProjectYear),
      startDate: this.extractText(hit.ProjectPeriod?.TotalStart),
      endDate: this.extractText(hit.ProjectPeriod?.TotalEnd),
      
      // Classification
      scienceClass: this.extractScienceClass(hit.ScienceClass),
      sixTechnology: this.extractText(hit.SixTechnology),
      performAgent: this.extractText(hit.PerformAgent),
      developmentPhases: this.extractText(hit.DevelopmentPhases),
      
      // Other
      region: this.extractText(hit.Region),
      continuousFlag: this.extractText(hit.ContinuousFlag),
      policyProjectFlag: this.extractText(hit.PolicyProjectFlag),
      
      // Metadata
      scrapedAt: new Date(),
      source: 'NTIS_API',
    };
  }

  /**
   * Extract text from element
   */
  private extractText(element: any): string | null {
    if (!element) return null;
    if (typeof element === 'string') return element.trim();
    if (typeof element === 'object' && element._) return element._.trim();
    return null;
  }

  /**
   * Extract researchers list
   */
  private extractResearchers(researchersObj: any): string[] {
    if (!researchersObj?.n) return [];
    
    const names = this.extractText(researchersObj.n);
    if (!names) return [];
    
    return names.split(';').map(name => name.trim()).filter(Boolean);
  }

  /**
   * Extract keywords
   */
  private extractKeywords(keywordsStr: string | null): string[] {
    if (!keywordsStr) return [];
    return keywordsStr.split(',').map(kw => kw.trim()).filter(Boolean);
  }

  /**
   * Parse number safely
   */
  private parseNumber(value: any): number | null {
    if (!value) return null;
    const num = typeof value === 'string' ? parseInt(value) : value;
    return isNaN(num) ? null : num;
  }

  /**
   * Extract science classification
   */
  private extractScienceClass(scienceClassArray: any): any[] {
    if (!scienceClassArray) return [];
    
    const classes = Array.isArray(scienceClassArray) ? scienceClassArray : [scienceClassArray];
    
    return classes
      .filter(cls => cls.type === 'new')
      .map(cls => ({
        large: this.extractText(cls.Large),
        largeCode: cls.Large?.code,
        medium: this.extractText(cls.Medium),
        mediumCode: cls.Medium?.code,
        small: this.extractText(cls.Small),
        smallCode: cls.Small?.code,
      }));
  }
}
