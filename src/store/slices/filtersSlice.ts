import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FilterParams } from '../../types/met.types';
import type { RootState } from '../index';

export const DEFAULT_FILTERS: FilterParams = {
  keyword:      '',
  departmentId: null,
  culture:      '',
  dateBegin:    null,
  dateEnd:      null,
  isHighlight:  true,
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState: { ...DEFAULT_FILTERS } as FilterParams,
  reducers: {
    syncFiltersFromUrl: (_, action: PayloadAction<FilterParams>) => ({ ...action.payload }),
    setKeyword:    (state, action: PayloadAction<string>)        => { state.keyword      = action.payload; },
    setDepartment: (state, action: PayloadAction<string | null>) => { state.departmentId = action.payload; },
    setCulture:    (state, action: PayloadAction<string>)        => { state.culture      = action.payload; },
    setDateRange:  (state, action: PayloadAction<{ dateBegin: number | null; dateEnd: number | null }>) => {
      state.dateBegin = action.payload.dateBegin;
      state.dateEnd   = action.payload.dateEnd;
    },
    toggleHighlight: (state) => { state.isHighlight = !state.isHighlight; },
    resetFilters:    ()      => ({ ...DEFAULT_FILTERS }),
  },
});

export const {
  syncFiltersFromUrl, setKeyword, setDepartment, setCulture,
  setDateRange, toggleHighlight, resetFilters,
} = filtersSlice.actions;

export default filtersSlice.reducer;

export const selectFilters      = (s: RootState): FilterParams => s.filters;
export const selectKeyword      = (s: RootState) => s.filters.keyword;
export const selectDepartmentId = (s: RootState) => s.filters.departmentId;
export const selectCulture      = (s: RootState) => s.filters.culture;
export const selectIsHighlight  = (s: RootState) => s.filters.isHighlight;
export const selectDateBegin    = (s: RootState) => s.filters.dateBegin;
export const selectDateEnd      = (s: RootState) => s.filters.dateEnd;

export const selectDateRange = createSelector(
  selectDateBegin, selectDateEnd,
  (dateBegin, dateEnd) => ({ dateBegin, dateEnd })
);

export const selectHasActiveFilters = (s: RootState): boolean => {
  const f = s.filters;
  return (
    f.keyword      !== DEFAULT_FILTERS.keyword      ||
    f.departmentId !== DEFAULT_FILTERS.departmentId ||
    f.culture      !== DEFAULT_FILTERS.culture      ||
    f.dateBegin    !== DEFAULT_FILTERS.dateBegin     ||
    f.dateEnd      !== DEFAULT_FILTERS.dateEnd       ||
    f.isHighlight  !== DEFAULT_FILTERS.isHighlight
  );
};
