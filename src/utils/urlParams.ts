import type { FilterParams } from '../types/met.types';
import { DEFAULT_FILTERS } from '../store/slices/filtersSlice';

const K = {
  keyword:      'q',
  departmentId: 'dept',
  culture:      'culture',
  dateBegin:    'from',
  dateEnd:      'to',
  isHighlight:  'highlight',
} as const;

export function filtersToUrlParams(f: FilterParams): URLSearchParams {
  const p = new URLSearchParams();
  if (f.keyword.trim())    p.set(K.keyword,      f.keyword.trim());
  if (f.departmentId)      p.set(K.departmentId, f.departmentId);
  if (f.culture.trim())    p.set(K.culture,      f.culture.trim());
  if (f.dateBegin != null) p.set(K.dateBegin,    String(f.dateBegin));
  if (f.dateEnd   != null) p.set(K.dateEnd,      String(f.dateEnd));
  if (f.isHighlight)       p.set(K.isHighlight,  'true');
  return p;
}

export function urlParamsToFilters(p: URLSearchParams): FilterParams {
  const rawFrom   = p.get(K.dateBegin);
  const rawTo     = p.get(K.dateEnd);
  const dateBegin = rawFrom && !isNaN(Number(rawFrom)) ? Number(rawFrom) : null;
  const dateEnd   = rawTo   && !isNaN(Number(rawTo))   ? Number(rawTo)   : null;

  return {
    keyword:      p.get(K.keyword)      ?? DEFAULT_FILTERS.keyword,
    departmentId: p.get(K.departmentId) ?? DEFAULT_FILTERS.departmentId,
    culture:      p.get(K.culture)      ?? DEFAULT_FILTERS.culture,
    dateBegin:    dateBegin !== null && dateEnd !== null ? dateBegin : null,
    dateEnd:      dateBegin !== null && dateEnd !== null ? dateEnd   : null,
    isHighlight:  p.get(K.isHighlight) === 'true',
  };
}

export function filtersAreEqual(a: FilterParams, b: FilterParams): boolean {
  return (
    a.keyword      === b.keyword      &&
    a.departmentId === b.departmentId &&
    a.culture      === b.culture      &&
    a.dateBegin    === b.dateBegin    &&
    a.dateEnd      === b.dateEnd      &&
    a.isHighlight  === b.isHighlight
  );
}

export function getPageFromUrl(p: URLSearchParams): number {
  const n = parseInt(p.get('page') ?? '0', 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

export function setPageInUrl(p: URLSearchParams, page: number): URLSearchParams {
  const next = new URLSearchParams(p.toString());
  if (page === 0) next.delete('page');
  else next.set('page', String(page));
  return next;
}
