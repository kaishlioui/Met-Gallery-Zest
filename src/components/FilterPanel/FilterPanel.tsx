import { useEffect, useRef, useState } from 'react';
import { useGetDepartmentsQuery } from '../../services/metApi';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  resetFilters,
  selectCulture,
  selectDateRange,
  selectDepartmentId,
  selectHasActiveFilters,
  selectIsHighlight,
  selectKeyword,
  setCulture,
  setDateRange,
  setDepartment,
  setKeyword,
  toggleHighlight,
} from '../../store/slices/filtersSlice';
import styles from './FilterPanel.module.css';

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div
      className={styles.toggle}
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange()}
    >
      <span className={styles.toggleLabel}>{label}</span>
      <div className={`${styles.toggleSwitch} ${checked ? styles.on : ''}`} />
    </div>
  );
}

interface Props {
  mobileOpen:    boolean;
  onMobileClose: () => void;
}

export function FilterPanel({ mobileOpen, onMobileClose }: Props) {
  const dispatch  = useAppDispatch();
  const keyword   = useAppSelector(selectKeyword);
  const deptId    = useAppSelector(selectDepartmentId);
  const culture   = useAppSelector(selectCulture);
  const dateRange = useAppSelector(selectDateRange);
  const isHL      = useAppSelector(selectIsHighlight);
  const hasActive = useAppSelector(selectHasActiveFilters);

  const { data: departments = [] } = useGetDepartmentsQuery();

  const [kwLocal,      setKwLocal]      = useState(keyword);
  const [cultureLocal, setCultureLocal] = useState(culture);
  const [dateFrom,     setDateFrom]     = useState<string>(dateRange.dateBegin?.toString() ?? '');
  const [dateTo,       setDateTo]       = useState<string>(dateRange.dateEnd?.toString()   ?? '');

  const kwTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cultureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local state in sync when Redux is reset externally (e.g. "Clear all")
  useEffect(() => setKwLocal(keyword),        [keyword]);
  useEffect(() => setCultureLocal(culture),   [culture]);
  useEffect(() => {
    setDateFrom(dateRange.dateBegin?.toString() ?? '');
    setDateTo(dateRange.dateEnd?.toString()     ?? '');
  }, [dateRange.dateBegin, dateRange.dateEnd]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleKeyword = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKwLocal(e.target.value);
    if (kwTimer.current) clearTimeout(kwTimer.current);
    kwTimer.current = setTimeout(() => dispatch(setKeyword(e.target.value)), 400);
  };

  const handleCulture = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCultureLocal(e.target.value);
    if (cultureTimer.current) clearTimeout(cultureTimer.current);
    cultureTimer.current = setTimeout(() => dispatch(setCulture(e.target.value)), 500);
  };

  const applyDateRange = () => {
    const b = dateFrom === '' ? null : Number(dateFrom);
    const e = dateTo   === '' ? null : Number(dateTo);
    if ((b === null) === (e === null)) dispatch(setDateRange({ dateBegin: b, dateEnd: e }));
  };

  const handleReset = () => {
    dispatch(resetFilters());
    setKwLocal(''); setCultureLocal(''); setDateFrom(''); setDateTo('');
  };

  const content = (
    <>
      <div className={styles.heading}>
        <span>Filters</span>
        <div className={styles.headingRight}>
          {hasActive && <button className={styles.resetBtn} onClick={handleReset}>Clear all</button>}
          <button className={styles.closeBtn} onClick={onMobileClose} aria-label="Close filters">✕</button>
        </div>
      </div>

      <div className={styles.group}>
        <label className={styles.label}>Search</label>
        <input
          className={styles.input}
          type="text"
          placeholder="Title, artist, culture…"
          value={kwLocal}
          onChange={handleKeyword}
        />
      </div>

      <div className={styles.group}>
        <label className={styles.label}>Department</label>
        <select
          className={styles.input}
          value={deptId ?? ''}
          onChange={(e) => dispatch(setDepartment(e.target.value || null))}
        >
          <option value="">All departments</option>
          {departments.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className={styles.group}>
        <label className={styles.label}>Culture / Origin</label>
        <input
          className={styles.input}
          type="text"
          placeholder="French, Egyptian, Chinese…"
          value={cultureLocal}
          onChange={handleCulture}
        />
      </div>

      <div className={styles.group}>
        <label className={styles.label}>Date Range (Year)</label>
        <div className={styles.dateRow}>
          <input
            className={styles.input}
            type="number"
            placeholder="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            onBlur={applyDateRange}
          />
          <span className={styles.dateSep}>–</span>
          <input
            className={styles.input}
            type="number"
            placeholder="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            onBlur={applyDateRange}
          />
        </div>
      </div>

      <Toggle label="Highlights only" checked={isHL} onChange={() => dispatch(toggleHighlight())} />

      <div className={styles.ornament}>⸻ ✦ ⸻</div>
    </>
  );

  return (
    <>
      <aside className={styles.panel}>{content}</aside>

      {mobileOpen && (
        <div className={styles.overlay} onClick={onMobileClose} aria-hidden="true" />
      )}
      <aside
        className={`${styles.drawer} ${mobileOpen ? styles.drawerOpen : ''}`}
        aria-label="Filters"
        aria-hidden={!mobileOpen}
      >
        {content}
      </aside>
    </>
  );
}
