/**
 * TrajectoryViewer — Animated particle trajectories with colored trails.
 * Shows N=10 particles evolving under true potentials, recording full trails.
 */
import { ParticleSystem, type ParticleState } from '../sim/euler-maruyama';
import { MODELS } from '../sim/potentials';

const canvas = document.getElementById('traj-viewer-canvas') as HTMLCanvasElement;
if (canvas) {
  const ctx = canvas.getContext('2d')!;

  const N = 10;
  const d = 2;
  const MAX_TRAIL = 300;
  const STEPS_PER_FRAME = 5;
  const PARTICLE_COLORS = [
    '#06b6d4', '#f59e0b', '#ec4899', '#22c55e', '#8b5cf6',
    '#ef4444', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  ];

  let currentModel = 'model_e';
  let system: ParticleSystem;
  let state: ParticleState;
  let trails: Float64Array[][] = [];
  let frameIdx = 0;
  let playing = true;
  let speed = 1;
  let showTrails = true;

  function initModel(modelKey: string) {
    const config = MODELS[modelKey];
    if (!config) return;
    currentModel = modelKey;
    system = new ParticleSystem(config.V, config.Phi, config.sigma, 0.005, N, d, 42);
    state = system.initialize(0.8);
    // Warmup to reach steady state
    for (let i = 0; i < 300; i++) system.step(state);
    trails = Array.from({ length: N }, () => []);
    frameIdx = 0;
    recordFrame();
  }

  function recordFrame() {
    for (let i = 0; i < N; i++) {
      const pos = new Float64Array(d);
      for (let k = 0; k < d; k++) pos[k] = state.positions[i * d + k];
      trails[i].push(pos);
      if (trails[i].length > MAX_TRAIL) trails[i].shift();
    }
    frameIdx++;
  }

  // Controls
  const playBtn = document.getElementById('traj-play-btn');
  const speedBtns = document.querySelectorAll('[data-traj-speed]');
  const trailToggle = document.getElementById('traj-trail-toggle');
  const modelBtns = document.querySelectorAll('[data-traj-model]');

  playBtn?.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? 'Pause' : 'Play';
  });

  speedBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      speedBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      speed = parseFloat((btn as HTMLElement).dataset.trajSpeed || '1');
    });
  });

  trailToggle?.addEventListener('click', () => {
    showTrails = !showTrails;
    trailToggle.textContent = showTrails ? 'Hide Trails' : 'Show Trails';
  });

  modelBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      modelBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const key = (btn as HTMLElement).dataset.trajModel || 'model_e';
      initModel(key);
    });
  });

  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function worldToScreen(x: number, y: number, w: number, h: number): [number, number] {
    const scale = Math.min(w, h) * 0.13;
    return [w / 2 + x * scale, h / 2 - y * scale];
  }

  function draw() {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    // Step simulation
    if (playing) {
      const stepsThisFrame = Math.round(STEPS_PER_FRAME * speed);
      for (let s = 0; s < stepsThisFrame; s++) system.step(state);
      recordFrame();
    }

    // Draw trails
    if (showTrails) {
      for (let i = 0; i < N; i++) {
        const trail = trails[i];
        if (trail.length < 2) continue;
        ctx.beginPath();
        for (let t = 0; t < trail.length; t++) {
          const [sx, sy] = worldToScreen(trail[t][0], trail[t][1], w, h);
          if (t === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = PARTICLE_COLORS[i];
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Fading gradient on older trail segments
      for (let i = 0; i < N; i++) {
        const trail = trails[i];
        const len = trail.length;
        if (len < 10) continue;
        const recentStart = Math.max(0, len - 30);
        ctx.beginPath();
        for (let t = recentStart; t < len; t++) {
          const [sx, sy] = worldToScreen(trail[t][0], trail[t][1], w, h);
          if (t === recentStart) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = PARTICLE_COLORS[i];
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Draw particles
    for (let i = 0; i < N; i++) {
      const px = state.positions[i * d];
      const py = state.positions[i * d + 1];
      const [sx, sy] = worldToScreen(px, py, w, h);

      // Glow
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx.fillStyle = PARTICLE_COLORS[i];
      ctx.globalAlpha = 0.15;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Solid circle
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, Math.PI * 2);
      ctx.fillStyle = PARTICLE_COLORS[i];
      ctx.fill();

      // Border
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Frame counter
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px var(--font-mono, monospace)';
    ctx.textAlign = 'right';
    ctx.fillText(`t = ${(frameIdx * 0.005 * STEPS_PER_FRAME).toFixed(2)}`, w - 10, h - 10);

    // Model label
    const config = MODELS[currentModel];
    ctx.textAlign = 'left';
    ctx.fillText(config?.label || '', 10, h - 10);

    requestAnimationFrame(draw);
  }

  initModel('model_e');
  resize();
  window.addEventListener('resize', resize);
  draw();
}
