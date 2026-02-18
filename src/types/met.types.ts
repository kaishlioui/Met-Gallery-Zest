// Search result row
// Returned by /api/search
export interface ArtObjectSummary {
    id: number;
    object_id: string | null;
    title: string | null;
    artist: string | null;
    date: string | null;
    medium: string | null;
    primary_image: string | null;
    primary_image_small: string | null;
    department: string | null;
    culture: string | null;
    classification: string | null;
    is_highlight: number;          // 0 | 1 (SQLite boolean)    object_begin_date: number | null;
    object_begin_date: number | null;
    object_end_date: number | null;
}

//Full object
// Returned by /api/objects/:id - all columns
export interface ArtObject extends ArtObjectSummary {
    additional_images: string | null;
    object_url: string | null;
    artist_display_bio: string | null;
    credit_line: string | null;
    artist_nationality: string | null;
    description: string | null;
}

// Search API response envelope
export interface SearchResult {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    results: ArtObjectSummary[];
}

// Filter state (Redux + URL params)
export interface FilterParams {
    keyword: string;
    departmentId: string | null;
    culture: string;
    dateBegin: number | null;
    dateEnd: number | null;
    isHighlight: boolean;
}

export type LoadingStatus = 'idle' | 'loading' | 'succeeded' | 'failed';