/**
 * Announcement File Filter - Identifies genuine announcement files
 *
 * Purpose: Distinguish authoritative announcement files (공고문) from
 * application forms, templates, and other supporting documents
 *
 * Includes: 공고문, 공고, 공모, 모집, 신청안내, 사업안내, 안내문, 요강, 지침, 공
 * Excludes: 신청서, 양식, 집행계획, 정산, 협약서, 신청안내서, 사업계획서, 제안서, 별지, 서식, 작성양식
 *
 * Usage:
 *   const announcementFiles = filterAnnouncementFiles(allFilenames);
 *   const otherFiles = allFilenames.filter(f => !announcementFiles.includes(f));
 */

/**
 * Patterns that indicate a file IS an announcement document
 */
const ANNOUNCEMENT_PATTERNS = [
  /공고문/i,
  /공고(?!기관)/i, // "공고" but not "공고기관" (announcing agency)
  /공모/i,
  /모집/i,
  /신청안내/i,
  /사업안내/i,
  /안내문/i,
  /요강/i,
  /지침/i,
  /공/i, // "공" - short form for public notices/announcements
];

/**
 * Patterns that indicate a file is NOT an announcement document
 * (application forms, templates, execution plans, etc.)
 */
const EXCLUSION_PATTERNS = [
  /신청서/i,
  /양식/i,
  /집행계획/i,
  /정산/i,
  /협약서/i,
  /신청안내서/i,
  /사업계획서/i,
  /제안서/i,
  // /첨부서류/i, // REMOVED: Allow files containing "첨부서류" (attachment documents)
  /별지/i,
  /서식/i,
  /작성양식/i,
];

/**
 * Filter filenames to identify genuine announcement files
 *
 * Algorithm:
 * 1. Check if filename matches any EXCLUSION_PATTERNS → skip
 * 2. Check if filename matches any ANNOUNCEMENT_PATTERNS → include
 * 3. If no patterns match → skip (conservative approach)
 *
 * @param filenames - Array of attachment filenames
 * @returns Array of filenames that are announcement documents
 */
export function filterAnnouncementFiles(filenames: string[]): string[] {
  return filenames.filter((filename) => {
    // Step 1: Exclude files matching exclusion patterns
    const isExcluded = EXCLUSION_PATTERNS.some((pattern) => pattern.test(filename));
    if (isExcluded) {
      return false;
    }

    // Step 2: Include files matching announcement patterns
    const isAnnouncement = ANNOUNCEMENT_PATTERNS.some((pattern) => pattern.test(filename));
    if (isAnnouncement) {
      return true;
    }

    // Step 3: Conservative approach - skip if uncertain
    return false;
  });
}

/**
 * Categorize attachments into announcement files and other files
 *
 * @param filenames - Array of all attachment filenames
 * @returns Object with announcementFiles and otherFiles arrays
 */
export function categorizeAttachments(filenames: string[]): {
  announcementFiles: string[];
  otherFiles: string[];
} {
  const announcementFiles = filterAnnouncementFiles(filenames);
  const otherFiles = filenames.filter((f) => !announcementFiles.includes(f));

  return {
    announcementFiles,
    otherFiles,
  };
}

/**
 * Check if a single filename is an announcement file
 *
 * @param filename - Filename to check
 * @returns true if filename matches announcement patterns
 */
export function isAnnouncementFile(filename: string): boolean {
  const isExcluded = EXCLUSION_PATTERNS.some((pattern) => pattern.test(filename));
  if (isExcluded) return false;

  return ANNOUNCEMENT_PATTERNS.some((pattern) => pattern.test(filename));
}
