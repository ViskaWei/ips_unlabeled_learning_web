/**
 * Label Toggle Demo — N=10 particles with toggleable labels.
 * Uses Model B (Double-Well + Inverse) for more dynamic motion and overlap.
 * Shows the difference between labeled (colored, numbered) and unlabeled data.
 */
import { ParticleSystem } from '../sim/euler-maruyama';
import { DoubleWellPotential, InverseInteraction } from '../sim/potentials';

const canvas = document.getElementById('label-demo-canvas') as HTMLCanvasElement;
if (canvas) {
  const ctx = canvas.getContext('2d')!;
  const N = 10;
  const d = 2;

  // Model B: double-well V + inverse interaction Phi
  // Particles orbit the |x|=1 ring, cluster, and frequently overlap
  const V = new DoubleWellPotential();
  const Phi = new InverseInteraction(0.5);
  const system = new ParticleSystem(V, Phi, 0.15, 0.008, N, d, 42);
  const state = system.initialize(1.0);

  // Run a few hundred warmup steps so particles settle onto the ring
  for (let i = 0; i < 300; i++) system.step(state);

  // Trail history: store last K positions per particle
  const TRAIL_LEN = 25;
  const trails: Float64Array[] = [];

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
    const scale = Math.min(w, h) / 5.5;
    return [w / 2 + x * scale, h / 2 - y * scale];
  }

  function draw() {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;

    ctx.clearRect(0, 0, w, h);

    // Step simulation (multiple substeps for smoother motion)
    for (let s = 0; s < 3; s++) system.step(state);

    // Record trail
    trails.push(new Float64Array(state.positions));
    if (trails.length > TRAIL_LEN) trails.shift();

    const pos = state.positions;

    // Draw double-well ring hint (faint circle at |x|=1)
    const [cx, cy] = worldToScreen(0, 0, w, h);
    const ringR = Math.min(w, h) / 5.5; // scale matches worldToScreen
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw trails
    if (labeled && trails.length > 2) {
      for (let i = 0; i < N; i++) {
        ctx.beginPath();
        for (let t = 0; t < trails.length; t++) {
          const [tx, ty] = worldToScreen(trails[t][i * 2], trails[t][i * 2 + 1], w, h);
          if (t === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        }
        ctx.strokeStyle = COLORS[i] + '30'; // 19% opacity
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Draw connecting lines in labeled mode (show who interacts)
    if (labeled) {
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pos[i * 2] - pos[j * 2];
          const dy = pos[i * 2 + 1] - pos[j * 2 + 1];
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r < 1.2) {
            const [x1, y1] = worldToScreen(pos[i * 2], pos[i * 2 + 1], w, h);
            const [x2, y2] = worldToScreen(pos[j * 2], pos[j * 2 + 1], w, h);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.12 * (1 - r / 1.2)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }

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

      // Label number
      if (labeled) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${i + 1}`, sx, sy);
      }
    }

    // In unlabeled mode, show a hint about ambiguity when particles overlap
    if (!labeled) {
      // Count overlapping pairs (screen distance < 2*radius)
      let overlaps = 0;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const [x1, y1] = worldToScreen(pos[i * 2], pos[i * 2 + 1], w, h);
          const [x2, y2] = worldToScreen(pos[j * 2], pos[j * 2 + 1], w, h);
          const sd = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
          if (sd < radius * 3) overlaps++;
        }
      }
      if (overlaps > 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${overlaps} close pair${overlaps > 1 ? 's' : ''} — which is which?`, w / 2, h - 22);
      }
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
}
