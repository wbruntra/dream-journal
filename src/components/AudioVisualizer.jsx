import { useEffect, useRef } from 'preact/hooks';

export function AudioVisualizer({ recorder, isRecording, isPaused }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      let frequencyData = null;
      let volume = 0;

      if (recorder && isRecording && !isPaused) {
        const audioData = recorder.getAudioData();
        frequencyData = audioData.frequencyData;
        volume = audioData.volume;
      }

      phaseRef.current += isRecording && !isPaused ? 0.08 : 0.02;

      // Draw background dream glow
      const gradGlow = ctx.createRadialGradient(
        width / 2,
        height / 2,
        10,
        width / 2,
        height / 2,
        width / 2
      );
      gradGlow.addColorStop(0, `rgba(168, 85, 247, ${0.12 + volume * 0.25})`);
      gradGlow.addColorStop(0.6, `rgba(56, 189, 248, ${0.05 + volume * 0.15})`);
      gradGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradGlow;
      ctx.fillRect(0, 0, width, height);

      // Draw frequency spectrum bars or wave
      const barsCount = 36;
      const barWidth = Math.max(3, (width / barsCount) - 3);
      const centerY = height / 2;

      for (let i = 0; i < barsCount; i++) {
        const x = (i / barsCount) * width + barWidth / 2;

        let barHeight = 4;
        if (frequencyData && frequencyData.length > 0) {
          const freqIndex = Math.floor((i / barsCount) * (frequencyData.length * 0.75));
          const val = frequencyData[freqIndex] || 0;
          barHeight = Math.max(4, (val / 255) * (height * 0.78));
        } else {
          // Idle gentle dream wave
          const wave = Math.sin(phaseRef.current + i * 0.35) * 6;
          barHeight = 6 + Math.abs(wave);
        }

        // Color gradient for bars (purple -> cyan -> lavender)
        const hue = 260 + (i / barsCount) * 80;
        const alpha = isRecording && !isPaused ? 0.85 + Math.min(0.15, volume) : 0.4;
        
        ctx.fillStyle = `hsla(${hue}, 90%, 72%, ${alpha})`;
        ctx.shadowColor = `hsla(${hue}, 100%, 65%, 0.6)`;
        ctx.shadowBlur = 8;

        // Draw centered rounded bar
        const yTop = centerY - barHeight / 2;
        const radius = Math.min(barWidth / 2, 3);

        ctx.beginPath();
        ctx.roundRect(x - barWidth / 2, yTop, barWidth, barHeight, radius);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [recorder, isRecording, isPaused]);

  return (
    <div class="visualizer-container">
      <canvas
        ref={canvasRef}
        width={320}
        height={90}
        class="visualizer-canvas"
      />
    </div>
  );
}
