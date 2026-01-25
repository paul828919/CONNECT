/**
 * Program Search API Endpoint
 *
 * GET /api/programs/search?q=바이오&status=ACTIVE&limit=20
 *
 * Provides Korean partial text search for funding programs using pg_trgm.
 * Falls back to simple ILIKE search if pg_trgm is not available.
 *
 * @module app/api/programs/search/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { ProgramStatus } from '@prisma/client';
import {
  searchPrograms,
  searchProgramsSimple,
  isPgTrgmAvailable,
  getSearchSuggestions,
  type SearchFilters,
  type SearchOptions,
  type SearchResponse,
} from '@/lib/search/program-search';

// ============================================================================
// Types
// ============================================================================

interface APIResponse {
  success: boolean;
  data?: SearchResponse;
  suggestions?: string[];
  error?: string;
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse<APIResponse>> {
  const searchParams = request.nextUrl.searchParams;

  // Parse query parameter (required)
  const query = searchParams.get('q') || searchParams.get('query') || '';

  // Check if this is a suggestions request
  const isSuggestions = searchParams.get('suggestions') === 'true';

  if (isSuggestions) {
    return handleSuggestions(query);
  }

  // Validate query
  if (!query || query.trim().length < 2) {
    return NextResponse.json({
      success: false,
      error: 'Query must be at least 2 characters',
    }, { status: 400 });
  }

  // Parse filters
  const filters: SearchFilters = {};

  const status = searchParams.get('status');
  if (status && isValidStatus(status)) {
    filters.status = status as ProgramStatus;
  }

  const category = searchParams.get('category');
  if (category) {
    filters.category = category;
  }

  const ministry = searchParams.get('ministry');
  if (ministry) {
    filters.ministry = ministry;
  }

  const deadlineFrom = searchParams.get('deadlineFrom');
  if (deadlineFrom) {
    const date = new Date(deadlineFrom);
    if (!isNaN(date.getTime())) {
      filters.deadlineFrom = date;
    }
  }

  const deadlineTo = searchParams.get('deadlineTo');
  if (deadlineTo) {
    const date = new Date(deadlineTo);
    if (!isNaN(date.getTime())) {
      filters.deadlineTo = date;
    }
  }

  // Parse options
  const options: SearchOptions = {};

  const limit = searchParams.get('limit');
  if (limit) {
    const limitNum = parseInt(limit, 10);
    if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100) {
      options.limit = limitNum;
    }
  }

  const offset = searchParams.get('offset');
  if (offset) {
    const offsetNum = parseInt(offset, 10);
    if (!isNaN(offsetNum) && offsetNum >= 0) {
      options.offset = offsetNum;
    }
  }

  const page = searchParams.get('page');
  if (page && !offset) {
    const pageNum = parseInt(page, 10);
    if (!isNaN(pageNum) && pageNum > 0) {
      options.offset = (pageNum - 1) * (options.limit || 20);
    }
  }

  try {
    // Check if pg_trgm is available
    const useTrgm = await isPgTrgmAvailable();

    // Execute search
    const response = useTrgm
      ? await searchPrograms(query, filters, options)
      : await searchProgramsSimple(query, filters, options);

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('[API/programs/search] Error:', error);

    return NextResponse.json({
      success: false,
      error: 'Search failed. Please try again.',
    }, { status: 500 });
  }
}

// ============================================================================
// Suggestions Handler
// ============================================================================

async function handleSuggestions(query: string): Promise<NextResponse<APIResponse>> {
  if (!query || query.trim().length < 2) {
    return NextResponse.json({
      success: true,
      suggestions: [],
    });
  }

  try {
    const suggestions = await getSearchSuggestions(query, 5);

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error('[API/programs/search] Suggestions error:', error);

    return NextResponse.json({
      success: true,
      suggestions: [],
    });
  }
}

// ============================================================================
// Validation Helpers
// ============================================================================

function isValidStatus(status: string): boolean {
  const validStatuses: ProgramStatus[] = ['ACTIVE', 'ARCHIVED', 'EXPIRED'];
  return validStatuses.includes(status as ProgramStatus);
}
