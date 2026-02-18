import { useEffect, useState } from 'react';
import type { ArtObject } from '../../types/met.types';
import styles from './ArtDetail.module.css';

interface Props {
  obj:     ArtObject;
  onClose: () => void;
}

export function ArtDetail({ obj, onClose }: Props) {
  const [activeImg, setActiveImg] = useState<string | null>(obj.primary_image);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Reset to primary image when a new object is shown
  useEffect(() => {
    setActiveImg(obj.primary_image);
  }, [obj.id, obj.primary_image]);

  // Parse additional_images — could be JSON array or pipe-separated URLs
  const additionalImgs: string[] = (() => {
    if (!obj.additional_images) return [];
    try {
      const parsed = JSON.parse(obj.additional_images);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return obj.additional_images.split('|').map(s => s.trim()).filter(Boolean);
    }
  })();

  const metaItems = [
    { label: 'Date',           value: obj.date },
    { label: 'Culture',        value: obj.culture },
    { label: 'Medium',         value: obj.medium },
    { label: 'Classification', value: obj.classification },
    { label: 'Nationality',    value: obj.artist_nationality },
    { label: 'Credit',         value: obj.credit_line },
  ].filter((m): m is { label: string; value: string } => Boolean(m.value));

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={obj.title ?? 'Artwork detail'}
    >
      <div className={styles.card}>

        {/* Header */}
        <div className={styles.header}>
          <span className={styles.dept}>{obj.department ?? 'The Metropolitan Museum of Art'}</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* Image column */}
          <div className={styles.imageCol}>
            {activeImg
              ? <img className={styles.image} src={activeImg} alt={obj.title ?? ''} />
              : <div className={styles.imagePlaceholder}>No image available</div>
            }
            {/* Additional image thumbnails */}
            {additionalImgs.length > 0 && (
              <div className={styles.thumbs}>
                {[obj.primary_image, ...additionalImgs].filter(Boolean).map((url, i) => (
                  <img
                    key={i}
                    className={`${styles.thumb} ${url === activeImg ? styles.activeThumb : ''}`}
                    src={url!}
                    alt={`View ${i + 1}`}
                    onClick={() => setActiveImg(url!)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info column */}
          <div className={styles.infoCol}>
            <h2 className={styles.title}>{obj.title ?? 'Untitled'}</h2>
            <div className={styles.artist}>
              {obj.artist
                ? <>
                    {obj.artist}
                    {obj.artist_display_bio && <span className={styles.artistBio}> ({obj.artist_display_bio})</span>}
                  </>
                : <em>Unknown artist</em>
              }
            </div>

            {obj.description && (
              <p className={styles.description}>{obj.description}</p>
            )}

            <div className={styles.metaGrid}>
              {metaItems.map((m) => (
                <div key={m.label} className={styles.metaItem}>
                  <span className={styles.metaLabel}>{m.label}</span>
                  <span className={styles.metaValue}>{m.value}</span>
                </div>
              ))}
            </div>

            {obj.object_url && (
              <a
                className={styles.link}
                href={obj.object_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on metmuseum.org →
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
