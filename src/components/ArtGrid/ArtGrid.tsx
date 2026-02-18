import { useState } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { selectCurrentPage } from '../../store/slices/searchSlice';
import { selectSortField, selectViewType, type SortField, type ViewType } from '../../store/slices/uiSlice';
import type { ArtObject, ArtObjectSummary } from '../../types/met.types';
import { ArtCard, ArtCardSkeleton, ArtDetailFetcher } from '../ArtCard/ArtCard';
import { ArtDetail } from '../ArtDetail/ArtDetail';
import { Pagination } from '../Pagination/Pagination';
import styles from './ArtGrid.module.css';

const PAGE_SIZE = 20;

interface Props {
  results:    ArtObjectSummary[];
  total:      number;
  totalPages: number;
  isLoading:  boolean;
  isError:    boolean;
}

function gridClass(v: ViewType): string {
  if (v === 'list')    return styles.listStack;
  if (v === 'compact') return styles.compactStack;
  return styles.grid;
}

function sortResults(rows: ArtObjectSummary[], field: SortField): ArtObjectSummary[] {
  if (field === 'relevance') return rows;
  return [...rows].sort((a, b) => {
    switch (field) {
      case 'date-asc':  return (a.object_begin_date ?? 9999) - (b.object_begin_date ?? 9999);
      case 'date-desc': return (b.object_begin_date ?? -9999) - (a.object_begin_date ?? -9999);
      case 'title':     return (a.title  ?? '').localeCompare(b.title  ?? '');
      case 'artist':    return (a.artist ?? '').localeCompare(b.artist ?? '');
      default:          return 0;
    }
  });
}

export function ArtGrid({ results, total, totalPages, isLoading, isError }: Props) {
  const currentPage = useAppSelector(selectCurrentPage);
  const viewType    = useAppSelector(selectViewType);
  const sortField   = useAppSelector(selectSortField);

  const [modalState, setModalState] = useState<null | number | ArtObject>(null);

  const handleCardClick = (id: number)     => setModalState(id);
  const handleClose     = ()               => setModalState(null);
  const handleLoaded    = (obj: ArtObject) => setModalState(obj);

  if (isLoading && results.length === 0) {
    return (
      <>
        <div className={styles.loadingBar} />
        <div className={gridClass(viewType)}>
          {Array.from({ length: PAGE_SIZE }, (_, i) => (
            <ArtCardSkeleton key={i} viewType={viewType} />
          ))}
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <div className={styles.state}>
        <div className={styles.stateIcon}>⚠</div>
        <div className={styles.stateTitle}>Could not reach the server</div>
        <div className={styles.stateSub}>Make sure the Node server is running on port 3001.</div>
      </div>
    );
  }

  if (!isLoading && total === 0) {
    return (
      <div className={styles.state}>
        <div className={styles.stateIcon}>◈</div>
        <div className={styles.stateTitle}>No works found</div>
        <div className={styles.stateSub}>Try adjusting your filters or broadening your search.</div>
      </div>
    );
  }

  const displayed = sortResults(results, sortField);

  return (
    <>
      {isLoading && <div className={styles.loadingBar} />}

      {total > 0 && (
        <div className={styles.resultsBar}>
          <div className={styles.resultsCount}>
            <strong>{total.toLocaleString()}</strong> works found
          </div>
          {totalPages > 1 && (
            <div className={styles.pageInfo}>
              Page {currentPage + 1} of {totalPages.toLocaleString()}
            </div>
          )}
        </div>
      )}

      <div className={gridClass(viewType)}>
        {displayed.map((summary) => (
          <ArtCard
            key={summary.id}
            summary={summary}
            onClick={handleCardClick}
            viewType={viewType}
          />
        ))}
      </div>

      <Pagination totalPages={totalPages} />

      {typeof modalState === 'number' && (
        <ArtDetailFetcher
          id={modalState}
          onLoaded={handleLoaded}
          onClose={handleClose}
        />
      )}
      {modalState !== null && typeof modalState === 'object' && (
        <ArtDetail obj={modalState} onClose={handleClose} />
      )}
    </>
  );
}
