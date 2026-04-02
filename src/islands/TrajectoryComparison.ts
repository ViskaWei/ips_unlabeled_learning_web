/**
 * TrajectoryComparison — True vs predicted trajectories side-by-side.
 *
 * Runs two parallel simulations from the same initial conditions:
 *   Left: true potentials → true trajectories
 *   Right: "learned" potentials (slightly perturbed) → predicted trajectories
 *
 * Both use the same random seed so noise is identical —
 * any divergence is purely due to potential estimation error.
 */
import { ParticleSystem, type ParticleState } from '../sim/euler-maruyama';
import {
  MODELS,
  HarmonicPotential,
  QuadraticConfinement,
  DoubleWellPotential,
  GaussianInteraction,
  PiecewiseInteraction,
  InverseInteraction,
  MorsePotential,
  LennardJonesPotential,
  type ConfinementPotential,
  type InteractionPotential,
} from '../sim/potentials';

const canvasTrue = document.getElementById('traj-true-canvas') as HTMLCanvasElement;
const canvasPred = document.getElementById('traj-pred-canvas') as HTMLCanvasElement;

if (canvasTrue && canvasPred) {
  const ctxTrue = canvasTrue.getContext('2d')!;
  const ctxPred = canvasPred.getContext('2d')!;

  const N = 10;
  const d = 2;
  const SEED = 777;
  const MAX_TRAIL = 200;
  const STEPS_PER_FRAME = 5;
  const PARTICLE_COLORS = [
    '#06b6d4', '#f59e0b', '#ec4899', '#22c55e', '#8b5cf6',
    '#ef4444', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  ];

  // Create "learned" (perturbed) potentials per model
  function makeLearnedPotentials(modelKey: string): { V: ConfinementPotential; Phi: InteractionPotential } {
    switch (modelKey) {
      case 'model_e':
        return {
          V: new QuadraticConfinement(0, 1.015),        // true: 0, 1.0
          Phi: new GaussianInteraction(0.98, 0.81),      // true: 1.0, 0.8
        };
      case 'model_a':
        return {
          V: new QuadraticConfinement(-1.01, 2.02),      // true: -1.0, 2.0
          Phi: new PiecewiseInteraction(-2.93, 2.05),     // true: -3.0, 2.0
        };
      case 'model_b':
        return {
          V: new DoubleWellPotential(),                   // scale not easily parameterized
          Phi: new InverseInteraction(0.65),               // true: 0.5 — model_b is hard!
        };
      case 'model_lj':
        return {
          V: new HarmonicPotential(2.18),                 // true: 2.0
          Phi: new LennardJonesPotential(0.43, 0.5),     // true: eps=0.5
        };
      case 'model_morse':
        return {
          V: new DoubleWellPotential(),
          Phi: new MorsePotential(0.49, 2.04, 0.79),    // true: 0.5, 2.0, 0.8
        };
      default:
        return { V: MODELS.model_e.V, Phi: MODELS.model_e.Phi };
    }
  }

  let currentModel = 'model_e';
  let sysTrue: ParticleSystem;
  let sysPred: ParticleSystem;
  let stateTrue: ParticleState;
  let statePred: ParticleState;
  let trailsTrue: Float64Array[][] = [];
  let trailsPred: Float64Array[][] = [];
  let playing = true;
  let overlay = false;
  let frameIdx = 0;

  function initModel(modelKey: string) {
    const config = MODELS[modelKey];
    if (!config) return;
    currentModel = modelKey;
    const learned = makeLearnedPotentials(modelKey);

    sysTrue = new ParticleSystem(config.V, config.Phi, config.sigma, 0.005, N, d, SEED);
    sysPred = new ParticleSystem(learned.V, learned.Phi, config.sigma, 0.005, N, d, SEED);

    stateTrue = sysTrue.initialize(0.8);
    statePred = sysPred.initialize(0.8);

    // Copy identical initial conditions
    statePred.positions.set(stateTrue.positions);

    // Warmup both with same seed — they diverge due to different forces
    for (let i = 0; i < 200; i++) {
      sysTrue.step(stateTrue);
      sysPred.step(statePred);
    }

    trailsTrue = Array.from({ length: N }, () => []);
    trailsPred = Array.from({ length: N }, () => []);
    frameIdx = 0;
    recordFrame();
  }

  function recordFrame() {
    for (let i = 0; i < N; i++) {
      const posT = new Float64Array(d);
      const posP = new Float64Array(d);
      for (let k = 0; k < d; k++) {
        posT[k] = stateTrue.positions[i * d + k];
        posP[k] = statePred.positions[i * d + k];
      }
      trailsTrue[i].push(posT);
      trailsPred[i].push(posP);
      if (trailsTrue[i].length > MAX_TRAIL) trailsTrue[i].shift();
      if (trailsPred[i].length > MAX_TRAIL) trailsPred[i].shift();
    }
    frameIdx++;
  }

  // Controls
  const playBtn = document.getElementById('compare-play-btn');
  const overlayBtn = document.getElementById('compare-overlay-btn');
  const resetBtn = document.getElementById('compare-reset-btn');
  const modelBtns = document.querySelectorAll('[data-compare-traj-model]');

  playBtn?.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? 'Pause' : 'Play';
  });

  overlayBtn?.addEventListener('click', () => {
    overlay = !overlay;
    overlayBtn.textContent = overlay ? 'Split View' : 'Overlay';
    canvasPred.style.display = overlay ? 'none' : '';
    // Resize to fill space when in overlay mode
    resizeAll();
  });

  resetBtn?.addEventListener('click', () => {
    initModel(currentModel);
  });

  modelBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      modelBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const key = (btn as HTMLElement).dataset.compareTrajModel || 'model_e';
      initModel(key);
    });
  });

  function resizeCanvas(c: HTMLCanvasElement, context: CanvasRenderingContext2D) {
    const rect = c.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function resizeAll() {
    resizeCanvas(canvasTrue, ctxTrue);
    if (!overlay) resizeCanvas(canvasPred, ctxPred);
  }

  function worldToScreen(x: number, y: number, w: number, h: number): [number, number] {
    const scale = Math.min(w, h) * 0.13;
    return [w / 2 + x * scale, h / 2 - y * scale];
  }

  function drawPanel(
    ctx: CanvasRenderingContext2D, c: HTMLCanvasElement,
    trails: Float64Array[][], state: ParticleState,
    label: string, labelColor: string,
    trailsOverlay?: Float64Array[][], stateOverlay?: ParticleState,
  ) {
    const dpr = window.devicePixelRatio;
    const w = c.width / dpr;
    const h = c.height / dpr;
    ctx.clearRect(0, 0, w, h);

    // Draw trails
    function drawTrailSet(t: Float64Array[][], alpha: number, dash: number[]) {
      for (let i = 0; i < N; i++) {
        if (t[i].length < 2) continue;
        ctx.beginPath();
        ctx.setLineDash(dash);
        for (let j = 0; j < t[i].length; j++) {
          const [sx, sy] = worldToScreen(t[i][j][0], t[i][j][1], w, h);
          if (j === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = PARTICLE_COLORS[i];
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }

    drawTrailSet(trails, 0.4, []);

    if (trailsOverlay) {
      drawTrailSet(trailsOverlay, 0.3, [4, 3]);
    }

    // Draw particles
    function drawParticles(s: ParticleState, radius: number, strokeColor: string) {
      for (let i = 0; i < N; i++) {
        const [sx, sy] = worldToScreen(s.positions[i * d], s.positions[i * d + 1], w, h);
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fillStyle = PARTICLE_COLORS[i];
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    drawParticles(state, 5, 'rgba(255,255,255,0.3)');
    if (stateOverlay) {
      drawParticles(stateOverlay, 4, 'rgba(255,255,255,0.6)');
    }

    // Label
    ctx.fillStyle = labelColor;
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, 10, 20);

    // L2 divergence
    if (trailsOverlay) {
      let l2 = 0;
      for (let i = 0; i < N; i++) {
        for (let k = 0; k < d; k++) {
          const diff = state.positions[i * d + k] - (stateOverlay?.positions[i * d + k] || 0);
          l2 += diff * diff;
        }
      }
      l2 = Math.sqrt(l2 / N);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.font = '11px var(--font-mono, monospace)';
      ctx.textAlign = 'right';
      ctx.fillText(`L\u00B2 div: ${l2.toFixed(3)}`, w - 10, 20);
    }
  }

  function draw() {
    if (playing) {
      for (let s = 0; s < STEPS_PER_FRAME; s++) {
        sysTrue.step(stateTrue);
        sysPred.step(statePred);
      }
      recordFrame();
    }

    if (overlay) {
      drawPanel(ctxTrue, canvasTrue, trailsTrue, stateTrue,
        'True (solid) vs Predicted (dashed)', '#22c55e',
        trailsPred, statePred);
    } else {
      drawPanel(ctxTrue, canvasTrue, trailsTrue, stateTrue,
        'True Trajectories', '#22c55e');
      drawPanel(ctxPred, canvasPred, trailsPred, statePred,
        'Predicted (Learned V\u0302, \u03A6\u0302)', '#f59e0b');
    }

    requestAnimationFrame(draw);
  }

  initModel('model_e');
  resizeAll();
  window.addEventListener('resize', resizeAll);
  draw();
}
