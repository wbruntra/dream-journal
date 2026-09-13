import { useState, useEffect } from 'preact/hooks';
import { AudioPlayer } from './AudioPlayer';
import { formatDuration, formatRelativeDate, MOODS, getMoodDetails, downloadBlob } from '../utils/formatters';

export function DreamDetailModal({ dream, isOpen, onClose, onUpdate, onDelete, onOpenSettings }) {
  if (!isOpen || !dream) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(dream.title || '');
  const [notes, setNotes] = useState(dream.notes || '');
  const [mood, setMood] = useState(dream.mood || 'mystical');
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setTitle(dream.title || '');
    setNotes(dream.notes || '');
    setMood(dream.mood || 'mystical');
    setHasChanges(false);
    setConfirmDelete(false);
  }, [dream]);

  const handleSaveEdit = async () => {
    await onUpdate(dream.id, {
      title: title.trim() || 'Untitled Dream',
      notes: notes.trim(),
      mood
    });
    setHasChanges(false);
    setIsEditing(false);
  };

  const handleDownload = () => {
    if (!dream.audioBlob) return;
    const ext = dream.mimeType && dream.mimeType.includes('mp4') ? 'm4a' : 'webm';
    const cleanTitle = (dream.title || 'dream').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `${cleanTitle}-${new Date(dream.createdAt).toISOString().slice(0, 10)}.${ext}`;
    downloadBlob(dream.audioBlob, filename);
  };

  const moodInfo = getMoodDetails(mood);

  return (
    <div class="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal-sheet detail-sheet" role="dialog" aria-modal="true" aria-label="Dream Details">
        
        {/* Header */}
        <div class="modal-header">
          <div class="modal-title-group">
            <span
              class="mood-badge"
              style={{
                '--badge-color': moodInfo.color,
                '--badge-bg': moodInfo.bg
              }}
            >
              <span class="badge-emoji">{moodInfo.emoji}</span>
              <span class="badge-text">{moodInfo.label}</span>
            </span>
            <span class="modal-subdate">{formatRelativeDate(dream.createdAt)}</span>
          </div>

          <button
            type="button"
            class="close-icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div class="detail-body">
          {/* Title Area */}
          <div class="detail-title-section">
            <input
              type="text"
              class="detail-title-input"
              value={title}
              onInput={(e) => {
                setTitle(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Dream Title"
            />
          </div>

          {/* Expanded Audio Player */}
          <div class="detail-player-container">
            <div class="detail-player-header">
              <span class="detail-player-label">Voice Recording</span>
              <span class="detail-duration-tag">{formatDuration(dream.duration)}</span>
            </div>
            <AudioPlayer
              audioBlob={dream.audioBlob}
              duration={dream.duration}
              compact={false}
            />
          </div>

          {/* Mood Selector */}
          <div class="form-group">
            <label class="form-label">Dream Mood & Feeling</label>
            <div class="mood-chips-row">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  class={`mood-chip ${mood === m.id ? 'active' : ''}`}
                  onClick={() => {
                    setMood(m.id);
                    setHasChanges(true);
                  }}
                  style={{
                    '--mood-color': m.color,
                    '--mood-bg': m.bg
                  }}
                >
                  <span class="mood-emoji">{m.emoji}</span>
                  <span class="mood-name">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes / Recollection */}
          <div class="form-group">
            <label class="form-label">Journal Notes & Insights</label>
            <textarea
              class="text-area"
              rows="4"
              value={notes}
              onInput={(e) => {
                setNotes(e.target.value);
                setHasChanges(true);
              }}
              placeholder="Add key symbols, people, lucid moments, or feelings..."
            ></textarea>
          </div>

          {/* Save Changes Button if modified */}
          {hasChanges && (
            <div class="detail-save-alert">
              <span>You have unsaved edits.</span>
              <button
                type="button"
                class="btn-primary small"
                onClick={handleSaveEdit}
              >
                Save Changes
              </button>
            </div>
          )}

          {/* Longer-term Enhancements Cards (OpenRouter integration preview) */}
          <div class="enhancements-section">
            <h4 class="enhancements-heading">
              <span>✨ Future Enhancements</span>
              <button
                type="button"
                class="settings-shortcut-btn"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
              >
                Setup OpenRouter Key
              </button>
            </h4>

            <div class="enhancement-cards-grid">
              {/* Transcription Preview */}
              <div class="enhancement-card">
                <div class="card-icon-tag">🎙️</div>
                <div class="card-text">
                  <div class="card-header-line">
                    <span class="card-title">AI Voice Transcription</span>
                    <span class="planned-pill">Coming Soon</span>
                  </div>
                  <p class="card-desc">
                    In the next update, your recorded dream memo will be automatically transcribed into searchable text via OpenRouter.
                  </p>
                </div>
              </div>

              {/* Illustration Preview */}
              <div class="enhancement-card">
                <div class="card-icon-tag">🎨</div>
                <div class="card-text">
                  <div class="card-header-line">
                    <span class="card-title">Dream Scene Illustration</span>
                    <span class="planned-pill">Coming Soon</span>
                  </div>
                  <p class="card-desc">
                    AI will paint an evocative illustration matching the atmosphere, symbols, and emotions in your dream.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Footer */}
          <div class="detail-actions-footer">
            <button
              type="button"
              class="btn-secondary outline"
              onClick={handleDownload}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download Audio</span>
            </button>

            <button
              type="button"
              class={`btn-danger ${confirmDelete ? 'confirm' : ''}`}
              onClick={() => {
                if (confirmDelete) {
                  onDelete(dream.id);
                  onClose();
                } else {
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3000);
                }
              }}
            >
              {confirmDelete ? 'Confirm Delete' : 'Delete Dream'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
