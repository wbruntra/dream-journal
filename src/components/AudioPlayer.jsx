import { useState, useRef, useEffect } from 'preact/hooks';
import { formatDuration } from '../utils/formatters';

export function AudioPlayer({ audioBlob, audioUrl: initialUrl, duration = 0, compact = false }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [audioSrc, setAudioSrc] = useState(initialUrl || '');

  const audioRef = useRef(null);

  // Manage Blob to Object URL lifecycle
  useEffect(() => {
    let url = initialUrl;
    let createdUrl = null;

    if (audioBlob) {
      createdUrl = URL.createObjectURL(audioBlob);
      url = createdUrl;
    }

    setAudioSrc(url);

    return () => {
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [audioBlob, initialUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      } else if (duration) {
        setTotalDuration(duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [audioSrc, duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => {
        console.warn('Audio play failed:', err);
      });
    }
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipTime = (offsetSeconds) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, Math.min(totalDuration, audio.currentTime + offsetSeconds));
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const cyclePlaybackRate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const rates = [1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  if (compact) {
    return (
      <div class="audio-player compact">
        <audio ref={audioRef} src={audioSrc} preload="metadata" />
        <button
          type="button"
          class={`play-btn ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="2" />
              <rect x="14" y="4" width="4" height="16" rx="2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>

        <div class="progress-wrap">
          <input
            type="range"
            min="0"
            max={totalDuration || 1}
            step="0.1"
            value={currentTime}
            onInput={handleSeek}
            class="seek-bar"
            style={{ '--progress': `${progressPercent}%` }}
            aria-label="Seek audio"
          />
          <div class="time-readout">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(totalDuration)}</span>
          </div>
        </div>

        <button
          type="button"
          class="rate-btn"
          onClick={cyclePlaybackRate}
          title="Playback speed"
        >
          {playbackRate}x
        </button>
      </div>
    );
  }

  return (
    <div class="audio-player expanded">
      <audio ref={audioRef} src={audioSrc} preload="metadata" />
      
      <div class="player-waveform-bar">
        <input
          type="range"
          min="0"
          max={totalDuration || 1}
          step="0.1"
          value={currentTime}
          onInput={handleSeek}
          class="seek-bar large"
          style={{ '--progress': `${progressPercent}%` }}
          aria-label="Seek audio"
        />
        <div class="time-readout large">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(totalDuration)}</span>
        </div>
      </div>

      <div class="player-controls">
        <button
          type="button"
          class="sec-skip-btn"
          onClick={() => skipTime(-5)}
          title="Rewind 5 seconds"
          aria-label="Rewind 5 seconds"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
          </svg>
          <span>5s</span>
        </button>

        <button
          type="button"
          class={`play-btn large ${isPlaying ? 'playing' : ''}`}
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="2" />
              <rect x="14" y="4" width="4" height="16" rx="2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
              <polygon points="7,4 21,12 7,20" />
            </svg>
          )}
        </button>

        <button
          type="button"
          class="sec-skip-btn"
          onClick={() => skipTime(5)}
          title="Forward 5 seconds"
          aria-label="Forward 5 seconds"
        >
          <span>5s</span>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
          </svg>
        </button>

        <button
          type="button"
          class="rate-btn"
          onClick={cyclePlaybackRate}
          title="Playback speed"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}
