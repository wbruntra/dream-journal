import { useState, useEffect } from 'preact/hooks';
import { getStorageStats, requestStoragePersistence } from '../services/db';

export function SettingsModal({ isOpen, onClose, installPromptEvent, onTriggerInstall, dreams = [] }) {
  if (!isOpen) return null;

  const [stats, setStats] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [persisting, setPersisting] = useState(false);

  useEffect(() => {
    loadStats();
    const savedKey = localStorage.getItem('dream_openrouter_api_key') || '';
    setApiKey(savedKey);
  }, []);

  const loadStats = async () => {
    try {
      const data = await getStorageStats();
      setStats(data);
    } catch (e) {
      console.warn('Could not load storage stats:', e);
    }
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('dream_openrouter_api_key', apiKey.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleRequestPersistence = async () => {
    setPersisting(true);
    await requestStoragePersistence();
    await loadStats();
    setPersisting(false);
  };

  const handleExportBackup = () => {
    const exportData = dreams.map((d) => ({
      id: d.id,
      title: d.title,
      createdAt: d.createdAt,
      dateString: new Date(d.createdAt).toISOString(),
      durationSeconds: d.duration,
      mood: d.mood,
      notes: d.notes,
      mimeType: d.mimeType
    }));

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dream-journal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div class="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal-sheet settings-sheet" role="dialog" aria-modal="true" aria-label="Settings and Storage">
        
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-badge">⚙️ Preferences</span>
            <h2 class="modal-title">Settings & Storage</h2>
          </div>
          <button
            type="button"
            class="close-icon-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div class="settings-body">
          
          {/* Section 1: PWA Installation */}
          <section class="settings-card">
            <div class="settings-card-header">
              <span class="settings-icon">📱</span>
              <div>
                <h3 class="settings-card-title">Install App on Your Phone</h3>
                <p class="settings-card-subtitle">
                  Enjoy an offline full-screen experience directly from your home screen.
                </p>
              </div>
            </div>

            {installPromptEvent ? (
              <button
                type="button"
                class="btn-primary full-width"
                onClick={onTriggerInstall}
              >
                Install Dream Journal App
              </button>
            ) : (
              <div class="install-guide-box">
                <div class="guide-step">
                  <strong>iOS Safari:</strong> Tap the <span class="action-highlight">Share</span> icon (square with arrow up), scroll down and tap <span class="action-highlight">"Add to Home Screen"</span>.
                </div>
                <div class="guide-step">
                  <strong>Android Chrome:</strong> Tap the <span class="action-highlight">three dots (⋮)</span> menu and select <span class="action-highlight">"Install App"</span> or "Add to Home screen".
                </div>
              </div>
            )}
          </section>

          {/* Section 2: Storage Status & Persistence */}
          <section class="settings-card">
            <div class="settings-card-header">
              <span class="settings-icon">💾</span>
              <div>
                <h3 class="settings-card-title">Device Storage & Safety</h3>
                <p class="settings-card-subtitle">
                  All audio and journal notes are saved offline in your browser's IndexedDB.
                </p>
              </div>
            </div>

            <div class="storage-stats-grid">
              <div class="stat-box">
                <span class="stat-number">{stats?.totalDreams ?? dreams.length}</span>
                <span class="stat-label">Recorded Dreams</span>
              </div>
              <div class="stat-box">
                <span class="stat-number">{formatBytes(stats?.totalAudioBytes)}</span>
                <span class="stat-label">Audio Used</span>
              </div>
              <div class="stat-box">
                <span class="stat-number">
                  {stats?.isPersisted ? '✓ Active' : 'Standard'}
                </span>
                <span class="stat-label">Persistence</span>
              </div>
            </div>

            {!stats?.isPersisted && (
              <button
                type="button"
                class="btn-secondary outline full-width"
                onClick={handleRequestPersistence}
                disabled={persisting}
              >
                {persisting ? 'Requesting...' : 'Request Persistent Storage'}
              </button>
            )}

            <button
              type="button"
              class="btn-secondary full-width"
              onClick={handleExportBackup}
            >
              Export Journal Metadata (JSON)
            </button>
          </section>

          {/* Section 3: Future AI Enhancement - OpenRouter Key */}
          <section class="settings-card highlight">
            <div class="settings-card-header">
              <span class="settings-icon">✨</span>
              <div>
                <div class="card-title-row">
                  <h3 class="settings-card-title">OpenRouter API Key</h3>
                  <span class="planned-pill">Future Enhancements</span>
                </div>
                <p class="settings-card-subtitle">
                  Configure your key for upcoming AI transcription and dream illustration features.
                </p>
              </div>
            </div>

            <div class="api-key-input-wrap">
              <input
                type={showKey ? 'text' : 'password'}
                class="text-input font-mono"
                value={apiKey}
                onInput={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                class="key-toggle-btn"
                onClick={() => setShowKey(!showKey)}
                title={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>

            <div class="api-key-actions">
              <button
                type="button"
                class="btn-primary small"
                onClick={handleSaveApiKey}
              >
                {saveSuccess ? 'Saved ✓' : 'Save Key'}
              </button>
              {apiKey && (
                <button
                  type="button"
                  class="btn-secondary small"
                  onClick={() => {
                    setApiKey('');
                    localStorage.removeItem('dream_openrouter_api_key');
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            <p class="privacy-note">
              🔒 <strong>Privacy first:</strong> Your key is stored solely on your local device. It will be used in future versions to call OpenRouter for speech-to-text transcription and dream scene art.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
