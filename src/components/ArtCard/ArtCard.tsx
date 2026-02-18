import { memo, useEffect } from 'react';
import { useGetObjectQuery } from '../../services/metApi';
import type { ArtObject, ArtObjectSummary } from '../../types/met.types';
import type { ViewType } from '../../store/slices/uiSlice';
import styles from './ArtCard.module.css';

// ── Skeletons ─────────────────────────────────────────────────────────────────

export function ArtCardSkeleton({ viewType = 'grid' }: { viewType?: ViewType }) {
  if (viewType === 'list') {
    return (
      <div className={styles.skeletonList}>
        <div className={styles.skeletonThumb} />
        <div className={styles.skeletonBody}>
          <div className={`${styles.skeletonLine} ${styles.short}`} />
          <div className={`${styles.skeletonLine} ${styles.long}`} />
          <div className={`${styles.skeletonLine} ${styles.medium}`} />
        </div>
      </div>
    );
  }
  if (viewType === 'compact') {
    return (
      <div className={styles.skeletonCompact}>
        <div className={styles.skeletonDot} />
        <div className={`${styles.skeletonLine} ${styles.long}`} style={{ flex: 1 }} />
      </div>
    );
  }
  return (
    <div className={styles.skeleton}>
      <div className={styles.skeletonImage} />
      <div className={styles.skeletonBody}>
        <div className={`${styles.skeletonLine} ${styles.short}`} />
        <div className={`${styles.skeletonLine} ${styles.long}`} />
        <div className={`${styles.skeletonLine} ${styles.medium}`} />
      </div>
    </div>
  );
}

// ── Error state ───────────────────────────────────────────────────────────────

function ArtCardError({ viewType = 'grid' }: { viewType?: ViewType }) {
  if (viewType === 'compact') {
    return (
      <div className={`${styles.compactRow} ${styles.errorRow}`}>
        <span className={styles.compactDot}>⚠</span>
        <span className={`${styles.compactTitle} ${styles.errorText}`}>Unavailable</span>
      </div>
    );
  }
  if (viewType === 'list') {
    return (
      <div className={`${styles.listRow} ${styles.errorRow}`}>
        <div className={styles.listThumb} />
        <div className={styles.listBody}>
          <div className={`${styles.listTitle} ${styles.errorText}`}>Unavailable</div>
        </div>
      </div>
    );
  }
  return (
    <div className={`${styles.card} ${styles.errorCard}`}>
      <div className={styles.errorInner}>
        <span className={styles.errorIcon}>⚠</span>
        <span className={styles.errorMsg}>Unavailable</span>
      </div>
    </div>
  );
}

// Keep TypeScript happy — ArtCardError is defined for future use
void ArtCardError;

// ── ArtCard ───────────────────────────────────────────────────────────────────

interface Props {
  summary:   ArtObjectSummary;
  onClick:   (id: number) => void;
  viewType?: ViewType;
}

export const ArtCard = memo(function ArtCard({ summary, onClick, viewType = 'grid' }: Props) {
  const sharedProps = {
    tabIndex: 0,
    role: 'button' as const,
    'aria-label': summary.title ?? 'Artwork',
    onClick:   () => onClick(summary.id),
    onKeyDown: (e: React.KeyboardEvent) =>
      (e.key === 'Enter' || e.key === ' ') && onClick(summary.id),
  };

  const image     = summary.primary_image_small ?? summary.primary_image;
  const highlight = summary.is_highlight === 1;

  // ── List view ──────────────────────────────────────────────────────────────
  if (viewType === 'list') {
    return (
      <article className={styles.listRow} {...sharedProps}>
        <div className={styles.listThumb}>
          {image
            ? <img src={image} alt={summary.title ?? ''} loading="lazy" />
            : <span className={styles.noImageIcon}>🖼</span>
          }
        </div>
        <div className={styles.listBody}>
          <div className={styles.listTitle}>{summary.title ?? 'Untitled'}</div>
          <div className={styles.listMeta}>
            {summary.artist     && <span>{summary.artist}</span>}
            {summary.artist && summary.date && <span className={styles.dot}>·</span>}
            {summary.date       && <span>{summary.date}</span>}
            {summary.department && <><span className={styles.dot}>·</span><span className={styles.listDept}>{summary.department}</span></>}
          </div>
        </div>
        {highlight && <span className={styles.listBadge}>★</span>}
      </article>
    );
  }

  // ── Compact view ───────────────────────────────────────────────────────────
  if (viewType === 'compact') {
    return (
      <article className={styles.compactRow} {...sharedProps}>
        <span className={styles.compactDot} aria-hidden>{highlight ? '★' : '·'}</span>
        <span className={styles.compactTitle}>{summary.title ?? 'Untitled'}</span>
        {summary.artist && <span className={styles.compactArtist}>{summary.artist}</span>}
        {summary.date   && <span className={styles.compactDate}>{summary.date}</span>}
      </article>
    );
  }

  // ── Grid view (default) ────────────────────────────────────────────────────
  return (
    <article className={styles.card} {...sharedProps}>
      <div className={styles.imageWrap}>
        {highlight && <div className={styles.highlightBadge}>★ Highlight</div>}
        {image
          ? <img src={image} alt={summary.title ?? ''} loading="lazy" />
          : (
            <div className={styles.noImage}>
              <span className={styles.noImageIcon}>🖼</span>
              <span>No image available</span>
            </div>
          )
        }
      </div>
      <div className={styles.body}>
        {summary.department && <div className={styles.dept}>{summary.department}</div>}
        <div className={styles.title}>{summary.title ?? 'Untitled'}</div>
        {summary.date       && <div className={styles.date}>{summary.date}</div>}
        {(summary.artist || summary.culture) && (
          <div className={styles.artist}>{summary.artist ?? summary.culture}</div>
        )}
      </div>
    </article>
  );
});

// ── ArtDetailFetcher ──────────────────────────────────────────────────────────
// Fetches the full object when a card is clicked, then hands off to ArtDetail.

interface DetailFetcherProps {
  id:       number;
  onLoaded: (obj: ArtObject) => void;
  onClose:  () => void;
}

export function ArtDetailFetcher({ id, onLoaded, onClose }: DetailFetcherProps) {
  const { data, isLoading, isError } = useGetObjectQuery(id);

  useEffect(() => {
    if (data) {
      onLoaded(data);
    }
  }, [data, onLoaded]);

  if (isLoading) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'grid', placeItems:'center', zIndex:1000 }}>
      <div style={{ color:'#fff', fontSize:'1.2rem' }}>Loading…</div>
    </div>
  );

  if (isError || !data) return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'grid', placeItems:'center', zIndex:1000, cursor:'pointer' }}
      onClick={onClose}
    >
      <div style={{ color:'#fff' }}>Failed to load artwork. Click to close.</div>
    </div>
  );

  return null;
}
