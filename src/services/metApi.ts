import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { ArtObject, FilterParams, SearchResult } from '../types/met.types';

export const metApi = createApi({
  reducerPath: 'metApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({

    // GET /api/search  →  SearchResult
    search: builder.query<SearchResult, { filters: FilterParams; page: number }>({
      query: ({ filters, page }) => {
        const p = new URLSearchParams();
        if (filters.keyword.trim())    p.set('q',         filters.keyword.trim());
        if (filters.departmentId)      p.set('dept',      filters.departmentId);
        if (filters.culture.trim())    p.set('culture',   filters.culture.trim());
        if (filters.dateBegin != null) p.set('from',      String(filters.dateBegin));
        if (filters.dateEnd   != null) p.set('to',        String(filters.dateEnd));
        if (filters.isHighlight)       p.set('highlight', 'true');
        if (page > 0)                  p.set('page',      String(page));
        return `/search?${p.toString()}`;
      },
      keepUnusedDataFor: 300,
    }),

    // GET /api/objects/:id  →  ArtObject (full row)
    getObject: builder.query<ArtObject, number>({
      query: (id) => `/objects/${id}`,
      keepUnusedDataFor: 3600,
    }),

    // GET /api/departments  →  string[]
    getDepartments: builder.query<string[], void>({
      query: () => '/departments',
      keepUnusedDataFor: Infinity,
    }),

  }),
});

export const {
  useSearchQuery,
  useGetObjectQuery,
  useGetDepartmentsQuery,
} = metApi;
