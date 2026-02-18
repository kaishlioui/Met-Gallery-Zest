import type { ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { setPage, selectCurrentPage } from '../../store/slices/searchSlice';
import styles from './Pagination.module.css';

interface Props {
  totalPages: number;
}

export function Pagination({ totalPages }: Props) {
  const dispatch = useAppDispatch();
  const current  = useAppSelector(selectCurrentPage);

  // Dispatch to Redux — useUrlSync will pick up the state change and update the URL
  const navigateTo = (page: number) => {
    dispatch(setPage(page));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (totalPages <= 1) return null;

  // Always show: first, last, current ±2. Gaps get an ellipsis.
  const pageSet = new Set([0, totalPages - 1]);
  for (let i = current - 2; i <= current + 2; i++) {
    if (i >= 0 && i < totalPages) pageSet.add(i);
  }
  const pages = [...pageSet].sort((a, b) => a - b);

  const items: ReactNode[] = [];
  let prev = -1;
  for (const p of pages) {
    if (prev !== -1 && p - prev > 1) {
      items.push(<span key={`ellipsis-${p}`} className={styles.ellipsis}>…</span>);
    }
    items.push(
      <button
        key={p}
        className={`${styles.btn} ${p === current ? styles.active : ''}`}
        onClick={() => navigateTo(p)}
        aria-label={`Page ${p + 1}`}
        aria-current={p === current ? 'page' : undefined}
      >
        {p + 1}
      </button>
    );
    prev = p;
  }

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <button
        className={styles.btn}
        onClick={() => navigateTo(current - 1)}
        disabled={current === 0}
        aria-label="Previous page"
      >‹</button>
      {items}
      <button
        className={styles.btn}
        onClick={() => navigateTo(current + 1)}
        disabled={current >= totalPages - 1}
        aria-label="Next page"
      >›</button>
    </nav>
  );
}
