/**
 * Manual NTIS API Scraping Endpoint
 *
 * Triggers NTIS API scraping to fetch and save R&D programs
 * No authentication required for initial testing (TODO: Add auth after testing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { NTISApiScraper } from '@/lib/ntis-api';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Triggering NTIS API scraping via API endpoint...');

    const scraper = new NTISApiScraper();

    // Parse request body for days parameter (default: 30)
    const body = await request.json().catch(() => ({}));
    const daysBack = body.daysBack || 30;

    // Scrape recent programs
    const result = await scraper.scrapeAllAgencies(daysBack);

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: 'NTIS API scraping completed',
          data: {
            totalFound: result.totalFound,
            programsNew: result.programsNew,
            programsUpdated: result.programsUpdated,
            daysBack,
          },
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'NTIS API scraping failed',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Fatal error during NTIS API scraping:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'NTIS API Scraping Endpoint',
      usage: 'POST /api/admin/scrape-ntis with optional { "daysBack": 30 }',
    },
    { status: 200 }
  );
}
