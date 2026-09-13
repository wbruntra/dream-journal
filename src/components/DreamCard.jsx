import { useState, useEffect } from 'preact/hooks';
import { AudioPlayer } from './AudioPlayer';
import { formatDuration, formatRelativeDate, getMoodDetails, downloadBlob } from '../utils/formatters';

export function DreamCard({ dream, onSelect, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const mood = getMoodDetails(dream.mood);

  useEffect(() => {
    if (!dream.imageBlob) {
      setThumbnailUrl(null);
      return;
    }
    const url = URL.createObjectURL(dream.imageBlob);
    setThumbnailUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [dream.imageBlob]);

  const handleDownload = (e) => {
    e.stopPropagation();
    if (!dream.audioBlob) return;
    const ext = dream.mimeType && dream.mimeType.includes('mp4') ? 'm4a' : 'webm';
    const cleanTitle = (dream.title || 'dream').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `${cleanTitle}-${new Date(dream.createdAt).toISOString().slice(0, 10)}.${ext}`;
    downloadBlob(dream.audioBlob, filename);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete(dream.id);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  return (
    <article
      class="dream-card"
      onClick={() => onSelect(dream)}
      tabIndex={0}
      role="button"
      aria-label={`Open details for dream: ${dream.title}`}
    >
      {thumbnailUrl && (
        <div class="dream-card-thumbnail-wrap">
          <img src={thumbnailUrl} alt="" class="dream-card-thumbnail" />
        </div>
      )}

      <div class="dream-card-header">
        <div class="card-title-row">
          <span
            class="mood-badge"
            style={{
              '--badge-color': mood.color,
              '--badge-bg': mood.bg
            }}
          >
            <span class="badge-emoji">{mood.emoji}</span>
            <span class="badge-text">{mood.label}</span>
          </span>
          <span class="dream-date-label">
            {formatRelativeDate(dream.createdAt)}
          </span>
        </div>

        <h3 class="dream-card-title">{dream.title}</h3>
      </div>

      {dream.notes && (
        <p class="dream-card-notes-preview">
          {dream.notes.length > 130 ? dream.notes.substring(0, 130) + '…' : dream.notes}
        </p>
      )}

      <div class="dream-card-player-row" onClick={(e) => e.stopPropagation()}>
        <AudioPlayer
          audioBlob={dream.audioBlob}
          duration={dream.duration}
          compact={true}
        />
      </div>

      <div class="dream-card-footer" onClick={(e) => e.stopPropagation()}>
        <div class="duration-chip">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{formatDuration(dream.duration)}</span>
        </div>

        <div class="card-actions-group">
          <button
            type="button"
            class="card-action-btn"
            onClick={handleDownload}
            title="Download audio recording"
            aria-label="Download audio recording"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>

          <button
            type="button"
            class={`card-action-btn delete ${confirmDelete ? 'confirm' : ''}`}
            onClick={handleDeleteClick}
            title={confirmDelete ? 'Tap again to confirm delete' : 'Delete dream'}
            aria-label={confirmDelete ? 'Confirm delete dream' : 'Delete dream'}
          >
            {confirmDelete ? (
              <span class="confirm-text">Delete?</span>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            )}
          </button>

          <button
            type="button"
            class="card-action-btn detail-open"
            onClick={() => onSelect(dream)}
            title="View full dream details"
            aria-label="View full dream details"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </article>
  );
}
