/**
 * Empirical Measure Pivot Animation
 * THREE-PHASE transformation triggered by button clicks:
 * Phase 1: Colored, labeled particles at t1 → t2 (with trails)
 * Phase 2: Labels/colors fade away → gray anonymous dots
 * Phase 3: Dots compress into KDE density heatmap / histogram
 *
 * This is the PIVOT moment: from "what's missing" to "what we have"
 */
import { PRNG } from '../sim/prng';
import { t } from './i18n';

const canvas = document.getElementById('pivot-canvas') as HTMLCanvasElement;
const nextBtn = document.getElementById('pivot-next-btn') as HTMLButtonElement;
const phaseLabel = document.getElementById('pivot-phase-label');

if (canvas && nextBtn) {
  const ctx = canvas.getContext('2d')!;
  const prng = new PRNG(77);
  const N = 6;

  const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
  const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

  // Two snapshots
  const snap1: [number, number][] = [];
  const snap2: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const x = (prng.random() - 0.5) * 1.2;
    const y = (prng.random() - 0.5) * 1.0;
    snap1.push([x, y]);
    snap2.push([
      x + (prng.random() - 0.5) * 0.4,
      y + (prng.random() - 0.5) * 0.4,
    ]);
  }

  let phase = 0; // 0=labeled, 1=unlabeled, 2=empirical measure
  let transition = 1.0; // 0 = animating, 1 = done
  let animating = false;

  const PHASE_LABELS = [
    t('Phase 1: Labeled trajectories (classical setting)', '阶段 1：有标签轨迹（经典设定）'),
    t('Phase 2: Labels erased — unlabeled snapshots only', '阶段 2：标签抹去——只有无标签快照'),
    t('Phase 3: The empirical measure μₙ — the object we actually have', '阶段 3：经验测度 μₙ——我们真正拥有的对象'),
  ];

  const PHASE_BTNS = [
    t('Erase labels →', '抹去标签 →'),
    t('Show empirical measure →', '显示经验测度 →'),
    t('✓ This is our observable', '✓ 这就是我们的可观测量'),
  ];

  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function worldToScreen(x: number, y: number, w: number, h: number): [number, number] {
    const scale = Math.min(w, h) * 0.4;
    return [w / 2 + x * scale, h / 2 - y * scale];
  }

  function drawKDE(positions: [number, number][], W: number, H: number, alpha: number) {
    const bandwidth = 0.25;
    const gridRes = 30;
    const densityGrid: number[][] = Array.from({ length: gridRes }, () => new Array(gridRes).fill(0));

    for (let gi = 0; gi < gridRes; gi++) {
      for (let gj = 0; gj < gridRes; gj++) {
        const gx = -1.5 + (gi / (gridRes - 1)) * 3;
        const gy = -1.2 + (gj / (gridRes - 1)) * 2.4;
        let density = 0;
        positions.forEach(([px, py]) => {
          const d2 = (gx - px) ** 2 + (gy - py) ** 2;
          density += Math.exp(-d2 / (2 * bandwidth ** 2));
        });
        densityGrid[gi][gj] = density;
      }
    }

    const maxDensity = Math.max(...densityGrid.flat());

    for (let gi = 0; gi < gridRes; gi++) {
      for (let gj = 0; gj < gridRes; gj++) {
        const gx = -1.5 + (gi / (gridRes - 1)) * 3;
        const gy = -1.2 + (gj / (gridRes - 1)) * 2.4;
        const [sx, sy] = worldToScreen(gx, gy, W, H);
        const norm = densityGrid[gi][gj] / maxDensity;
        if (norm > 0.05) {
          ctx.fillStyle = `rgba(79, 156, 249, ${norm * alpha * 0.6})`;
          ctx.fillRect(sx - 8, sy - 8, 16, 16);
        }
      }
    }
  }

  function draw() {
    const W = canvas.width / devicePixelRatio;
    const H = canvas.height / devicePixelRatio;
    ctx.clearRect(0, 0, W, H);

    const labelAlpha = phase === 0 ? 1 : phase === 1 ? 1 - transition : 0;
    const colorAlpha = phase === 0 ? 1 : phase === 1 ? 1 - transition : 0;
    const kdeAlpha = phase === 2 ? transition : 0;
    const dotAlpha = phase === 2 ? 1 - transition * 0.5 : 1;

    if (animating && transition < 1) {
      transition = Math.min(1, transition + 0.025);
      if (transition >= 1) animating = false;
    }

    // Phase 2/3: KDE density overlay
    if (phase === 2) {
      drawKDE([...snap1, ...snap2], W, H, kdeAlpha);
    }

    // Draw trajectory lines (phase 0 only)
    if (phase === 0) {
      for (let i = 0; i < N; i++) {
        const [x1, y1] = worldToScreen(snap1[i][0], snap1[i][1], W, H);
        const [x2, y2] = worldToScreen(snap2[i][0], snap2[i][1], W, H);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = COLORS[i] + '88';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw particles (both snapshots)
    const R = 16;
    const snapshots: [[number, number][], string][] = [[snap1, 't₁'], [snap2, 't₂']];
    snapshots.forEach(([snap, label], si) => {
      snap.forEach(([x, y], i) => {
        const [sx, sy] = worldToScreen(x, y, W, H);

        // Dot
        ctx.beginPath();
        ctx.arc(sx, sy, R, 0, Math.PI * 2);
        const col = colorAlpha > 0 ? COLORS[i] : '#4f9cf9';
        ctx.fillStyle = col + Math.round(dotAlpha * 255).toString(16).padStart(2, '0');
        ctx.fill();

        // Label
        if (labelAlpha > 0) {
          ctx.fillStyle = `rgba(255,255,255,${labelAlpha})`;
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(LABELS[i], sx, sy);
        } else if (phase >= 1) {
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.font = '11px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', sx, sy);
        }
      });

      // Time label
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      const anchor = worldToScreen(si === 0 ? -0.9 : 0.9, -0.9, W, H);
      ctx.fillText(label, anchor[0], anchor[1]);
    });

    if (animating) requestAnimationFrame(draw);
  }

  nextBtn.addEventListener('click', () => {
    if (phase < 2) {
      phase++;
      transition = 0;
      animating = true;
      if (phaseLabel) phaseLabel.textContent = PHASE_LABELS[phase];
      nextBtn.textContent = PHASE_BTNS[phase];
      if (phase === 2) nextBtn.disabled = true;
      requestAnimationFrame(draw);
    }
  });

  if (phaseLabel) phaseLabel.textContent = PHASE_LABELS[0];
  nextBtn.textContent = PHASE_BTNS[0];

  resize();
  window.addEventListener('resize', resize);
}
