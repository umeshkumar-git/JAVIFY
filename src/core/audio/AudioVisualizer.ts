/**
 * Real-time 60fps Canvas Spectrum Visualizer Engine.
 * Renders high-resolution mirrored frequency bars and audio reactive glow
 * using Web Audio AnalyserNode frequency bins.
 */
export class AudioVisualizerRenderer {
  private rafId: number | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly analyser: AnalyserNode
  ) {
    this.frequencyData = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
  }

  public start(): void {
    this.stop();
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    const renderFrame = () => {
      if (!this.frequencyData) return;
      this.analyser.getByteFrequencyData(this.frequencyData);

      const width = this.canvas.width;
      const height = this.canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Number of visualizer bars to draw across width
      const barCount = 48;
      const step = Math.floor(this.frequencyData.length / barCount);
      const barWidth = (width / barCount) - 2;

      // Create neon gradient
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, "rgba(6, 182, 212, 0.4)"); // Cyan
      gradient.addColorStop(0.5, "rgba(168, 85, 247, 0.85)"); // Violet
      gradient.addColorStop(1, "rgba(236, 72, 153, 1)"); // Hot pink

      ctx.fillStyle = gradient;

      for (let i = 0; i < barCount; i++) {
        // Average sample value in the bin
        let sum = 0;
        for (let j = 0; j < step; j++) {
          sum += this.frequencyData[i * step + j] || 0;
        }
        const avg = sum / step;
        const normalized = avg / 255;
        const barHeight = Math.max(3, normalized * height * 0.95);

        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Rounded top bars
        const radius = Math.min(barWidth / 2, 4);
        ctx.beginPath();
        ctx.moveTo(x, y + radius);
        ctx.lineTo(x, height);
        ctx.lineTo(x + barWidth, height);
        ctx.lineTo(x + barWidth, y + radius);
        ctx.arcTo(x + barWidth, y, x, y, radius);
        ctx.arcTo(x, y, x, y + radius, radius);
        ctx.closePath();
        ctx.fill();
      }

      this.rafId = requestAnimationFrame(renderFrame);
    };

    this.rafId = requestAnimationFrame(renderFrame);
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
