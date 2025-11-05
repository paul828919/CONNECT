'use client';

/**
 * Admin Eligibility Review Dashboard (Phase 5)
 *
 * Purpose: Manual review of ambiguous eligibility cases
 *
 * Access Control: ADMIN or SUPER_ADMIN only
 *
 * Features:
 * 1. List programs with manualReviewRequired=true
 * 2. Display eligibility criteria with confidence levels
 * 3. Review workflow: Approve / Reject / Request More Info
 * 4. Update eligibility confidence after review
 * 5. Track reviewer and timestamp
 *
 * Filters:
 * - By confidence level (LOW, MEDIUM, HIGH)
 * - By agency
 * - By review status (pending/completed)
 */

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface EligibilityProgram {
  id: string;
  title: string;
  agencyId: string;
  announcementUrl: string;
  eligibilityCriteria: any;
  eligibilityConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  manualReviewRequired: boolean;
  manualReviewNotes: string | null;
  manualReviewCompletedAt: string | null;
  manualReviewCompletedBy: string | null;
  requiredCertifications: string[] | null;
  preferredCertifications: string[] | null;
  minInvestmentAmount: number | null;
  requiredOperatingYears: number | null;
  maxOperatingYears: number | null;
  createdAt: string;
  scrapedAt: string;
}

export default function AdminEligibilityReviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [programs, setPrograms] = useState<EligibilityProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [confidenceFilter, setConfidenceFilter] = useState<string>('ALL');
  const [agencyFilter, setAgencyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'COMPLETED' | 'ALL'>('PENDING');

  // Selected program for detailed review
  const [selectedProgram, setSelectedProgram] = useState<EligibilityProgram | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [newConfidence, setNewConfidence] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Fetch programs requiring review
  useEffect(() => {
    if (status !== 'authenticated') return;
    fetchPrograms();
  }, [status, confidenceFilter, agencyFilter, statusFilter]);

  const fetchPrograms = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (confidenceFilter !== 'ALL') params.append('confidence', confidenceFilter);
      if (agencyFilter !== 'ALL') params.append('agency', agencyFilter);
      params.append('status', statusFilter);

      const response = await fetch(`/api/admin/eligibility-review?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch programs');
      }

      setPrograms(data.programs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO') => {
    if (!selectedProgram) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/eligibility-review/${selectedProgram.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewNotes,
          newConfidence: action === 'APPROVE' ? newConfidence : 'LOW',
          manualReviewRequired: action === 'REQUEST_INFO', // Keep flagged if requesting info
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      // Refresh list and close modal
      await fetchPrograms();
      setSelectedProgram(null);
      setReviewNotes('');
      setNewConfidence('MEDIUM');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-bold mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => fetchPrograms()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredPrograms = programs;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🔍 Eligibility Review Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manual review of programs with ambiguous eligibility criteria
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Admin: {session?.user?.name || session?.user?.email}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Confidence Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confidence Level
              </label>
              <select
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ALL">All Confidence Levels</option>
                <option value="LOW">Low Confidence</option>
                <option value="MEDIUM">Medium Confidence</option>
                <option value="HIGH">High Confidence</option>
              </select>
            </div>

            {/* Agency Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agency
              </label>
              <select
                value={agencyFilter}
                onChange={(e) => setAgencyFilter(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="ALL">All Agencies</option>
                <option value="NTIS">NTIS</option>
                <option value="IITP">IITP</option>
                <option value="KIAT">KIAT</option>
                <option value="KOTRA">KOTRA</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'PENDING' | 'COMPLETED' | 'ALL')}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="PENDING">Pending Review</option>
                <option value="COMPLETED">Completed</option>
                <option value="ALL">All</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Total Programs</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{programs.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-yellow-200 p-4">
            <div className="text-sm text-yellow-700">Pending Review</div>
            <div className="text-3xl font-bold text-yellow-600 mt-1">
              {programs.filter((p) => !p.manualReviewCompletedAt).length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-green-200 p-4">
            <div className="text-sm text-green-700">Completed</div>
            <div className="text-3xl font-bold text-green-600 mt-1">
              {programs.filter((p) => p.manualReviewCompletedAt).length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-red-200 p-4">
            <div className="text-sm text-red-700">Low Confidence</div>
            <div className="text-3xl font-bold text-red-600 mt-1">
              {programs.filter((p) => p.eligibilityConfidence === 'LOW').length}
            </div>
          </div>
        </div>

        {/* Program List */}
        <div className="mt-6 space-y-4">
          {filteredPrograms.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No programs requiring review</p>
            </div>
          ) : (
            filteredPrograms.map((program) => (
              <div
                key={program.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{program.title}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          program.eligibilityConfidence === 'HIGH'
                            ? 'bg-green-100 text-green-800'
                            : program.eligibilityConfidence === 'MEDIUM'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {program.eligibilityConfidence}
                      </span>
                      <span className="text-sm text-gray-500">{program.agencyId}</span>
                      {program.manualReviewCompletedAt && (
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                          ✓ Reviewed
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-700 space-y-1">
                      {program.requiredCertifications && program.requiredCertifications.length > 0 && (
                        <div>
                          <strong>Required Certs:</strong> {program.requiredCertifications.join(', ')}
                        </div>
                      )}
                      {program.preferredCertifications && program.preferredCertifications.length > 0 && (
                        <div>
                          <strong>Preferred Certs:</strong> {program.preferredCertifications.join(', ')}
                        </div>
                      )}
                      {program.minInvestmentAmount && (
                        <div>
                          <strong>Min Investment:</strong> ₩{program.minInvestmentAmount.toLocaleString()}
                        </div>
                      )}
                      {program.requiredOperatingYears && (
                        <div>
                          <strong>Operating Years:</strong> {program.requiredOperatingYears}
                          {program.maxOperatingYears ? ` - ${program.maxOperatingYears}` : '+'} years
                        </div>
                      )}
                      {program.manualReviewNotes && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <strong>Review Notes:</strong> {program.manualReviewNotes}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedProgram(program);
                      setReviewNotes(program.manualReviewNotes || '');
                      setNewConfidence(program.eligibilityConfidence);
                    }}
                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Review Modal */}
      {selectedProgram && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProgram.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedProgram.agencyId}</p>
                </div>
                <button
                  onClick={() => setSelectedProgram(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Eligibility Details */}
              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Extracted Eligibility Criteria</h3>
                  <div className="text-sm text-gray-700 space-y-2">
                    {selectedProgram.requiredCertifications && selectedProgram.requiredCertifications.length > 0 && (
                      <div>
                        <strong>Required Certifications:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {selectedProgram.requiredCertifications.map((cert, idx) => (
                            <li key={idx}>{cert}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedProgram.preferredCertifications && selectedProgram.preferredCertifications.length > 0 && (
                      <div>
                        <strong>Preferred Certifications:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {selectedProgram.preferredCertifications.map((cert, idx) => (
                            <li key={idx}>{cert}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedProgram.minInvestmentAmount && (
                      <div>
                        <strong>Minimum Investment Amount:</strong> ₩{selectedProgram.minInvestmentAmount.toLocaleString()}
                      </div>
                    )}
                    {selectedProgram.requiredOperatingYears && (
                      <div>
                        <strong>Operating Years Required:</strong> {selectedProgram.requiredOperatingYears}
                        {selectedProgram.maxOperatingYears ? ` - ${selectedProgram.maxOperatingYears}` : '+'} years
                      </div>
                    )}
                  </div>
                </div>

                {/* Announcement Link */}
                <div>
                  <a
                    href={selectedProgram.announcementUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    📄 View Original Announcement →
                  </a>
                </div>

                {/* Confidence Level Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Updated Confidence Level
                  </label>
                  <select
                    value={newConfidence}
                    onChange={(e) => setNewConfidence(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="LOW">Low Confidence</option>
                    <option value="MEDIUM">Medium Confidence</option>
                    <option value="HIGH">High Confidence</option>
                  </select>
                </div>

                {/* Review Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Notes (Required)
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={4}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter your review notes (e.g., 'Confirmed investment threshold is ₩200M', 'Ambiguous certification requirement - need to verify with agency')"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleReview('APPROVE')}
                  disabled={isSubmitting || !reviewNotes.trim()}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✓ Approve (High Confidence)
                </button>
                <button
                  onClick={() => handleReview('REQUEST_INFO')}
                  disabled={isSubmitting || !reviewNotes.trim()}
                  className="flex-1 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ⚠️ Request More Info
                </button>
                <button
                  onClick={() => handleReview('REJECT')}
                  disabled={isSubmitting || !reviewNotes.trim()}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✗ Mark as Low Confidence
                </button>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
