import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Search data is owned by RTK Query (metApi.search).
// This slice only tracks the current page so URL sync and Pagination can read it.
interface SearchState {
  currentPage: number;
}

const searchSlice = createSlice({
  name: 'search',
  initialState: { currentPage: 0 } as SearchState,
  reducers: {
    setPage:   (state, action: PayloadAction<number>) => { state.currentPage = Math.max(0, action.payload); },
    resetPage: (state) => { state.currentPage = 0; },
  },
});

export const { setPage, resetPage } = searchSlice.actions;
export default searchSlice.reducer;

export const selectCurrentPage = (s: RootState) => s.search.currentPage;
