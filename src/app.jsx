import { useState, useEffect, useMemo } from 'preact/hooks';
import { getAllDreams, saveDream, updateDream, deleteDream, requestStoragePersistence } from './services/db';
import { RecordModal } from './components/RecordModal';
import { DreamCard } from './components/DreamCard';
import { DreamDetailModal } from './components/DreamDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { MOODS } from './utils/formatters';
import './app.css';

export function App() {
  const [dreams, setDreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState('all');
  
  // Modals
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDream, setSelectedDream] = useState(null);

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Load dreams from IndexedDB on startup
  useEffect(() => {
    loadDreams();
    requestStoragePersistence().catch(() => {});

    // Check if installed as standalone PWA
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    // Capture PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle PWA shortcut ?action=record
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'record') {
      setIsRecordOpen(true);
      // Clean query param from URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const loadDreams = async () => {
    try {
      setLoading(true);
      const list = await getAllDreams();
      setDreams(list);
    } catch (e) {
      console.error('Failed to load dreams from IndexedDB:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewDream = async (dreamData) => {
    const saved = await saveDream(dreamData);
    // Refresh list
    await loadDreams();
    return saved;
  };

  const handleUpdateDream = async (id, updates) => {
    const updated = await updateDream(id, updates);
    setDreams((prev) => prev.map((d) => (d.id === id ? updated : d)));
    if (selectedDream && selectedDream.id === id) {
      setSelectedDream(updated);
    }
    return updated;
  };

  const handleDeleteDream = async (id) => {
    await deleteDream(id);
    setDreams((prev) => prev.filter((d) => d.id !== id));
    if (selectedDream && selectedDream.id === id) {
      setSelectedDream(null);
    }
  };

  const handleTriggerInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  };

  // Filtered dreams based on search & mood filter
  const filteredDreams = useMemo(() => {
    return dreams.filter((dream) => {
      const matchesMood = moodFilter === 'all' || dream.mood === moodFilter;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        dream.title?.toLowerCase().includes(query) ||
        dream.notes?.toLowerCase().includes(query);
      return matchesMood && matchesSearch;
    });
  }, [dreams, moodFilter, searchQuery]);

  return (
    <div class="dream-app-container">
      {/* Background ambient stars & celestial nebula */}
      <div class="celestial-bg" aria-hidden="true">
        <div class="stars-layer"></div>
        <div class="nebula-blob one"></div>
        <div class="nebula-blob two"></div>
      </div>

      {/* Top Application Bar */}
      <header class="app-header">
        <div class="header-brand">
          <div class="brand-logo-icon">
            <svg viewBox="0 0 512 512" width="28" height="28" fill="none">
              <path
                d="M280 130 C200 130 135 195 135 275 C135 355 200 420 280 420 C325 420 365 399 390 367 C305 380 230 310 230 225 C230 178 252 142 280 130 Z"
                fill="url(#headerMoon)"
              />
              <defs>
                <linearGradient id="headerMoon" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#ffffff" />
                  <stop offset="50%" stop-color="#c4b5fd" />
                  <stop offset="100%" stop-color="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <h1 class="brand-title">Dream Journal</h1>
            <span class="brand-badge">Voice Memos</span>
          </div>
        </div>

        <div class="header-actions">
          {installPrompt && !isInstalled && (
            <button
              type="button"
              class="install-app-pill"
              onClick={handleTriggerInstall}
              title="Install app to home screen"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Install App</span>
            </button>
          )}

          <button
            type="button"
            class="icon-button settings-btn"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Settings and Storage"
            title="Settings & Storage"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Journal Dashboard */}
      <main class="app-main-content">
        
        {/* Banner Section */}
        <section class="journal-hero-banner">
          <div class="banner-text">
            <h2 class="banner-heading">Your Dream Vault</h2>
            <p class="banner-sub">
              {dreams.length === 0
                ? 'Capture dreams the instant you wake up before they fade.'
                : `${dreams.length} recorded dream ${dreams.length === 1 ? 'memory' : 'memories'} stored offline.`}
            </p>
          </div>

          <button
            type="button"
            class="hero-record-cta"
            onClick={() => setIsRecordOpen(true)}
          >
            <div class="cta-mic-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </div>
            <span>Record New Dream</span>
          </button>
        </section>

        {/* Search & Filter Bar */}
        {dreams.length > 0 && (
          <section class="filter-controls-section">
            <div class="search-input-wrap">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                class="search-input"
                placeholder="Search dreams by title or keyword..."
                value={searchQuery}
                onInput={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  class="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div class="mood-filter-scroll">
              <button
                type="button"
                class={`filter-chip ${moodFilter === 'all' ? 'active' : ''}`}
                onClick={() => setMoodFilter('all')}
              >
                All Dreams ({dreams.length})
              </button>
              {MOODS.map((m) => {
                const count = dreams.filter((d) => d.mood === m.id).length;
                if (count === 0 && moodFilter !== m.id) return null;
                return (
                  <button
                    key={m.id}
                    type="button"
                    class={`filter-chip ${moodFilter === m.id ? 'active' : ''}`}
                    onClick={() => setMoodFilter(moodFilter === m.id ? 'all' : m.id)}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                    <span class="filter-count">({count})</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Dreams List */}
        <section class="dreams-stream-section">
          {loading ? (
            <div class="loading-state">
              <div class="dream-spinner"></div>
              <p>Opening your journal...</p>
            </div>
          ) : dreams.length === 0 ? (
            <div class="empty-journal-state">
              <div class="empty-starry-icon">
                <svg viewBox="0 0 120 120" width="80" height="80" fill="none">
                  <circle cx="60" cy="60" r="56" stroke="#4c1d95" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.5" />
                  <path
                    d="M66 32 C48 32 34 46 34 64 C34 82 48 96 66 96 C76 96 85 91 91 84 C72 87 55 71 55 52 C55 42 60 34 66 32 Z"
                    fill="url(#emptyMoon)"
                  />
                  <path d="M88 35 Q88 43 96 43 Q88 43 88 51 Q88 43 80 43 Q88 43 88 35 Z" fill="#93c5fd" />
                  <defs>
                    <linearGradient id="emptyMoon" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#c4b5fd" />
                      <stop offset="100%" stop-color="#7c3aed" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h3 class="empty-title">Your journal is waiting</h3>
              <p class="empty-desc">
                Leave a voice recording when you wake up. Speak for a minute or two to preserve details before they slip away. Everything is saved safely on your phone.
              </p>
              <button
                type="button"
                class="btn-primary"
                onClick={() => setIsRecordOpen(true)}
              >
                Record Your First Dream
              </button>
            </div>
          ) : filteredDreams.length === 0 ? (
            <div class="no-results-state">
              <p>No dreams match your search or filter.</p>
              <button
                type="button"
                class="btn-secondary small"
                onClick={() => {
                  setSearchQuery('');
                  setMoodFilter('all');
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div class="dreams-grid">
              {filteredDreams.map((dream) => (
                <DreamCard
                  key={dream.id}
                  dream={dream}
                  onSelect={setSelectedDream}
                  onDelete={handleDeleteDream}
                />
              ))}
            </div>
          )}
        </section>

      </main>

      {/* Floating Action Button (FAB) for Instant Record */}
      <div class="fab-container">
        <button
          type="button"
          class="fab-record-button"
          onClick={() => setIsRecordOpen(true)}
          aria-label="Create new dream voice memo"
          title="Record Dream"
        >
          <div class="fab-glow-pulse"></div>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        </button>
      </div>

      {/* Modals */}
      <RecordModal
        isOpen={isRecordOpen}
        onClose={() => setIsRecordOpen(false)}
        onSaveDream={handleSaveNewDream}
      />

      <DreamDetailModal
        dream={selectedDream}
        isOpen={!!selectedDream}
        onClose={() => setSelectedDream(null)}
        onUpdate={handleUpdateDream}
        onDelete={handleDeleteDream}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        installPromptEvent={installPrompt}
        onTriggerInstall={handleTriggerInstall}
        dreams={dreams}
      />
    </div>
  );
}
