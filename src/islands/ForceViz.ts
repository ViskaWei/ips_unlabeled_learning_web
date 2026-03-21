/**
 * Force Visualization — N=3 particles with colored force arrows.
 * Shows V (confinement → blue), Φ (interaction → purple), noise (gray).
 * Uses Reference model (Model E).
 */
import { ParticleSystem } from '../sim/euler-maruyama';
import { MODELS } from '../sim/potentials';

const canvas = document.getElementById('force-viz-canvas') as HTMLCanvasElement;
if (canvas) {
  const ctx = canvas.getContext('2d')!;
  const N = 3;
  const d = 2;
  const ref = MODELS.model_e;
  const system = new ParticleSystem(ref.V, ref.Phi, 0.25, 0.01, N, d, 99);
  const state = system.initialize(1.0);

  // Warmup
  for (let i = 0; i < 200; i++) system.step(state);

  const PARTICLE_COLORS = ['#06b6d4', '#f59e0b', '#ec4899'];
  const ARROW_SCALE = 50; // scale force vectors for visibility

  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function worldToScreen(x: number, y: number, w: number, h: number): [number, number] {
    const scale = Math.min(w, h) / 2.8;
    return [w / 2 + x * scale, h / 2 - y * scale];
  }

  function drawArrow(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    dx: number, dy: number,
    color: string, lineW: number,
  ) {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y + dy);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.stroke();

    // Arrowhead
    const headLen = Math.min(8, len * 0.4);
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(x + dx, y + dy);
    ctx.lineTo(
      x + dx - headLen * Math.cos(angle - 0.4),
      y + dy - headLen * Math.sin(angle - 0.4),
    );
    ctx.lineTo(
      x + dx - headLen * Math.cos(angle + 0.4),
      y + dy - headLen * Math.sin(angle + 0.4),
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function draw() {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    // Step simulation
    for (let s = 0; s < 3; s++) system.step(state);

    const pos = state.positions;
    const scale = Math.min(w, h) / 4.5;

    // Faint origin marker
    const [ox, oy] = worldToScreen(0, 0, w, h);
    ctx.beginPath();
    ctx.arc(ox, oy, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ox, oy, scale * 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Compute and draw forces for each particle
    const gradV = new Float64Array(d);
    const tmpX = new Float64Array(d);

    for (let i = 0; i < N; i++) {
      const px = pos[i * 2];
      const py = pos[i * 2 + 1];
      const [sx, sy] = worldToScreen(px, py, w, h);

      // --- Confinement force: -∇V ---
      tmpX[0] = px; tmpX[1] = py;
      ref.V.gradient(tmpX, gradV);
      const fVx = -gradV[0];
      const fVy = -gradV[1];

      // --- Interaction force: -(1/N)Σ∇Φ ---
      let fPhiX = 0, fPhiY = 0;
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const dx = px - pos[j * 2];
        const dy = py - pos[j * 2 + 1];
        const r = Math.max(Math.sqrt(dx * dx + dy * dy), 1e-10);
        const dPhiDr = (ref.Phi as any).gradient(r) as number;
        fPhiX += -dPhiDr * dx / r;
        fPhiY += -dPhiDr * dy / r;
      }
      fPhiX /= N;
      fPhiY /= N;

      // Draw V arrow (blue) — in screen coords (flip y)
      drawArrow(ctx, sx, sy,
        fVx * ARROW_SCALE * scale / 30,
        -fVy * ARROW_SCALE * scale / 30,
        '#3b82f6', 3);

      // Draw Φ arrow (purple)
      drawArrow(ctx, sx, sy,
        fPhiX * ARROW_SCALE * scale / 30,
        -fPhiY * ARROW_SCALE * scale / 30,
        '#8b5cf6', 3);

      // Draw noise arrow (gray, small, random direction)
      const noiseAngle = Math.random() * Math.PI * 2;
      const noiseLen = 10 + Math.random() * 8;
      drawArrow(ctx, sx, sy,
        Math.cos(noiseAngle) * noiseLen,
        Math.sin(noiseAngle) * noiseLen,
        'rgba(148,163,184,0.5)', 1.5);

      // Draw particle
      ctx.beginPath();
      ctx.arc(sx, sy, 22, 0, Math.PI * 2);
      ctx.fillStyle = PARTICLE_COLORS[i] + '33';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sx, sy, 16, 0, Math.PI * 2);
      ctx.fillStyle = PARTICLE_COLORS[i];
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Particle label
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, sx, sy);
    }

    // Legend at bottom
    const legendY = h - 18;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';

    const legendItems = [
      { color: '#3b82f6', label: '-\u2207V (confinement)' },
      { color: '#8b5cf6', label: '-\u2207\u03A6 (interaction)' },
      { color: 'rgba(148,163,184,0.7)', label: '\u03C3dW (noise)' },
    ];
    const totalW = legendItems.length * 140;
    let lx = (w - totalW) / 2 + 20;
    for (const item of legendItems) {
      // color swatch
      ctx.fillStyle = item.color;
      ctx.fillRect(lx, legendY - 4, 16, 3);
      // Arrow head
      ctx.beginPath();
      ctx.moveTo(lx + 16, legendY - 2.5);
      ctx.lineTo(lx + 12, legendY - 5);
      ctx.lineTo(lx + 12, legendY);
      ctx.closePath();
      ctx.fill();
      // Label
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, lx + 22, legendY);
      lx += 150;
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
}
