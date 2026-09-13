import { useState, useEffect } from 'preact/hooks';
import { AudioPlayer } from './AudioPlayer';
import { formatDuration, formatRelativeDate, MOODS, getMoodDetails, downloadBlob } from '../utils/formatters';
import { hasApiKey, transcribeDreamAudio, illustrateDream } from '../services/openrouter';

export function DreamDetailModal({ dream, isOpen, onClose, onUpdate, onDelete, onOpenSettings }) {
  if (!isOpen || !dream) return null;

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(dream.title || '');
  const [notes, setNotes] = useState(dream.notes || '');
  const [mood, setMood] = useState(dream.mood || 'mystical');
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState(null);
  const [isIllustrating, setIsIllustrating] = useState(false);
  const [illustrateError, setIllustrateError] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  useEffect(() => {
    setTitle(dream.title || '');
    setNotes(dream.notes || '');
    setMood(dream.mood || 'mystical');
    setHasChanges(false);
    setConfirmDelete(false);
    setTranscribeError(null);
    setIllustrateError(null);
  }, [dream]);

  // Manage Blob -> Object URL lifecycle for the illustration preview
  useEffect(() => {
    if (!dream.imageBlob) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(dream.imageBlob);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [dream.imageBlob]);

  const handleTranscribe = async () => {
    if (!hasApiKey()) {
      onClose();
      onOpenSettings();
      return;
    }
    setIsTranscribing(true);
    setTranscribeError(null);
    try {
      const transcript = await transcribeDreamAudio(dream.audioBlob, dream.mimeType);
      await onUpdate(dream.id, { transcript });
    } catch (err) {
      console.error('Transcription failed:', err);
      setTranscribeError(err.message || 'Transcription failed.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleIllustrate = async () => {
    if (!hasApiKey()) {
      onClose();
      onOpenSettings();
      return;
    }
    setIsIllustrating(true);
    setIllustrateError(null);
    try {
      const dreamText = dream.transcript || dream.notes;
      const { imageBlob } = await illustrateDream(dreamText);
      await onUpdate(dream.id, { imageBlob });
    } catch (err) {
      console.error('Illustration generation failed:', err);
      setIllustrateError(err.message || 'Illustration generation failed.');
    } finally {
      setIsIllustrating(false);
    }
  };

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

          {/* AI Illustration */}
          {imagePreviewUrl && (
            <div class="detail-illustration-wrap">
              <img src={imagePreviewUrl} alt={`AI illustration of: ${dream.title}`} class="detail-illustration-img" />
            </div>
          )}

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

          {/* AI Enhancements (OpenRouter) */}
          <div class="enhancements-section">
            <h4 class="enhancements-heading">
              <span>✨ AI Enhancements</span>
              <button
                type="button"
                class="settings-shortcut-btn"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
              >
                {hasApiKey() ? 'Manage OpenRouter Key' : 'Setup OpenRouter Key'}
              </button>
            </h4>

            <div class="enhancement-cards-grid">
              {/* Transcription */}
              <div class="enhancement-card column">
                <div class="enhancement-card-row">
                  <div class="card-icon-tag">🎙️</div>
                  <div class="card-text">
                    <div class="card-header-line">
                      <span class="card-title">AI Voice Transcription</span>
                      {dream.transcript && <span class="planned-pill active">Done</span>}
                    </div>
                    <p class="card-desc">
                      Transcribe your voice memo into searchable text using {' '}
                      <code class="model-tag">microsoft/mai-transcribe-2</code>.
                    </p>
                  </div>
                </div>

                {dream.transcript && (
                  <p class="transcript-text">{dream.transcript}</p>
                )}

                {transcribeError && <p class="ai-error-text">{transcribeError}</p>}

                <button
                  type="button"
                  class="btn-secondary outline small full-width"
                  onClick={handleTranscribe}
                  disabled={isTranscribing || !dream.audioBlob}
                >
                  {isTranscribing
                    ? 'Transcribing…'
                    : dream.transcript
                      ? 'Re-transcribe'
                      : 'Transcribe with AI'}
                </button>
              </div>

              {/* Illustration */}
              <div class="enhancement-card column">
                <div class="enhancement-card-row">
                  <div class="card-icon-tag">🎨</div>
                  <div class="card-text">
                    <div class="card-header-line">
                      <span class="card-title">Dream Scene Illustration</span>
                      {dream.imageBlob && <span class="planned-pill active">Done</span>}
                    </div>
                    <p class="card-desc">
                      Paints an evocative scene from your dream via {' '}
                      <code class="model-tag">~openai/gpt-luna-latest</code> and{' '}
                      <code class="model-tag">openai/gpt-image-2.5-sunburst</code>.
                    </p>
                  </div>
                </div>

                {illustrateError && <p class="ai-error-text">{illustrateError}</p>}

                <button
                  type="button"
                  class="btn-secondary outline small full-width"
                  onClick={handleIllustrate}
                  disabled={isIllustrating || (!dream.transcript && !dream.notes)}
                  title={
                    !dream.transcript && !dream.notes
                      ? 'Transcribe the dream or add notes first'
                      : undefined
                  }
                >
                  {isIllustrating
                    ? 'Painting…'
                    : dream.imageBlob
                      ? 'Regenerate Illustration'
                      : 'Generate Illustration'}
                </button>
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
