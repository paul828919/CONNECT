/**
 * Excluded Domain Suggestions API
 *
 * Analyzes user feedback events (HIDE, DISMISS, NOT_ELIGIBLE) to suggest
 * domains the user might want to exclude from their matches.
 *
 * Algorithm:
 * - HIDE/DISMISS events: Threshold ≥2 DISTINCT programs per domain
 * - NOT_ELIGIBLE events: Threshold ≥5 DISTINCT programs per domain
 * - Uses keyword classification (not program.category) for accurate domain detection
 * - Filters out domains already in user's excludedDomains list
 *
 * @module app/api/organizations/[id]/excluded-domain-suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import { classifyProgram, INDUSTRY_KOREAN_LABELS, type IndustryCategory } from '@/lib/matching/keyword-classifier';

// Thresholds for suggesting domain exclusion
const HIDE_DISMISS_THRESHOLD = 2; // ≥2 distinct programs
const NOT_ELIGIBLE_THRESHOLD = 5; // ≥5 distinct programs (weaker signal)

interface DomainSuggestion {
  domain: IndustryCategory;
  label: string;
  reason: 'HIDE_DISMISS' | 'NOT_ELIGIBLE';
  programCount: number;
  sampleTitles: string[]; // Show up to 3 sample program titles
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizationId = params.id;
    const userId = (session.user as any).id;

    // Verify user belongs to this organization
    const organization = await db.organizations.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        excludedDomains: true,
        users: {
          select: { id: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: '조직을 찾을 수 없습니다' }, { status: 404 });
    }

    const userBelongsToOrg = organization.users.some((u) => u.id === userId);
    if (!userBelongsToOrg) {
      return NextResponse.json({ error: '이 조직에 접근할 권한이 없습니다' }, { status: 403 });
    }

    // Get existing excluded domains (to filter from suggestions)
    const existingExcludedDomains = new Set(organization.excludedDomains || []);

    // 30-day learning window
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 30);

    // Fetch HIDE and DISMISS events
    const hideEvents = await db.recommendation_events.findMany({
      where: {
        organizationId,
        eventType: { in: ['HIDE', 'DISMISS'] },
        occurredAt: { gte: windowStart },
      },
      select: { programId: true },
    });

    // Fetch NOT_ELIGIBLE events
    const notEligibleEvents = await db.recommendation_events.findMany({
      where: {
        organizationId,
        eventType: 'NOT_ELIGIBLE',
        occurredAt: { gte: windowStart },
      },
      select: { programId: true },
    });

    // Get distinct program IDs
    const hideProgramIds = [...new Set(hideEvents.map((e) => e.programId))];
    const notEligibleProgramIds = [...new Set(notEligibleEvents.map((e) => e.programId))];

    const allProgramIds = [...new Set([...hideProgramIds, ...notEligibleProgramIds])];

    if (allProgramIds.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Fetch program details for classification
    const programs = await db.funding_programs.findMany({
      where: { id: { in: allProgramIds } },
      select: {
        id: true,
        title: true,
        ministry: true,
      },
    });

    const programMap = new Map(programs.map((p) => [p.id, p]));

    // Classify programs and count by domain
    const hideDomainCounts = new Map<string, { count: number; titles: string[] }>();
    const notEligibleDomainCounts = new Map<string, { count: number; titles: string[] }>();

    for (const programId of hideProgramIds) {
      const program = programMap.get(programId);
      if (!program) continue;

      const classification = classifyProgram(program.title, null, program.ministry);
      if (classification.industry === 'GENERAL') continue; // Skip GENERAL

      const domain = classification.industry;
      if (!hideDomainCounts.has(domain)) {
        hideDomainCounts.set(domain, { count: 0, titles: [] });
      }
      const entry = hideDomainCounts.get(domain)!;
      entry.count++;
      if (entry.titles.length < 3) {
        entry.titles.push(program.title);
      }
    }

    for (const programId of notEligibleProgramIds) {
      const program = programMap.get(programId);
      if (!program) continue;

      const classification = classifyProgram(program.title, null, program.ministry);
      if (classification.industry === 'GENERAL') continue;

      const domain = classification.industry;
      if (!notEligibleDomainCounts.has(domain)) {
        notEligibleDomainCounts.set(domain, { count: 0, titles: [] });
      }
      const entry = notEligibleDomainCounts.get(domain)!;
      entry.count++;
      if (entry.titles.length < 3) {
        entry.titles.push(program.title);
      }
    }

    // Build suggestions
    const suggestions: DomainSuggestion[] = [];

    // Add HIDE/DISMISS suggestions (higher priority)
    for (const [domain, data] of hideDomainCounts) {
      if (data.count >= HIDE_DISMISS_THRESHOLD && !existingExcludedDomains.has(domain)) {
        suggestions.push({
          domain: domain as IndustryCategory,
          label: INDUSTRY_KOREAN_LABELS[domain as IndustryCategory] || domain,
          reason: 'HIDE_DISMISS',
          programCount: data.count,
          sampleTitles: data.titles,
        });
      }
    }

    // Add NOT_ELIGIBLE suggestions (only if not already suggested from HIDE/DISMISS)
    const suggestedDomains = new Set(suggestions.map((s) => s.domain));
    for (const [domain, data] of notEligibleDomainCounts) {
      if (
        data.count >= NOT_ELIGIBLE_THRESHOLD &&
        !existingExcludedDomains.has(domain) &&
        !suggestedDomains.has(domain as IndustryCategory)
      ) {
        suggestions.push({
          domain: domain as IndustryCategory,
          label: INDUSTRY_KOREAN_LABELS[domain as IndustryCategory] || domain,
          reason: 'NOT_ELIGIBLE',
          programCount: data.count,
          sampleTitles: data.titles,
        });
      }
    }

    // Sort by program count (descending)
    suggestions.sort((a, b) => b.programCount - a.programCount);

    return NextResponse.json({
      suggestions,
      meta: {
        windowDays: 30,
        hideDismissThreshold: HIDE_DISMISS_THRESHOLD,
        notEligibleThreshold: NOT_ELIGIBLE_THRESHOLD,
      },
    });
  } catch (error) {
    console.error('Error fetching excluded domain suggestions:', error);
    return NextResponse.json(
      { error: '제외 분야 제안을 불러오는 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}
