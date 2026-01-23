/**
 * Admin Program Enrichment API - Individual Program
 *
 * GET: Fetch single program details for enrichment form
 * POST: Save enriched program data
 *
 * Supports two data sources via `source` query parameter:
 * - NTIS: R&D research programs from funding_programs table
 * - SME24: SME support programs from sme_programs table
 *
 * Access Control: ADMIN or SUPER_ADMIN only
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth.config';
import { db } from '@/lib/db';
import {
  parseKoreanDate,
  parseBudgetAmount,
  parseOrganizationTypes,
  parseArrayField,
} from '@/lib/admin/field-mapper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'NTIS';

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (source === 'SME24') {
      return await handleSME24Get(id);
    } else {
      return await handleNTISGet(id);
    }
  } catch (error: any) {
    console.error('Error fetching program:', error);
    return NextResponse.json(
      { error: 'Failed to fetch program', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle GET for NTIS (R&D) programs from funding_programs table
 */
async function handleNTISGet(id: string) {
  // Fetch program details
  const program = await db.funding_programs.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      agencyId: true,
      announcementUrl: true,
      attachmentUrls: true,
      eligibilityConfidence: true,
      deadline: true,
      applicationStart: true,
      budgetAmount: true,
      fundingPeriod: true,
      keywords: true,
      targetType: true,
      requiredCertifications: true,
      preferredCertifications: true,
      eligibilityCriteria: true,
      requiresResearchInstitute: true,
      primaryTargetIndustry: true,
      technologyDomainsSpecific: true,
      description: true,
    },
  });

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  // Find next program in queue for "Save & Next" functionality
  const nextProgram = await db.funding_programs.findFirst({
    where: {
      status: 'ACTIVE',
      eligibilityConfidence: { in: ['LOW', 'MEDIUM'] },
      id: { not: id },
      OR: [
        { deadline: { gte: new Date() } },
        { deadline: null },
      ],
    },
    orderBy: [
      { deadline: { sort: 'asc', nulls: 'last' } },
      { eligibilityConfidence: 'asc' },
    ],
    select: { id: true },
  });

  return NextResponse.json({
    program: {
      ...program,
      deadline: program.deadline?.toISOString() || null,
      applicationStart: program.applicationStart?.toISOString() || null,
      budgetAmount: program.budgetAmount ? Number(program.budgetAmount) : null,
      source: 'NTIS',
    },
    nextProgramId: nextProgram?.id || null,
    source: 'NTIS',
  });
}

/**
 * Handle GET for SME24 programs from sme_programs table
 */
async function handleSME24Get(id: string) {
  // Fetch program details
  const program = await db.sme_programs.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      supportInstitution: true,
      detailUrl: true,
      attachmentUrls: true,
      eligibilityConfidence: true,
      applicationEnd: true,
      applicationStart: true,
      maxSupportAmount: true,
      minSupportAmount: true,
      supportContents: true,
      supportTarget: true,
      supportScale: true,
      applicationMethod: true,
      contactInfo: true,
      description: true,
      bizType: true,
      sportType: true,
      targetCompanyScale: true,
      requiredCerts: true,
      targetRegions: true,
      targetSalesRange: true,
      targetEmployeeRange: true,
      targetBusinessAge: true,
      manualReviewNotes: true,
    },
  });

  if (!program) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  // Find next SME program in queue for "Save & Next" functionality
  const nextProgram = await db.sme_programs.findFirst({
    where: {
      status: 'ACTIVE',
      eligibilityConfidence: { in: ['LOW', 'MEDIUM'] },
      id: { not: id },
      OR: [
        { applicationEnd: { gte: new Date() } },
        { applicationEnd: null },
      ],
    },
    orderBy: [
      { applicationEnd: { sort: 'asc', nulls: 'last' } },
      { eligibilityConfidence: 'asc' },
    ],
    select: { id: true },
  });

  // Map SME fields to a unified format for the form
  return NextResponse.json({
    program: {
      id: program.id,
      title: program.title,
      agencyId: program.supportInstitution || 'SME24',
      announcementUrl: program.detailUrl || '',
      attachmentUrls: program.attachmentUrls || [],
      eligibilityConfidence: program.eligibilityConfidence,
      deadline: program.applicationEnd?.toISOString() || null,
      applicationStart: program.applicationStart?.toISOString() || null,
      budgetAmount: program.maxSupportAmount ? Number(program.maxSupportAmount) : null,
      fundingPeriod: null,
      keywords: [],
      targetType: program.targetCompanyScale || [],
      requiredCertifications: program.requiredCerts || [],
      preferredCertifications: [],
      eligibilityCriteria: {
        supportContents: program.supportContents,
        supportTarget: program.supportTarget,
        supportScale: program.supportScale,
        applicationMethod: program.applicationMethod,
        contactInfo: program.contactInfo,
        bizType: program.bizType,
        sportType: program.sportType,
        targetRegions: program.targetRegions,
        targetSalesRange: program.targetSalesRange,
        targetEmployeeRange: program.targetEmployeeRange,
        targetBusinessAge: program.targetBusinessAge,
        manualReviewNotes: program.manualReviewNotes,
      },
      requiresResearchInstitute: false,
      primaryTargetIndustry: program.bizType || null,
      technologyDomainsSpecific: [],
      description: program.description,
      source: 'SME24',
    },
    nextProgramId: nextProgram?.id || null,
    source: 'SME24',
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') || 'NTIS';

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { formData, markdownInput } = body;

    if (!formData) {
      return NextResponse.json({ error: 'Form data is required' }, { status: 400 });
    }

    if (source === 'SME24') {
      return await handleSME24Post(id, formData, markdownInput, session);
    } else {
      return await handleNTISPost(id, formData, markdownInput, session);
    }
  } catch (error: any) {
    console.error('Error saving enrichment:', error);
    return NextResponse.json(
      { error: 'Failed to save enrichment', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle POST for NTIS (R&D) programs - save to funding_programs table
 */
async function handleNTISPost(
  id: string,
  formData: any,
  markdownInput: string | undefined,
  session: any
) {
  // Verify program exists
  const existingProgram = await db.funding_programs.findUnique({
    where: { id },
    select: { id: true, eligibilityCriteria: true },
  });

  if (!existingProgram) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  // Build update payload directly from form data
  const updatePayload: Record<string, any> = {
    eligibilityConfidence: 'HIGH',
    eligibilityLastUpdated: new Date(),
    manualReviewCompletedAt: new Date(),
    manualReviewCompletedBy: session.user.id || session.user.email,
  };

  // Section A: 신청/운영 메타
  if (formData.applicationStart) {
    updatePayload.applicationStart = parseKoreanDate(formData.applicationStart);
  }
  if (formData.deadline) {
    updatePayload.deadline = parseKoreanDate(formData.deadline);
  }

  // Section B: 돈/기간
  if (formData.budgetTotal) {
    updatePayload.budgetAmount = parseBudgetAmount(formData.budgetTotal);
  } else if (formData.budgetPerProject) {
    updatePayload.budgetAmount = parseBudgetAmount(formData.budgetPerProject);
  }
  if (formData.fundingPeriod) {
    updatePayload.fundingPeriod = formData.fundingPeriod;
  }

  // Section C: 지원대상/자격요건
  if (formData.applicantOrgTypes) {
    updatePayload.targetType = parseOrganizationTypes(formData.applicantOrgTypes);
  }
  if (formData.consortiumRequired !== undefined) {
    updatePayload.requiresResearchInstitute = formData.consortiumRequired;
  }
  if (formData.requiredCertifications) {
    const certs = parseArrayField(formData.requiredCertifications);
    if (formData.requiredRegistrations) {
      certs.push(...parseArrayField(formData.requiredRegistrations));
    }
    updatePayload.requiredCertifications = [...new Set(certs)];
  }

  // Section D: 분야/주제
  if (formData.techKeywords) {
    updatePayload.keywords = parseArrayField(formData.techKeywords);
  }
  if (formData.domainTags) {
    const tags = parseArrayField(formData.domainTags);
    updatePayload.technologyDomainsSpecific = tags;
    if (tags.length > 0) {
      updatePayload.primaryTargetIndustry = tags[0];
    }
  }

  // Store additional data in eligibilityCriteria JSON field
  const existingCriteria = (existingProgram.eligibilityCriteria as Record<string, any>) || {};
  const newCriteria: Record<string, any> = { ...existingCriteria };

  if (formData.deadlineTimeRule) {
    newCriteria.deadlineTimeRule = formData.deadlineTimeRule;
  }
  if (formData.submissionSystem) {
    newCriteria.submissionSystem = formData.submissionSystem;
  }
  if (formData.contactInfo) {
    newCriteria.contactInfo = formData.contactInfo;
  }
  if (formData.budgetPerProject) {
    newCriteria.budgetPerProject = formData.budgetPerProject;
  }
  if (formData.fundingRate) {
    newCriteria.fundingRate = formData.fundingRate;
  }
  if (formData.numAwards) {
    newCriteria.numAwards = formData.numAwards;
  }
  if (formData.leadRoleAllowed) {
    newCriteria.leadRoleAllowed = parseArrayField(formData.leadRoleAllowed);
  }
  if (formData.coRoleAllowed) {
    newCriteria.coRoleAllowed = parseArrayField(formData.coRoleAllowed);
  }
  if (formData.exclusionRules) {
    newCriteria.exclusionRules = parseArrayField(formData.exclusionRules);
  }

  // Store raw markdown input for reference
  if (markdownInput) {
    newCriteria.rawEnrichmentMarkdown = markdownInput;
    newCriteria.enrichmentSource = 'CLAUDE_WEB';
  }

  updatePayload.eligibilityCriteria = newCriteria;

  // Update program
  const updatedProgram = await db.funding_programs.update({
    where: { id },
    data: updatePayload,
    select: {
      id: true,
      title: true,
      eligibilityConfidence: true,
    },
  });

  return NextResponse.json({
    success: true,
    program: updatedProgram,
    message: `프로그램 "${updatedProgram.title}"이(가) 성공적으로 보강되었습니다.`,
    source: 'NTIS',
  });
}

/**
 * Handle POST for SME24 programs - save to sme_programs table
 */
async function handleSME24Post(
  id: string,
  formData: any,
  markdownInput: string | undefined,
  session: any
) {
  // Verify program exists
  const existingProgram = await db.sme_programs.findUnique({
    where: { id },
    select: { id: true, manualReviewNotes: true },
  });

  if (!existingProgram) {
    return NextResponse.json({ error: 'Program not found' }, { status: 404 });
  }

  // Build update payload for SME programs
  const updatePayload: Record<string, any> = {
    eligibilityConfidence: 'HIGH',
    eligibilityLastUpdated: new Date(),
    manualReviewCompletedAt: new Date(),
    manualReviewCompletedBy: session.user.id || session.user.email,
  };

  // Section A: 신청/운영 메타
  if (formData.applicationStart) {
    updatePayload.applicationStart = parseKoreanDate(formData.applicationStart);
  }
  if (formData.deadline) {
    updatePayload.applicationEnd = parseKoreanDate(formData.deadline);
  }

  // Section B: 돈/기간 - SME programs use different budget fields
  if (formData.budgetTotal || formData.budgetPerProject) {
    const amount = parseBudgetAmount(formData.budgetTotal || formData.budgetPerProject);
    if (amount) {
      updatePayload.maxSupportAmount = amount;
    }
  }

  // Section C: 지원대상/자격요건 - Map to SME-specific fields
  if (formData.applicantOrgTypes) {
    updatePayload.targetCompanyScale = parseArrayField(formData.applicantOrgTypes);
  }
  if (formData.requiredCertifications) {
    updatePayload.requiredCerts = parseArrayField(formData.requiredCertifications);
  }

  // Store notes and raw markdown
  const notes: string[] = [];
  if (existingProgram.manualReviewNotes) {
    notes.push(existingProgram.manualReviewNotes);
  }
  if (formData.contactInfo) {
    notes.push(`문의처: ${formData.contactInfo}`);
  }
  if (formData.exclusionRules) {
    notes.push(`제외조건: ${formData.exclusionRules}`);
  }
  if (formData.techKeywords) {
    notes.push(`키워드: ${formData.techKeywords}`);
  }
  if (formData.domainTags) {
    notes.push(`분야태그: ${formData.domainTags}`);
  }
  if (markdownInput) {
    notes.push(`\n--- Raw Enrichment Markdown ---\n${markdownInput}`);
  }

  if (notes.length > 0) {
    updatePayload.manualReviewNotes = notes.join('\n');
  }

  // Update program
  const updatedProgram = await db.sme_programs.update({
    where: { id },
    data: updatePayload,
    select: {
      id: true,
      title: true,
      eligibilityConfidence: true,
    },
  });

  return NextResponse.json({
    success: true,
    program: updatedProgram,
    message: `프로그램 "${updatedProgram.title}"이(가) 성공적으로 보강되었습니다.`,
    source: 'SME24',
  });
}
