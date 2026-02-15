/**
 * Label Toggle Demo — N=10 particles with toggleable labels.
 * Shows the difference between labeled (colored, numbered) and unlabeled data.
 */
import { ParticleSystem } from '../sim/euler-maruyama';
import { QuadraticConfinement, PiecewiseInteraction } from '../sim/potentials';

const canvas = document.getElementById('label-demo-canvas') as HTMLCanvasElement;
if (canvas) {
  const ctx = canvas.getContext('2d')!;
  const N = 10;
  const d = 2;

  // Model A potentials
  const V = new QuadraticConfinement(-1.0, 2.0);
  const Phi = new PiecewiseInteraction(-3.0, 2.0);
  const system = new ParticleSystem(V, Phi, 0.1, 0.005, N, d, 42);
  const state = system.initialize(0.8);

  // Colors for labeled mode
  const COLORS = [
    '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
  ];
  const UNLABELED_COLOR = '#3b82f6';

  let labeled = true;

  // Toggle buttons
  const toggleBtns = canvas.closest('.demo-container')?.querySelectorAll('.toggle-btn');
  toggleBtns?.forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      labeled = (btn as HTMLElement).dataset.mode === 'labeled';
    });
  });

  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  function worldToScreen(x: number, y: number, w: number, h: number): [number, number] {
    // Map from ~[-2, 2] to canvas coords
    const scale = Math.min(w, h) / 5;
    return [w / 2 + x * scale, h / 2 - y * scale];
  }

  function draw() {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    ctx.clearRect(0, 0, w, h);

    // Step simulation
    system.step(state);

    const pos = state.positions;

    // Draw trails (faint)
    // (Skip for simplicity — particles are enough)

    // Draw particles
    const radius = labeled ? 16 : 12;
    for (let i = 0; i < N; i++) {
      const [sx, sy] = worldToScreen(pos[i * 2], pos[i * 2 + 1], w, h);
      const color = labeled ? COLORS[i] : UNLABELED_COLOR;

      // Glow
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = labeled
        ? `${color}22`
        : 'rgba(59, 130, 246, 0.08)';
      ctx.fill();

      // Main circle
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = labeled ? 1.0 : 0.6;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      // Label
      if (labeled) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, sx, sy);
      }
    }

    // Draw connecting lines in labeled mode
    if (labeled) {
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const [x1, y1] = worldToScreen(pos[i * 2], pos[i * 2 + 1], w, h);
          const [x2, y2] = worldToScreen(pos[j * 2], pos[j * 2 + 1], w, h);
          const dx = pos[i * 2] - pos[j * 2];
          const dy = pos[i * 2 + 1] - pos[j * 2 + 1];
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r < 1.5) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 * (1 - r / 1.5)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
}
