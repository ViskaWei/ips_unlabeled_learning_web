/**
 * Label Toggle Demo — N=15 particles with toggleable labels.
 * Uses Model B (Double-Well + Inverse) for dynamic motion.
 *
 * Labeled mode:  continuous animation with colored trails → you can track each particle.
 * Unlabeled mode: periodic snapshots with large time gaps → impossible to match.
 */
import { ParticleSystem } from '../sim/euler-maruyama';
import { DoubleWellPotential, InverseInteraction } from '../sim/potentials';

const canvas = document.getElementById('label-demo-canvas') as HTMLCanvasElement;
if (canvas) {
  const ctx = canvas.getContext('2d')!;
  const N = 15;
  const d = 2;

  const V = new DoubleWellPotential();
  const Phi = new InverseInteraction(0.5);
  const system = new ParticleSystem(V, Phi, 0.15, 0.02, N, d, 42);
  const state = system.initialize(1.0);

  // Warmup
  for (let i = 0; i < 500; i++) system.step(state);

  // Trail history for labeled mode
  const TRAIL_LEN = 60;
  const trails: Float64Array[] = [];

  // 15 distinct colors for labeled mode
  const COLORS = [
    '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#a855f7',
    '#e11d48', '#84cc16', '#0ea5e9', '#d946ef', '#fb923c',
  ];
  const UNLABELED_COLOR = '#3b82f6';

  let labeled = true;

  // --- Snapshot state for unlabeled mode ---
  const SNAPSHOT_INTERVAL = 2500; // ms between snapshots
  const SNAPSHOT_STEPS = 150;     // simulation steps per jump (big gap!)
  const FLASH_DURATION = 300;     // ms for transition flash
  let lastSnapshotTime = 0;
  let prevPositions: Float64Array | null = null;
  let currPositions = new Float64Array(state.positions);
  let snapshotCount = 0;
  let flashAlpha = 0; // 0 = no flash, 1 = full white flash

  // Toggle buttons
  const toggleBtns = canvas.closest('.demo-container')?.querySelectorAll('.toggle-btn');
  toggleBtns?.forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const wasLabeled = labeled;
      labeled = (btn as HTMLElement).dataset.mode === 'labeled';
      if (!labeled && wasLabeled) {
        // Switching to unlabeled: take first snapshot now
        currPositions = new Float64Array(state.positions);
        prevPositions = null;
        lastSnapshotTime = performance.now();
        snapshotCount = 0;
      }
    });
  });

  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  function worldToScreen(x: number, y: number, w: number, h: number): [number, number] {
    const scale = Math.min(w, h) / 5.5;
    return [w / 2 + x * scale, h / 2 - y * scale];
  }

  function drawLabeled(w: number, h: number) {
    // Advance simulation smoothly
    for (let s = 0; s < 5; s++) system.step(state);

    // Record trail
    trails.push(new Float64Array(state.positions));
    if (trails.length > TRAIL_LEN) trails.shift();

    const pos = state.positions;

    // Faint ring
    const [cx, cy] = worldToScreen(0, 0, w, h);
    const ringR = Math.min(w, h) / 5.5;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Colored trails
    if (trails.length > 2) {
      for (let i = 0; i < N; i++) {
        ctx.beginPath();
        for (let t = 0; t < trails.length; t++) {
          const [tx, ty] = worldToScreen(trails[t][i * 2], trails[t][i * 2 + 1], w, h);
          if (t === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        }
        ctx.strokeStyle = COLORS[i] + '55';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }

    // Connecting lines for close particles
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

    // Particles with numbers
    const radius = 13;
    for (let i = 0; i < N; i++) {
      const [sx, sy] = worldToScreen(pos[i * 2], pos[i * 2 + 1], w, h);
      const color = COLORS[i];

      ctx.beginPath();
      ctx.arc(sx, sy, radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = `${color}22`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, sx, sy);
    }
  }

  function drawUnlabeled(w: number, h: number, now: number) {
    // Still advance simulation in background (so labeled mode stays in sync)
    for (let s = 0; s < 5; s++) system.step(state);

    const elapsed = now - lastSnapshotTime;

    // Time for a new snapshot?
    if (elapsed >= SNAPSHOT_INTERVAL) {
      prevPositions = new Float64Array(currPositions);
      // Jump simulation forward by many steps → big position change
      for (let s = 0; s < SNAPSHOT_STEPS; s++) system.step(state);
      currPositions = new Float64Array(state.positions);
      lastSnapshotTime = now;
      snapshotCount++;
      flashAlpha = 1.0; // trigger flash
    }

    // Decay flash
    if (flashAlpha > 0) {
      flashAlpha = Math.max(0, 1.0 - (now - lastSnapshotTime) / FLASH_DURATION);
    }

    // Faint ring
    const [cx, cy] = worldToScreen(0, 0, w, h);
    const ringR = Math.min(w, h) / 5.5;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const radius = 10;

    // Draw previous snapshot as ghost circles (hollow, faded)
    if (prevPositions) {
      for (let i = 0; i < N; i++) {
        const [sx, sy] = worldToScreen(prevPositions[i * 2], prevPositions[i * 2 + 1], w, h);

        // Hollow ring
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)'; // slate ghost
        ctx.lineWidth = 2;
        ctx.stroke();

        // Faint fill
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
        ctx.fill();
      }
    }

    // Draw current snapshot as solid blue dots
    for (let i = 0; i < N; i++) {
      const [sx, sy] = worldToScreen(currPositions[i * 2], currPositions[i * 2 + 1], w, h);

      // Glow
      ctx.beginPath();
      ctx.arc(sx, sy, radius + 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.10)';
      ctx.fill();

      // Solid fill
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fillStyle = UNLABELED_COLOR;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // Flash overlay (white flash on snapshot transition)
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.15})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Status text
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (prevPositions) {
      ctx.fillText(
        `Snapshot ${snapshotCount} → ${snapshotCount + 1}  —  which dot moved where?`,
        w / 2, h - 24,
      );
    } else {
      ctx.fillText('Observing snapshot 1 ...', w / 2, h - 24);
    }

    // Countdown bar at bottom
    const progress = Math.min(elapsed / SNAPSHOT_INTERVAL, 1);
    const barW = w * 0.4;
    const barH = 3;
    const barX = (w - barW) / 2;
    const barY = h - 8;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.fillRect(barX, barY, barW * progress, barH);
  }

  function draw() {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    const now = performance.now();

    ctx.clearRect(0, 0, w, h);

    if (labeled) {
      drawLabeled(w, h);
    } else {
      drawUnlabeled(w, h, now);
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  lastSnapshotTime = performance.now();
  draw();
}
