/**
 * Markdown Parser for Claude Web Extraction Output
 *
 * Purpose: Parse Claude Web's markdown output into structured data
 *
 * Supports multiple input formats:
 *
 * 1. Table format:
 * ```
 * (A) 신청/운영 메타
 * | 필드 | 값 |
 * |------|-----|
 * | application_open_at | 2026-02-09 09:00 |
 * | application_close_at | 2026-02-25 18:00 |
 * ```
 *
 * 2. Key-value format (with or without bold):
 * ```
 * ## (A) 신청/운영 메타
 * - **application_open_at**: 2026-02-09 09:00
 * - **application_close_at**: 2026-02-25 18:00
 * ```
 *
 * 3. Mixed markdown file format:
 * ```
 * # 프로그램 분석 결과
 *
 * ## (A) 신청/운영 메타
 * application_open_at: 2026-02-09 09:00
 * application_close_at: 2026-02-25 18:00
 * ```
 *
 * 4. Multi-track table format:
 * ```
 * (B) 돈/기간
 * | 필드 | ①내역사업1 | ②내역사업2 |
 * |------|----------|----------|
 * | budget_per_project | 260백만원/년 × 2년 | 440백만원/년 × 3년 |
 * ```
 *
 * Output: Structured object with sections and tracks
 */

export interface ParsedSection {
  id: string; // 'A', 'B', 'C', 'D'
  name: string;
  fields: ParsedField[];
}

export interface ParsedField {
  name: string;
  value: string | null; // Single-track value
  tracks?: Record<string, string>; // Multi-track values: { '①': 'value1', '②': 'value2' }
}

export interface ParsedResult {
  sections: ParsedSection[];
  rawText: string;
  parseWarnings: string[];
  trackCount: number; // Number of sub-programs detected (1 = single track)
}

/**
 * Parse Claude Web markdown output into structured data
 * Supports multiple formats: tables, key-value pairs, bullet lists
 */
export function parseClaudeMarkdown(markdown: string): ParsedResult {
  const warnings: string[] = [];
  const sections: ParsedSection[] = [];
  let trackCount = 1;

  // Normalize line endings
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  let currentSection: ParsedSection | null = null;
  let tableHeaders: string[] = [];
  let inTable = false;
  let headerRowPassed = false;

  // State for tracking code blocks and multi-line array parsing
  let inCodeBlock = false;
  let collectingArrayField: string | null = null;
  let arrayValues: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      // End of table block on empty line (reset table state)
      if (inTable) {
        inTable = false;
        headerRowPassed = false;
        tableHeaders = [];
      }
      continue;
    }

    // Track code block state and skip comments
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (line.startsWith('<!--')) {
      continue;
    }

    // Handle multi-line array collection (for tech_keywords, domain_tags inside code blocks)
    if (collectingArrayField) {
      // Check if this line ends the array
      if (line === ']' || line.endsWith(']')) {
        // End of array - save collected values
        if (currentSection) {
          currentSection.fields.push({
            name: collectingArrayField,
            value: arrayValues.join(', '),
          });
        }
        collectingArrayField = null;
        arrayValues = [];
        continue;
      }
      // Extract quoted string values from lines like "keyword",
      const quotedMatch = line.match(/["']([^"']+)["']/);
      if (quotedMatch) {
        arrayValues.push(quotedMatch[1]);
      }
      continue;
    }

    // Detect start of array fields (tech_keywords/domain_tags) - handles "field: [" format
    const arrayStartMatch = line.match(/^(tech_keywords|domain_tags)\s*[:：]\s*\[$/);
    if (arrayStartMatch && currentSection) {
      collectingArrayField = arrayStartMatch[1];
      arrayValues = [];
      continue;
    }

    // Handle inline arrays like: tech_keywords: ["a", "b", "c"] or tech_keywords: []
    const inlineArrayMatch = line.match(/^(tech_keywords|domain_tags)\s*[:：]\s*\[(.*)\]$/);
    if (inlineArrayMatch && currentSection) {
      const fieldName = inlineArrayMatch[1];
      const arrayContent = inlineArrayMatch[2].trim();
      // Handle empty arrays
      if (!arrayContent) {
        currentSection.fields.push({
          name: fieldName,
          value: '',
        });
        continue;
      }
      // Extract all quoted strings from the inline array
      const values: string[] = [];
      const quotedRegex = /["']([^"']+)["']/g;
      let match;
      while ((match = quotedRegex.exec(arrayContent)) !== null) {
        values.push(match[1]);
      }
      currentSection.fields.push({
        name: fieldName,
        value: values.join(', '),
      });
      continue;
    }

    // Detect section headers like "(A) 신청/운영 메타" or "## (A) 신청/운영 메타"
    const sectionMatch = line.match(/^(?:#{1,4}\s*)?\(([A-D])\)\s*(.+)$/);
    if (sectionMatch) {
      // Save previous section if exists
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        id: sectionMatch[1],
        name: sectionMatch[2].trim(),
        fields: [],
      };
      inTable = false;
      headerRowPassed = false;
      tableHeaders = [];
      continue;
    }

    // Detect table header row
    if (line.startsWith('|') && line.includes('필드')) {
      tableHeaders = parseTableRow(line);
      inTable = true;
      headerRowPassed = false;

      // Detect multi-track headers like "①내역사업1", "②내역사업2"
      const trackHeaders = tableHeaders.filter((h) => /^[①②③④⑤]/.test(h));
      if (trackHeaders.length > 0) {
        trackCount = Math.max(trackCount, trackHeaders.length);
      }
      continue;
    }

    // Skip separator row (|------|-----|)
    if (inTable && line.match(/^\|[\s\-:|]+\|$/)) {
      headerRowPassed = true;
      continue;
    }

    // Parse table data row
    if (inTable && headerRowPassed && line.startsWith('|') && currentSection) {
      const cells = parseTableRow(line);

      if (cells.length >= 2) {
        const fieldName = cells[0];

        // Check if this is a multi-track table
        if (tableHeaders.length > 2) {
          // Multi-track: map values to track headers
          const tracks: Record<string, string> = {};
          for (let j = 1; j < cells.length && j < tableHeaders.length; j++) {
            const trackHeader = tableHeaders[j];
            const trackKey = extractTrackKey(trackHeader);
            if (trackKey && cells[j]) {
              tracks[trackKey] = cells[j];
            }
          }

          currentSection.fields.push({
            name: fieldName,
            value: null,
            tracks,
          });
        } else {
          // Single-track: just field -> value
          currentSection.fields.push({
            name: fieldName,
            value: cells[1] || null,
          });
        }
      }
      continue;
    }

    // Parse non-table formats when we have a current section and not in a table
    if (currentSection && !inTable) {
      const kvPair = parseKeyValueLine(line);
      if (kvPair) {
        currentSection.fields.push({
          name: kvPair.key,
          value: kvPair.value,
        });
      }
    }
  }

  // Save last section
  if (currentSection) {
    sections.push(currentSection);
  }

  // Validate sections
  const expectedSections = ['A', 'B', 'C', 'D'];
  const foundSections = sections.map((s) => s.id);
  const missingSections = expectedSections.filter((s) => !foundSections.includes(s));
  if (missingSections.length > 0) {
    warnings.push(`누락된 섹션: ${missingSections.join(', ')}`);
  }

  return {
    sections,
    rawText: markdown,
    parseWarnings: warnings,
    trackCount,
  };
}

/**
 * Parse a key-value line in various markdown formats
 * Supports:
 * - "- **key**: value"
 * - "- key: value"
 * - "**key**: value"
 * - "key: value"
 * - "* **key**: value"
 */
function parseKeyValueLine(line: string): { key: string; value: string } | null {
  // Pattern 1: Bullet list with bold key "- **key**: value" or "* **key**: value"
  const bulletBoldMatch = line.match(/^[-*]\s*\*\*([^*:]+)\*\*\s*[:：]\s*(.+)$/);
  if (bulletBoldMatch) {
    return {
      key: bulletBoldMatch[1].trim(),
      value: stripMarkdownFormatting(bulletBoldMatch[2].trim()),
    };
  }

  // Pattern 2: Bullet list without bold "- key: value"
  const bulletMatch = line.match(/^[-*]\s*([a-z_]+)\s*[:：]\s*(.+)$/);
  if (bulletMatch) {
    return {
      key: bulletMatch[1].trim(),
      value: stripMarkdownFormatting(bulletMatch[2].trim()),
    };
  }

  // Pattern 3: Bold key without bullet "**key**: value"
  const boldMatch = line.match(/^\*\*([^*:]+)\*\*\s*[:：]\s*(.+)$/);
  if (boldMatch) {
    return {
      key: boldMatch[1].trim(),
      value: stripMarkdownFormatting(boldMatch[2].trim()),
    };
  }

  // Pattern 4: Simple key: value format (only for snake_case or known field names)
  const simpleMatch = line.match(/^([a-z_]+)\s*[:：]\s*(.+)$/);
  if (simpleMatch) {
    return {
      key: simpleMatch[1].trim(),
      value: stripMarkdownFormatting(simpleMatch[2].trim()),
    };
  }

  return null;
}

/**
 * Parse a markdown table row into cells
 */
function parseTableRow(row: string): string[] {
  // Remove leading and trailing pipes, then split
  const cleaned = row.replace(/^\|/, '').replace(/\|$/, '');
  return cleaned.split('|').map((cell) => stripMarkdownFormatting(cell.trim()));
}

/**
 * Strip markdown formatting characters from a string
 * Removes: **bold**, *italic*, `code`, and combinations
 */
function stripMarkdownFormatting(text: string): string {
  return text
    // Remove bold (**text** or __text__)
    .replace(/^\*\*(.+?)\*\*$/, '$1')
    .replace(/^__(.+?)__$/, '$1')
    // Remove italic (*text* or _text_) - but not inside words
    .replace(/^\*([^*]+)\*$/, '$1')
    .replace(/^_([^_]+)_$/, '$1')
    // Remove inline code (`text`)
    .replace(/^`(.+?)`$/, '$1')
    .trim();
}

/**
 * Extract track key from header like "①내역사업1" -> "①"
 */
function extractTrackKey(header: string): string | null {
  const match = header.match(/^([①②③④⑤])/);
  return match ? match[1] : null;
}

/**
 * Get a specific field value from parsed result
 */
export function getFieldValue(
  result: ParsedResult,
  sectionId: string,
  fieldName: string,
  trackKey?: string
): string | null {
  const section = result.sections.find((s) => s.id === sectionId);
  if (!section) return null;

  const field = section.fields.find((f) => f.name === fieldName);
  if (!field) return null;

  if (trackKey && field.tracks) {
    return field.tracks[trackKey] || null;
  }

  return field.value;
}

/**
 * Get all track values for a field
 */
export function getFieldTracks(
  result: ParsedResult,
  sectionId: string,
  fieldName: string
): Record<string, string> | null {
  const section = result.sections.find((s) => s.id === sectionId);
  if (!section) return null;

  const field = section.fields.find((f) => f.name === fieldName);
  if (!field || !field.tracks) return null;

  return field.tracks;
}

/**
 * Flatten parsed result into a simple key-value map
 * For single-track programs, returns { fieldName: value }
 * For multi-track, returns { 'fieldName_①': value1, 'fieldName_②': value2 }
 */
export function flattenParsedResult(result: ParsedResult): Record<string, string | null> {
  const flat: Record<string, string | null> = {};

  for (const section of result.sections) {
    for (const field of section.fields) {
      const key = field.name;

      if (field.tracks && Object.keys(field.tracks).length > 0) {
        // Multi-track: flatten with track suffix
        for (const [trackKey, value] of Object.entries(field.tracks)) {
          flat[`${key}_${trackKey}`] = value;
        }
      } else {
        // Single-track
        flat[key] = field.value;
      }
    }
  }

  return flat;
}

/**
 * Validate required fields are present
 */
export function validateRequiredFields(result: ParsedResult): string[] {
  const errors: string[] = [];

  const requiredFields = [
    { section: 'A', field: 'application_close_at', label: '접수마감일' },
    { section: 'B', field: 'budget_per_project', label: '과제당 예산' },
    { section: 'C', field: 'applicant_org_types', label: '신청가능 기관유형' },
  ];

  for (const { section, field, label } of requiredFields) {
    const value = getFieldValue(result, section, field);
    const tracks = getFieldTracks(result, section, field);

    const hasValue = value || (tracks && Object.values(tracks).some((v) => v));
    if (!hasValue) {
      errors.push(`필수 필드 누락: ${label} (${field})`);
    }
  }

  return errors;
}
