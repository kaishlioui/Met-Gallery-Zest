import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logo}>The Met</div>
        <div className={styles.subtitle}>Collection Explorer</div>
      </div>
      <div className={styles.meta}>Open Access · 470,000+ Works</div>
    </header>
  );
}
