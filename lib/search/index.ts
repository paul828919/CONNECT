/**
 * Search Module
 *
 * Provides Korean partial text search using pg_trgm extension.
 *
 * @module lib/search
 */

export {
  searchPrograms,
  searchProgramsSimple,
  isPgTrgmAvailable,
  getSearchSuggestions,
  SearchError,
  type SearchFilters,
  type SearchOptions,
  type SearchResult,
  type SearchResponse,
} from './program-search';
