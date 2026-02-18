import { useState } from 'react';
import { ArtGrid }    from '../components/ArtGrid/ArtGrid';
import { FilterPanel } from '../components/FilterPanel/FilterPanel';
import { Toolbar }     from '../components/Toolbar/Toolbar';
import { useUrlFilters }  from '../hooks/useUrlFilters';
import { useAppSelector } from '../hooks/redux';
import { selectFilters, selectHasActiveFilters } from '../store/slices/filtersSlice';
import { selectCurrentPage } from '../store/slices/searchSlice';
import { useSearchQuery } from '../services/metApi';
import styles from './GalleryPage.module.css';

export function GalleryPage() {
  const filters   = useAppSelector(selectFilters);
  const page      = useAppSelector(selectCurrentPage);
  const hasActive = useAppSelector(selectHasActiveFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Bridge: keeps URL ↔ Redux in sync (both directions)
  useUrlFilters();

  // isFetching is true for ALL fetches (including pagination)
  // isLoading is only true for the FIRST fetch
  const { data, isLoading, isFetching, isError } = useSearchQuery({ filters, page });

  return (
    <div className={styles.layout}>
      <FilterPanel
        mobileOpen={drawerOpen}
        onMobileClose={() => setDrawerOpen(false)}
      />

      <main className={styles.main}>
        <div className={styles.topBar}>
          <button
            className={`${styles.mobileFilterBtn} ${hasActive ? styles.mobileFilterBtnActive : ''}`}
            onClick={() => setDrawerOpen(true)}
            aria-label="Open filters"
          >
            <span>⊟</span>
            <span>Filters</span>
            {hasActive && <span className={styles.activeDot} />}
          </button>
          <Toolbar total={data?.total ?? 0} />
        </div>

        <ArtGrid
          results={data?.results    ?? []}
          total={data?.total        ?? 0}
          totalPages={data?.totalPages ?? 0}
          isLoading={isLoading || isFetching}
          isError={isError}
        />
      </main>
    </div>
  );
}
