import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  resetFilters,
  selectCulture,
  selectDepartmentId,
  selectDateRange,
  selectHasActiveFilters,
  selectIsHighlight,
  selectKeyword,
  setCulture,
  setDateRange,
  setDepartment,
  setKeyword,
  toggleHighlight,
} from '../../store/slices/filtersSlice';
import {
  selectSortField,
  selectViewType,
  setSortField,
  setViewType,
  type SortField,
  type ViewType,
} from '../../store/slices/uiSlice';
import styles from './Toolbar.module.css';

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'relevance', label: 'Relevance'  },
  { value: 'date-asc',  label: 'Date ↑'     },
  { value: 'date-desc', label: 'Date ↓'     },
  { value: 'title',     label: 'Title A–Z'  },
  { value: 'artist',    label: 'Artist A–Z' },
];

const VIEW_OPTIONS: { value: ViewType; icon: string; label: string }[] = [
  { value: 'grid',    icon: '⊞', label: 'Grid view'    },
  { value: 'list',    icon: '≡', label: 'List view'    },
  { value: 'compact', icon: '⊡', label: 'Compact view' },
];

interface Pill { id: string; label: string; onRemove: () => void; }

export function Toolbar({ total }: { total: number }) {
  const dispatch  = useAppDispatch();
  const keyword   = useAppSelector(selectKeyword);
  const deptId    = useAppSelector(selectDepartmentId);
  const culture   = useAppSelector(selectCulture);
  const dateRange = useAppSelector(selectDateRange);
  const isHL      = useAppSelector(selectIsHighlight);
  const hasActive = useAppSelector(selectHasActiveFilters);
  const sortField = useAppSelector(selectSortField);
  const viewType  = useAppSelector(selectViewType);

  const pills: Pill[] = [];
  if (keyword.trim())              pills.push({ id: 'kw',      label: `"${keyword.trim()}"`,                        onRemove: () => dispatch(setKeyword('')) });
  if (deptId)                      pills.push({ id: 'dept',    label: deptId,                                        onRemove: () => dispatch(setDepartment(null)) });
  if (culture.trim())              pills.push({ id: 'culture', label: culture.trim(),                                onRemove: () => dispatch(setCulture('')) });
  if (dateRange.dateBegin != null) pills.push({ id: 'date',    label: `${dateRange.dateBegin} – ${dateRange.dateEnd}`, onRemove: () => dispatch(setDateRange({ dateBegin: null, dateEnd: null })) });
  if (isHL)                        pills.push({ id: 'hl',      label: 'Highlights only',                             onRemove: () => dispatch(toggleHighlight()) });

  return (
    <div className={styles.toolbar}>

      <div className={styles.pillsRow}>
        {pills.length > 0 ? (
          <>
            {pills.map(pill => (
              <button
                key={pill.id}
                className={styles.pill}
                onClick={pill.onRemove}
                title={`Remove: ${pill.label}`}
              >
                <span className={styles.pillLabel}>{pill.label}</span>
                <span className={styles.pillX} aria-hidden>✕</span>
              </button>
            ))}
            {hasActive && (
              <button className={styles.clearAll} onClick={() => dispatch(resetFilters())}>
                Clear all
              </button>
            )}
          </>
        ) : (
          <span className={styles.noFilters}>
            {total > 0 ? `${total.toLocaleString()} works` : 'All works'}
          </span>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.sortWrap}>
          <span className={styles.sortLabel}>Sort by</span>
          <div className={styles.selectWrap}>
            <select
              className={styles.sortSelect}
              value={sortField}
              onChange={e => dispatch(setSortField(e.target.value as SortField))}
              aria-label="Sort results"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <span className={styles.selectChevron} aria-hidden>▾</span>
          </div>
        </div>

        <span className={styles.divider} aria-hidden />

        <div className={styles.viewGroup} role="group" aria-label="View type">
          {VIEW_OPTIONS.map(o => (
            <button
              key={o.value}
              className={`${styles.viewBtn} ${viewType === o.value ? styles.viewBtnActive : ''}`}
              onClick={() => dispatch(setViewType(o.value))}
              aria-label={o.label}
              aria-pressed={viewType === o.value}
              title={o.label}
            >
              {o.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
