import { useState, useRef, useEffect } from 'preact/hooks';
import { AudioRecorder } from '../services/audioRecorder';
import { AudioVisualizer } from './AudioVisualizer';
import { AudioPlayer } from './AudioPlayer';
import { formatDuration, getDefaultDreamTitle, MOODS } from '../utils/formatters';

export function RecordModal({ isOpen, onClose, onSaveDream }) {
  // Steps: 'idle', 'recording', 'review', 'saving'
  const [step, setStep] = useState('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [micError, setMicError] = useState(null);

  // Review step data
  const [recordedData, setRecordedData] = useState(null); // { blob, duration, mimeType }
  const [title, setTitle] = useState('');
  const [selectedMood, setSelectedMood] = useState('mystical');
  const [notes, setNotes] = useState('');

  const recorderRef = useRef(null);

  // Initialize or reset when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep('idle');
      setElapsedSeconds(0);
      setIsPaused(false);
      setMicError(null);
      setRecordedData(null);
      setTitle(getDefaultDreamTitle());
      setSelectedMood('mystical');
      setNotes('');
    } else {
      if (recorderRef.current) {
        recorderRef.current.cancel();
        recorderRef.current = null;
      }
    }
  }, [isOpen]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current) {
        recorderRef.current.cancel();
      }
    };
  }, []);

  const handleStartRecording = async () => {
    try {
      setMicError(null);
      const recorder = new AudioRecorder();
      recorderRef.current = recorder;

      await recorder.start({
        onTick: (seconds) => {
          setElapsedSeconds(seconds);
        },
        onStateChange: ({ isPaused }) => {
          setIsPaused(isPaused);
        }
      });

      setStep('recording');
    } catch (err) {
      console.error('Microphone access failed:', err);
      let msg = 'Could not access microphone. Please grant microphone permissions in your browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Microphone permission denied. Please allow microphone access in your browser settings to record your dream memo.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No microphone device found on this system.';
      }
      setMicError(msg);
      setStep('idle');
    }
  };

  const handlePauseResume = () => {
    if (!recorderRef.current) return;
    if (isPaused) {
      recorderRef.current.resume();
    } else {
      recorderRef.current.pause();
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current) return;
    const result = await recorderRef.current.stop();
    if (result && result.blob) {
      setRecordedData(result);
      setStep('review');
    } else {
      setStep('idle');
    }
  };

  const handleCancelRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.cancel();
      recorderRef.current = null;
    }
    setStep('idle');
    setElapsedSeconds(0);
  };

  const handleSave = async () => {
    if (!recordedData || !recordedData.blob) return;

    setStep('saving');
    try {
      await onSaveDream({
        title: title.trim() || getDefaultDreamTitle(),
        audioBlob: recordedData.blob,
        duration: recordedData.duration,
        mimeType: recordedData.mimeType,
        mood: selectedMood,
        notes: notes.trim(),
        createdAt: Date.now()
      });
      onClose();
    } catch (err) {
      console.error('Failed to save dream:', err);
      setMicError('Failed to save dream to local database: ' + err.message);
      setStep('review');
    }
  };

  if (!isOpen) return null;

  // Max recommended duration is 120 seconds (2 minutes)
  const progressToTwoMin = Math.min(100, (elapsedSeconds / 120) * 100);

  return (
    <div class="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && step !== 'recording') onClose(); }}>
      <div class="modal-sheet recording-sheet" role="dialog" aria-modal="true" aria-label="Record Dream Memo">
        
        {/* Modal Top Bar */}
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-badge">
              {step === 'recording' ? '🔴 Recording' : step === 'review' ? '✨ Review Dream' : '🎙️ Dream Voice Memo'}
            </span>
            <h2 class="modal-title">
              {step === 'review' ? 'Save Dream Memo' : 'Speak Your Dream'}
            </h2>
          </div>
          {step !== 'recording' && (
            <button
              type="button"
              class="close-icon-btn"
              onClick={onClose}
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {micError && (
          <div class="error-banner">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{micError}</span>
          </div>
        )}

        {/* STEP 1: IDLE / READY TO RECORD */}
        {step === 'idle' && (
          <div class="record-idle-view">
            <p class="record-intro-text">
              Speak while the memories are still fresh. A 1 to 2 minute memo is ideal to capture vivid scenes, people, and feelings before they slip away.
            </p>

            <div class="record-button-stage">
              <div class="record-ring-ambient"></div>
              <button
                type="button"
                class="record-action-trigger"
                onClick={handleStartRecording}
                aria-label="Start recording dream memo"
              >
                <div class="mic-glow-circle">
                  <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </div>
                <span class="trigger-label">Tap to Record</span>
              </button>
            </div>

            <div class="quick-hints">
              <div class="hint-item">
                <span class="hint-icon">🌙</span>
                <span>Saved locally to your device</span>
              </div>
              <div class="hint-item">
                <span class="hint-icon">⏳</span>
                <span>1-2 minutes recommended</span>
              </div>
              <div class="hint-item">
                <span class="hint-icon">📡</span>
                <span>Works completely offline</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ACTIVE RECORDING */}
        {step === 'recording' && (
          <div class="record-active-view">
            <div class="timer-display-wrap">
              <div class="live-timer">{formatDuration(elapsedSeconds)}</div>
              <div class="timer-target-subtext">
                {elapsedSeconds < 120
                  ? `Goal: 1-2 min (${Math.max(0, 120 - Math.floor(elapsedSeconds))}s remaining)`
                  : 'Great detail captured! Tap stop when ready.'}
              </div>
            </div>

            {/* Target duration progress bar */}
            <div class="duration-progress-bar-wrap" title="Progress towards recommended 2 min">
              <div
                class="duration-progress-bar"
                style={{ width: `${progressToTwoMin}%` }}
              ></div>
            </div>

            {/* Live Web Audio frequency visualizer */}
            <AudioVisualizer
              recorder={recorderRef.current}
              isRecording={step === 'recording'}
              isPaused={isPaused}
            />

            {/* In-recording Controls */}
            <div class="recording-controls-row">
              <button
                type="button"
                class="control-btn cancel"
                onClick={handleCancelRecording}
                title="Discard recording"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>Discard</span>
              </button>

              <button
                type="button"
                class="control-btn pause"
                onClick={handlePauseResume}
                title={isPaused ? 'Resume recording' : 'Pause recording'}
              >
                {isPaused ? (
                  <>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <polygon points="6,4 20,12 6,20" />
                    </svg>
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16" rx="1" />
                      <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                type="button"
                class="control-btn stop-finish"
                onClick={handleStopRecording}
                title="Finish recording"
              >
                <div class="stop-sq"></div>
                <span>Done</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & SAVE */}
        {(step === 'review' || step === 'saving') && recordedData && (
          <div class="record-review-view">
            <div class="review-audio-box">
              <span class="review-meta-pill">
                Memo Duration: {formatDuration(recordedData.duration)}
              </span>
              <AudioPlayer
                audioBlob={recordedData.blob}
                duration={recordedData.duration}
                compact={false}
              />
            </div>

            <div class="form-group">
              <label for="dream-title-input" class="form-label">
                Dream Title
              </label>
              <input
                id="dream-title-input"
                type="text"
                class="text-input"
                value={title}
                onInput={(e) => setTitle(e.target.value)}
                placeholder="Give your dream a title..."
                autoFocus
              />
            </div>

            <div class="form-group">
              <label class="form-label">Dream Vibe / Mood</label>
              <div class="mood-chips-row">
                {MOODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    class={`mood-chip ${selectedMood === m.id ? 'active' : ''}`}
                    onClick={() => setSelectedMood(m.id)}
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

            <div class="form-group">
              <label for="dream-notes-input" class="form-label">
                Quick Notes or Key Symbols (Optional)
              </label>
              <textarea
                id="dream-notes-input"
                class="text-area"
                rows="3"
                value={notes}
                onInput={(e) => setNotes(e.target.value)}
                placeholder="Recurring symbols, people, emotions, weird physics..."
              ></textarea>
            </div>

            <div class="review-action-buttons">
              <button
                type="button"
                class="btn-secondary"
                onClick={() => setStep('idle')}
                disabled={step === 'saving'}
              >
                Re-record
              </button>
              <button
                type="button"
                class="btn-primary"
                onClick={handleSave}
                disabled={step === 'saving'}
              >
                {step === 'saving' ? 'Saving to phone...' : 'Save Dream to Journal'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
