import { configureStore } from '@reduxjs/toolkit';
import { metApi }     from '../services/metApi';
import filtersReducer from './slices/filtersSlice';
import searchReducer  from './slices/searchSlice';
import uiReducer      from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    filters:              filtersReducer,
    search:               searchReducer,
    ui:                   uiReducer,
    [metApi.reducerPath]: metApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(metApi.middleware),
});

export type RootState   = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
