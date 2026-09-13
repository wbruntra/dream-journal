/**
 * Audio Recording Service for Dream Journal
 * Handles microphone capture, MediaRecorder with cross-browser MIME types,
 * and Web Audio API real-time frequency analysis for visualizations.
 */

// Speech doesn't need music-grade bitrate: Opus at 24 kbps mono is well above
// what's needed for clearly intelligible voice, and keeps a 5-minute dream
// recording to roughly 1MB instead of the ~5MB a default 128kbps encode would use.
export const VOICE_BITRATE = 24000;

export function getBestMimeType() {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
    return '';
  }

  const preferredTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus'
  ];

  for (const type of preferredTypes) {
    if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return ''; // Default browser format
}

export class AudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.stream = null;
    this.audioChunks = [];
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.mimeType = '';
    this.startTime = 0;
    this.pausedTime = 0;
    this.totalPausedDuration = 0;
    this.isRecording = false;
    this.isPaused = false;
    this.timerInterval = null;
    this.elapsedSeconds = 0;
    this.onTick = null;
    this.onStateChange = null;
  }

  /**
   * Request microphone permission and start recording
   */
  async start({ onTick = null, onStateChange = null } = {}) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access is not supported on this browser or device.');
    }

    this.onTick = onTick;
    this.onStateChange = onStateChange;
    this.audioChunks = [];
    this.totalPausedDuration = 0;

    // Request audio stream with echo cancellation and noise suppression.
    // Mono is plenty for a single speaker and halves the raw PCM the encoder
    // has to work with before it even gets to bitrate.
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      }
    });

    // Initialize Web Audio API analyser for live audio visualizer
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
        this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 128;
        this.analyser.smoothingTimeConstant = 0.8;
        this.sourceNode.connect(this.analyser);
      }
    } catch (err) {
      console.warn('Web Audio visualizer setup failed (audio recording will still work):', err);
    }

    this.mimeType = getBestMimeType();
    const options = {
      ...(this.mimeType ? { mimeType: this.mimeType } : {}),
      audioBitsPerSecond: VOICE_BITRATE
    };

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, options);
    } catch (e) {
      console.warn('Fallback: MediaRecorder initialization without options', e);
      this.mediaRecorder = new MediaRecorder(this.stream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // Collect data every 500ms so data is available progressively
    this.mediaRecorder.start(500);
    this.isRecording = true;
    this.isPaused = false;
    this.startTime = Date.now();
    this.elapsedSeconds = 0;

    this.timerInterval = setInterval(() => {
      if (this.isRecording && !this.isPaused) {
        const currentElapsed = (Date.now() - this.startTime - this.totalPausedDuration) / 1000;
        this.elapsedSeconds = Math.max(0, currentElapsed);
        if (this.onTick) {
          this.onTick(this.elapsedSeconds);
        }
      }
    }, 100);

    if (this.onStateChange) {
      this.onStateChange({ isRecording: true, isPaused: false });
    }
  }

  /**
   * Get current real-time frequency data and volume for visualizer
   * Returns array of numbers [0..255] and volume level [0..1]
   */
  getAudioData() {
    if (!this.analyser) {
      return { frequencyData: new Uint8Array(32), volume: 0 };
    }
    const bufferLength = this.analyser.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(frequencyData);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += frequencyData[i];
    }
    const volume = Math.min(1, (sum / bufferLength) / 128);

    return { frequencyData, volume };
  }

  /**
   * Pause recording
   */
  pause() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.isPaused = true;
      this.pausedTime = Date.now();
      if (this.onStateChange) {
        this.onStateChange({ isRecording: true, isPaused: true });
      }
    }
  }

  /**
   * Resume recording
   */
  resume() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.totalPausedDuration += Date.now() - this.pausedTime;
      this.mediaRecorder.resume();
      this.isPaused = false;
      if (this.onStateChange) {
        this.onStateChange({ isRecording: true, isPaused: false });
      }
    }
  }

  /**
   * Finish and return the recorded audio blob & metadata
   */
  stop() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.cleanup();
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const finalDuration = this.elapsedSeconds;
        const actualMimeType = this.mediaRecorder.mimeType || this.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: actualMimeType });

        this.cleanup();
        resolve({
          blob,
          duration: Math.round(finalDuration * 10) / 10,
          mimeType: actualMimeType
        });
      };

      this.mediaRecorder.stop();
      this.isRecording = false;
      this.isPaused = false;
    });
  }

  /**
   * Cancel and discard current recording
   */
  cancel() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.onstop = null;
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
    }
    this.cleanup();
  }

  /**
   * Clean up hardware media streams and AudioContext
   */
  cleanup() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (e) {}
      this.sourceNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }

    this.analyser = null;
    this.isRecording = false;
    this.isPaused = false;
    this.audioChunks = [];

    if (this.onStateChange) {
      this.onStateChange({ isRecording: false, isPaused: false });
    }
  }
}
