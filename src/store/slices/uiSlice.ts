import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export type ViewType  = 'grid' | 'list' | 'compact';
export type SortField = 'relevance' | 'date-asc' | 'date-desc' | 'title' | 'artist';

interface UiState {
  viewType:  ViewType;
  sortField: SortField;
}

const initialState: UiState = {
  viewType:  'grid',
  sortField: 'relevance',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setViewType:  (state, action: PayloadAction<ViewType>)  => { state.viewType  = action.payload; },
    setSortField: (state, action: PayloadAction<SortField>) => { state.sortField = action.payload; },
  },
});

export const { setViewType, setSortField } = uiSlice.actions;
export default uiSlice.reducer;

export const selectViewType  = (s: RootState) => s.ui.viewType;
export const selectSortField = (s: RootState) => s.ui.sortField;
