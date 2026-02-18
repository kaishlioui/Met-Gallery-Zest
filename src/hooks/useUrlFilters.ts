/**
 * useUrlFilters — bidirectional URL ↔ Redux bridge with nuqs
 *
 * ARCHITECTURE
 * ────────────
 * Redux is the single source of truth. Components dispatch Redux actions.
 * This hook watches Redux state and mirrors it to the URL via nuqs.
 *
 * THREE RESPONSIBILITIES:
 *   1. MOUNT    — read URL → hydrate Redux (restore from bookmark/refresh)
 *   2. CHANGE   — watch Redux → write URL (persist every user action)
 *   3. POPSTATE — back/forward → read URL → update Redux
 */

import { useEffect, useRef } from 'react';
import { parseAsString, parseAsInteger, parseAsBoolean, useQueryStates } from 'nuqs';
import { useAppDispatch, useAppSelector }  from './redux';
import { syncFiltersFromUrl, selectFilters, DEFAULT_FILTERS } from '../store/slices/filtersSlice';
import { setPage, selectCurrentPage }      from '../store/slices/searchSlice';
import type { FilterParams }               from '../types/met.types';

const KW_DEBOUNCE_MS = 400;

// ─── nuqs parsers ─────────────────────────────────────────────────────────────

const urlParsers = {
  q:         parseAsString,
  dept:      parseAsString,
  culture:   parseAsString,
  from:      parseAsInteger,
  to:        parseAsInteger,
  highlight: parseAsBoolean.withDefault(true),
  page:      parseAsInteger,
};

// ─── Redux state → URL params ─────────────────────────────────────────────────

function filtersToUrlState(f: FilterParams, page: number) {
  return {
    q:         f.keyword.trim()    || null,
    dept:      f.departmentId      || null,
    culture:   f.culture.trim()    || null,
    from:      f.dateBegin         ?? null,
    to:        f.dateEnd           ?? null,
    highlight: f.isHighlight       || null,
    page:      page > 0 ? page : null,
  };
}

// ─── URL params → Redux state ─────────────────────────────────────────────────

function urlStateToFilters(urlState: Record<string, any>): { filters: FilterParams; page: number } {
  const from = urlState.from;
  const to   = urlState.to;
  const dateBegin = from != null && to != null ? from : null;
  const dateEnd   = from != null && to != null ? to   : null;

  return {
    filters: {
      keyword:      urlState.q        ?? '',
      departmentId: urlState.dept     ?? null,
      culture:      urlState.culture  ?? '',
      dateBegin,
      dateEnd,
      isHighlight:  urlState.highlight ?? false,
    },
    page: urlState.page ?? 0,
  };
}

// ─── Equality ─────────────────────────────────────────────────────────────────

function filtersEqual(a: FilterParams, b: FilterParams): boolean {
  return (
    a.keyword      === b.keyword      &&
    a.departmentId === b.departmentId &&
    a.culture      === b.culture      &&
    a.dateBegin    === b.dateBegin    &&
    a.dateEnd      === b.dateEnd      &&
    a.isHighlight  === b.isHighlight
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useUrlFilters(): void {
  const dispatch = useAppDispatch();
  const filters  = useAppSelector(selectFilters);
  const page     = useAppSelector(selectCurrentPage);

  // nuqs hook
  const [urlState, setUrlState] = useQueryStates(urlParsers, {
    history: 'push',
  });

  const lastFilters = useRef<FilterParams>(DEFAULT_FILTERS);
  const lastPage    = useRef<number>(0);
  const isFirstRender = useRef(true);
  const kwTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 1. MOUNT: URL → Redux ─────────────────────────────────────────────────
  // On mount, read urlState and hydrate Redux.
  // This runs synchronously on first render, before any other effects.
  if (isFirstRender.current) {
    console.log('[useUrlFilters] MOUNT — initial urlState:', urlState);
    const { filters: initFilters, page: initPage } = urlStateToFilters(urlState);
    console.log('[useUrlFilters] MOUNT — parsed filters:', initFilters, 'page:', initPage);
    
    // Hydrate Redux synchronously
    dispatch(syncFiltersFromUrl(initFilters));
    dispatch(setPage(initPage));
    
    // Track what we just wrote
    lastFilters.current = initFilters;
    lastPage.current    = initPage;
    
    isFirstRender.current = false;
  }

  // ── 2. CHANGE: Redux → URL ────────────────────────────────────────────────
  useEffect(() => {
    // Skip if this is the first render (mount already handled it)
    if (isFirstRender.current) return;

    const filtersChanged = !filtersEqual(filters, lastFilters.current);
    const pageChanged    = page !== lastPage.current;
    
    console.log('[useUrlFilters] CHANGE check:', {
      filtersChanged,
      pageChanged,
      currentFilters: filters,
      lastFilters: lastFilters.current,
      currentPage: page,
      lastPage: lastPage.current,
    });

    if (!filtersChanged && !pageChanged) return;

    const push = () => {
      const nextUrlState = filtersToUrlState(filters, page);
      console.log('[useUrlFilters] CHANGE → writing to URL:', nextUrlState);
      setUrlState(nextUrlState);
      lastFilters.current = filters;
      lastPage.current    = page;
    };

    // Debounce keyword-only changes
    const onlyKwChanged = (
      filtersChanged &&
      !pageChanged   &&
      filters.keyword !== lastFilters.current.keyword &&
      filtersEqual(
        { ...filters,             keyword: lastFilters.current.keyword },
        { ...lastFilters.current, keyword: lastFilters.current.keyword }
      )
    );

    if (kwTimer.current) clearTimeout(kwTimer.current);

    if (onlyKwChanged) {
      console.log('[useUrlFilters] CHANGE → debouncing keyword');
      kwTimer.current = setTimeout(push, KW_DEBOUNCE_MS);
    } else {
      push();
    }

    return () => {
      if (kwTimer.current) clearTimeout(kwTimer.current);
    };
  }, [filters, page, setUrlState, dispatch]);

  // ── 3. POPSTATE: browser back/forward → Redux ────────────────────────────
  // When urlState changes from browser navigation, sync to Redux
  useEffect(() => {
    // Skip on first render (mount already handled it)
    if (isFirstRender.current) return;

    console.log('[useUrlFilters] urlState changed:', urlState);
    const { filters: urlFilters, page: urlPage } = urlStateToFilters(urlState);
    
    // Check if this matches what we last wrote (our own setUrlState call)
    const matchesLastWrite = (
      filtersEqual(urlFilters, lastFilters.current) &&
      urlPage === lastPage.current
    );

    if (matchesLastWrite) {
      console.log('[useUrlFilters] urlState matches our last write, ignoring');
      return;
    }

    // URL changed from browser navigation (back/forward)
    console.log('[useUrlFilters] POPSTATE — syncing to Redux:', urlFilters, 'page:', urlPage);
    lastFilters.current = urlFilters;
    lastPage.current    = urlPage;
    
    dispatch(syncFiltersFromUrl(urlFilters));
    dispatch(setPage(urlPage));
  }, [urlState, dispatch]);
}
