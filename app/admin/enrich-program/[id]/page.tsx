'use client';

/**
 * Admin Program Enrichment Form
 *
 * Purpose: Input Claude Web extraction results to enrich program data
 *
 * Access Control: ADMIN or SUPER_ADMIN only
 *
 * Features:
 * 1. Markdown textarea for pasting Claude Web output
 * 2. Auto-parsing into structured fields
 * 3. Section-based form layout (A, B, C, D)
 * 4. Multi-track support for programs with sub-programs
 * 5. Save & Next for efficient workflow
 */

import { useSession } from 'next-auth/react';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  parseClaudeMarkdown,
  flattenParsedResult,
  validateRequiredFields,
  type ParsedResult,
} from '@/lib/admin/markdown-parser';

interface ProgramDetail {
  id: string;
  title: string;
  agencyId: string;
  announcementUrl: string;
  attachmentUrls: string[];
  eligibilityConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  deadline: string | null;
  applicationStart: string | null;
  budgetAmount: number | null;
  fundingPeriod: string | null;
  keywords: string[];
  targetType: string[];
  requiredCertifications: string[];
  eligibilityCriteria: any;
}

interface FormData {
  // Section A
  applicationStart: string;
  deadline: string;
  deadlineTimeRule: string;
  submissionSystem: string;
  contactInfo: string;

  // Section B
  budgetTotal: string;
  budgetPerProject: string;
  fundingRate: string;
  fundingPeriod: string;
  numAwards: string;

  // Section C
  applicantOrgTypes: string;
  leadRoleAllowed: string;
  coRoleAllowed: string;
  consortiumRequired: boolean;
  requiredRegistrations: string;
  requiredCertifications: string;
  exclusionRules: string;

  // Section D
  techKeywords: string;
  domainTags: string;
  programType: string;
}

const defaultFormData: FormData = {
  applicationStart: '',
  deadline: '',
  deadlineTimeRule: '',
  submissionSystem: '',
  contactInfo: '',
  budgetTotal: '',
  budgetPerProject: '',
  fundingRate: '',
  fundingPeriod: '',
  numAwards: '',
  applicantOrgTypes: '',
  leadRoleAllowed: '',
  coRoleAllowed: '',
  consortiumRequired: false,
  requiredRegistrations: '',
  requiredCertifications: '',
  exclusionRules: '',
  techKeywords: '',
  domainTags: '',
  programType: 'R_D_PROJECT',
};

export default function EnrichmentFormPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const programId = params.id as string;
  const source = searchParams.get('source') || 'NTIS'; // Read source from URL

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [markdownInput, setMarkdownInput] = useState('');
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Navigation state
  const [nextProgramId, setNextProgramId] = useState<string | null>(null);

  // Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // Auth check
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    if (session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Fetch program details
  const fetchProgram = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/enrich-program/${programId}?source=${source}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch program');
      }

      setProgram(data.program);
      setNextProgramId(data.nextProgramId || null);

      // Pre-fill form with existing data
      if (data.program) {
        prefillFormData(data.program);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [programId, source]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchProgram();
  }, [status, fetchProgram]);

  // Pre-fill form with existing program data
  const prefillFormData = (prog: ProgramDetail) => {
    setFormData({
      ...defaultFormData,
      applicationStart: prog.applicationStart || '',
      deadline: prog.deadline || '',
      budgetTotal: prog.budgetAmount ? String(prog.budgetAmount) : '',
      fundingPeriod: prog.fundingPeriod || '',
      applicantOrgTypes: prog.targetType?.join(', ') || '',
      requiredCertifications: prog.requiredCertifications?.join(', ') || '',
      techKeywords: prog.keywords?.join(', ') || '',
    });
  };

  // Parse markdown input
  const handleParseMarkdown = () => {
    if (!markdownInput.trim()) {
      setValidationErrors(['마크다운 입력이 비어있습니다']);
      return;
    }

    const result = parseClaudeMarkdown(markdownInput);
    setParsedResult(result);

    // Map parsed data to form fields
    const flatData = flattenParsedResult(result);
    mapParsedToForm(flatData);

    // Validate
    const errors = validateRequiredFields(result);
    setValidationErrors([...result.parseWarnings, ...errors]);
  };

  // Map parsed data to form fields
  const mapParsedToForm = (flatData: Record<string, string | null>) => {
    setFormData((prev) => ({
      ...prev,
      applicationStart: flatData.application_open_at || prev.applicationStart,
      deadline: flatData.application_close_at || prev.deadline,
      deadlineTimeRule: flatData.deadline_time_rule || prev.deadlineTimeRule,
      submissionSystem: flatData.submission_system || prev.submissionSystem,
      contactInfo: flatData.contact || prev.contactInfo,
      budgetTotal: flatData.budget_total || prev.budgetTotal,
      budgetPerProject: flatData.budget_per_project || prev.budgetPerProject,
      fundingRate: flatData.funding_rate || prev.fundingRate,
      fundingPeriod: flatData.project_duration || prev.fundingPeriod,
      numAwards: flatData.num_awards || prev.numAwards,
      applicantOrgTypes: flatData.applicant_org_types || prev.applicantOrgTypes,
      leadRoleAllowed: flatData.lead_role_allowed || prev.leadRoleAllowed,
      coRoleAllowed: flatData.co_role_allowed || prev.coRoleAllowed,
      consortiumRequired: flatData.consortium_required?.toLowerCase().includes('필수') || prev.consortiumRequired,
      requiredRegistrations: flatData.required_registrations || prev.requiredRegistrations,
      requiredCertifications: flatData.required_certifications || prev.requiredCertifications,
      exclusionRules: flatData.exclusion_rules || prev.exclusionRules,
      techKeywords: flatData.tech_keywords || prev.techKeywords,
      domainTags: flatData.domain_tags || prev.domainTags,
      programType: flatData.program_type || prev.programType,
    }));
  };

  // Handle form field change
  const handleFieldChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Save enrichment data
  const handleSave = async (goToNext: boolean = false) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/enrich-program/${programId}?source=${source}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData,
          markdownInput,
          parsedSections: parsedResult?.sections || [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save enrichment');
      }

      if (goToNext && nextProgramId) {
        // Preserve source when navigating to next program
        router.push(`/admin/enrich-program/${nextProgramId}?source=${source}`);
      } else if (goToNext) {
        router.push('/admin/enrich-program');
      } else {
        // Show success and refresh
        fetchProgram();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Keyboard shortcut for save & next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, nextProgramId]);

  // Drag-and-drop handlers for markdown files
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];

    // Check if file is a markdown or text file
    const validTypes = ['text/markdown', 'text/plain', 'text/x-markdown', ''];
    const validExtensions = ['.md', '.markdown', '.txt'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      setValidationErrors(['마크다운 파일(.md, .markdown) 또는 텍스트 파일(.txt)만 지원합니다.']);
      return;
    }

    try {
      const text = await file.text();
      setMarkdownInput(text);
      setValidationErrors([]);
    } catch (err) {
      setValidationErrors(['파일을 읽는 중 오류가 발생했습니다.']);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error && !program) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-bold mb-2">오류</h2>
          <p className="text-red-700">{error}</p>
          <Link
            href="/admin/enrich-program"
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/admin/enrich-program"
                className="text-blue-600 hover:text-blue-800"
              >
                ← 목록
              </Link>
              {/* Source badge */}
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  source === 'SME24'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {source === 'SME24' ? 'SME24' : 'NTIS'}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  program?.eligibilityConfidence === 'LOW'
                    ? 'bg-red-100 text-red-800'
                    : program?.eligibilityConfidence === 'MEDIUM'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {program?.eligibilityConfidence === 'LOW'
                  ? '낮음'
                  : program?.eligibilityConfidence === 'MEDIUM'
                  ? '보통'
                  : '높음'}
              </span>
              <span className="text-xs text-gray-500">{program?.agencyId}</span>
            </div>
            <h1 className="text-2xl font-bold">{program?.title}</h1>
          </div>
          <div className="flex gap-2">
            <a
              href={program?.announcementUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              원본 공고 ↗
            </a>
          </div>
        </div>

        {/* Attachments */}
        {program?.attachmentUrls && program.attachmentUrls.length > 0 && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">📎 첨부파일</h3>
            <div className="flex flex-wrap gap-2">
              {program.attachmentUrls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-blue-600 hover:bg-blue-50"
                >
                  첨부파일 {idx + 1}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Markdown Input Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-4">Claude 추출 결과 붙여넣기</h2>
          <p className="text-sm text-gray-600 mb-4">
            Claude에서 추출한 마크다운 파일 또는 테이블을 아래에 붙여넣거나 파일을 드래그하세요.
            <br />
            <span className="text-gray-500">
              테이블 형식, 키-값 형식 (예: <code className="bg-gray-100 px-1 rounded">- **application_open_at**: 2026-02-09</code>),
              또는 일반 마크다운 형식을 지원합니다.
            </span>
          </p>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative transition-all duration-200 ${
              isDragOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''
            }`}
          >
            {isDragOver && (
              <div className="absolute inset-0 bg-blue-50 bg-opacity-90 rounded-lg flex items-center justify-center z-10 pointer-events-none">
                <div className="text-center">
                  <svg
                    className="w-12 h-12 text-blue-500 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-blue-600 font-medium">마크다운 파일을 여기에 놓으세요</p>
                  <p className="text-blue-500 text-sm">.md, .markdown, .txt</p>
                </div>
              </div>
            )}
            <textarea
              value={markdownInput}
              onChange={(e) => setMarkdownInput(e.target.value)}
              className={`w-full h-48 p-4 border rounded-lg font-mono text-sm focus:border-blue-500 focus:ring-blue-500 ${
                isDragOver ? 'border-blue-500' : 'border-gray-300'
              }`}
              placeholder="# 프로그램 분석 결과

(A) 신청/운영 메타
| 필드 | 값 |
|------|-----|
| application_open_at | 2026-02-09 09:00 |
| application_close_at | 2026-02-25 18:00 |

또는

## (A) 신청/운영 메타
- **application_open_at**: 2026-02-09 09:00
- **application_close_at**: 2026-02-25 18:00

💡 마크다운 파일(.md)을 드래그 앤 드롭할 수도 있습니다."
            />
          </div>
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={handleParseMarkdown}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              마크다운 파싱
            </button>
            {parsedResult && (
              <span className="text-sm text-green-600">
                ✓ {parsedResult.sections.length}개 섹션 파싱됨
                {parsedResult.trackCount > 1 && ` (${parsedResult.trackCount}개 트랙)`}
              </span>
            )}
          </div>

          {/* Validation Warnings */}
          {validationErrors.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">⚠️ 주의사항</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Form Sections */}
        <div className="space-y-6">
          {/* Section A: 신청/운영 메타 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                A
              </span>
              신청/운영 메타
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  접수 시작일 (application_open_at)
                </label>
                <input
                  type="text"
                  value={formData.applicationStart}
                  onChange={(e) => handleFieldChange('applicationStart', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="2026-02-09 09:00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  접수 마감일 (application_close_at) *
                </label>
                <input
                  type="text"
                  value={formData.deadline}
                  onChange={(e) => handleFieldChange('deadline', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="2026-02-25 18:00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  마감 시간 규칙 (deadline_time_rule)
                </label>
                <input
                  type="text"
                  value={formData.deadlineTimeRule}
                  onChange={(e) => handleFieldChange('deadlineTimeRule', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="18:00 마감"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  신청 시스템 (submission_system)
                </label>
                <input
                  type="text"
                  value={formData.submissionSystem}
                  onChange={(e) => handleFieldChange('submissionSystem', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="IRIS (https://www.iris.go.kr)"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  문의처 (contact)
                </label>
                <input
                  type="text"
                  value={formData.contactInfo}
                  onChange={(e) => handleFieldChange('contactInfo', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="과학기술사업화진흥원 장비재료팀 02-xxxx-xxxx"
                />
              </div>
            </div>
          </div>

          {/* Section B: 돈/기간 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">
                B
              </span>
              돈/기간
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  총 예산 (budget_total)
                </label>
                <input
                  type="text"
                  value={formData.budgetTotal}
                  onChange={(e) => handleFieldChange('budgetTotal', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="52억원"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  과제당 예산 (budget_per_project) *
                </label>
                <input
                  type="text"
                  value={formData.budgetPerProject}
                  onChange={(e) => handleFieldChange('budgetPerProject', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="260백만원/년 × 2년"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  지원율 (funding_rate)
                </label>
                <input
                  type="text"
                  value={formData.fundingRate}
                  onChange={(e) => handleFieldChange('fundingRate', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="공공100%/중소75%/중견70%"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수행 기간 (project_duration)
                </label>
                <input
                  type="text"
                  value={formData.fundingPeriod}
                  onChange={(e) => handleFieldChange('fundingPeriod', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="21개월"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  선정 과제 수 (num_awards)
                </label>
                <input
                  type="text"
                  value={formData.numAwards}
                  onChange={(e) => handleFieldChange('numAwards', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="12개 과제"
                />
              </div>
            </div>
          </div>

          {/* Section C: 지원대상/자격요건 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-sm font-bold">
                C
              </span>
              지원대상/자격요건
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  신청 가능 기관 (applicant_org_types) *
                </label>
                <input
                  type="text"
                  value={formData.applicantOrgTypes}
                  onChange={(e) => handleFieldChange('applicantOrgTypes', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="기업, 대학, 연구기관, 공공기관"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  주관 가능 (lead_role_allowed)
                </label>
                <input
                  type="text"
                  value={formData.leadRoleAllowed}
                  onChange={(e) => handleFieldChange('leadRoleAllowed', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="공공연구기관"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  참여 가능 (co_role_allowed)
                </label>
                <input
                  type="text"
                  value={formData.coRoleAllowed}
                  onChange={(e) => handleFieldChange('coRoleAllowed', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="연구장비 기업"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="consortiumRequired"
                  checked={formData.consortiumRequired}
                  onChange={(e) => handleFieldChange('consortiumRequired', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="consortiumRequired" className="text-sm font-medium text-gray-700">
                  컨소시엄/공동연구 필수 (consortium_required)
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  필수 등록 (required_registrations)
                </label>
                <input
                  type="text"
                  value={formData.requiredRegistrations}
                  onChange={(e) => handleFieldChange('requiredRegistrations', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="전문연구사업자 신고, IRIS 회원가입"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  필수 인증 (required_certifications)
                </label>
                <input
                  type="text"
                  value={formData.requiredCertifications}
                  onChange={(e) => handleFieldChange('requiredCertifications', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="벤처기업, 이노비즈"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  제외 조건 (exclusion_rules)
                </label>
                <textarea
                  value={formData.exclusionRules}
                  onChange={(e) => handleFieldChange('exclusionRules', e.target.value)}
                  rows={2}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="3책5공 제도, 동일 컨소시엄 중복신청 불가"
                />
              </div>
            </div>
          </div>

          {/* Section D: 분야/주제 */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                D
              </span>
              분야/주제
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  기술 키워드 (tech_keywords)
                </label>
                <input
                  type="text"
                  value={formData.techKeywords}
                  onChange={(e) => handleFieldChange('techKeywords', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="연구장비, 혁신기술개발, 현미경, 분광분석"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  분야 태그 (domain_tags)
                </label>
                <input
                  type="text"
                  value={formData.domainTags}
                  onChange={(e) => handleFieldChange('domainTags', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="반도체·디스플레이, 이차전지, 첨단바이오"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  프로그램 유형 (program_type)
                </label>
                <select
                  value={formData.programType}
                  onChange={(e) => handleFieldChange('programType', e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="R_D_PROJECT">R&D 과제</option>
                  <option value="SURVEY">설문/조사</option>
                  <option value="EVENT">행사/설명회</option>
                  <option value="NOTICE">공지</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl</kbd> +{' '}
              <kbd className="px-2 py-1 bg-gray-100 rounded">Enter</kbd> = 저장 & 다음
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {saving ? '저장 중...' : nextProgramId ? '저장 & 다음 →' : '저장 & 목록'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
