/**
 * Potential Explorer — tabbed view of 4 models with V/Phi curves + live simulation.
 */
import { ParticleSystem } from '../sim/euler-maruyama';
import { MODELS } from '../sim/potentials';

const curveCanvas = document.getElementById('potential-curves-canvas') as HTMLCanvasElement;
const simCanvas = document.getElementById('model-sim-canvas') as HTMLCanvasElement;
const tabs = document.querySelectorAll('.model-tabs .toggle-btn');

if (curveCanvas && simCanvas) {
  const curveCtx = curveCanvas.getContext('2d')!;
  const simCtx = simCanvas.getContext('2d')!;

  let currentModel = 'model_a';
  let system: ParticleSystem;
  let state: ReturnType<ParticleSystem['initialize']>;

  function initModel(modelKey: string) {
    const config = MODELS[modelKey];
    if (!config) return;
    currentModel = modelKey;
    system = new ParticleSystem(config.V, config.Phi, config.sigma, 0.005, 10, 2, 42);
    state = system.initialize(0.8);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const modelKey = (tab as HTMLElement).dataset.model || 'model_a';
      initModel(modelKey);
      drawCurves();
    });
  });

  function drawCurves() {
    const config = MODELS[currentModel];
    if (!config) return;

    const w = curveCanvas.width;
    const h = curveCanvas.height;
    curveCtx.clearRect(0, 0, w, h);

    const padL = 45, padR = 15, padT = 25, padB = 35;
    const plotW = w - padL - padR;
    const plotH = (h - padT - padB - 20) / 2;

    // Draw V(r) — top
    drawPotentialCurve(curveCtx, padL, padT, plotW, plotH, 'V(x)', '#3b82f6', (r: number) => {
      const x = new Float64Array([r, 0]);
      return config.V.evaluate(x);
    }, -2.5, 2.5, -1, 5);

    // Draw Phi(r) — bottom
    const phiY = padT + plotH + 20;
    if (config.Phi.radial) {
      drawPotentialCurve(curveCtx, padL, phiY, plotW, plotH, 'Φ(r)', '#8b5cf6', (r: number) => {
        return config.Phi.evaluate(Math.abs(r));
      }, 0, 3, -4, 3);
    } else {
      drawPotentialCurve(curveCtx, padL, phiY, plotW, plotH, 'Φ(z₁,0)', '#8b5cf6', (z: number) => {
        const zv = new Float64Array([z, 0]);
        return config.Phi.evaluate(zv);
      }, -3, 3, -0.5, 2.5);
    }
  }

  function drawPotentialCurve(
    ctx: CanvasRenderingContext2D,
    x0: number, y0: number, plotW: number, plotH: number,
    label: string, color: string,
    fn: (x: number) => number,
    xMin: number, xMax: number, yMin: number, yMax: number,
  ) {
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x0, y0, plotW, plotH);

    // Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + plotH);
    ctx.lineTo(x0 + plotW, y0 + plotH);
    ctx.stroke();

    // Zero line
    if (yMin < 0 && yMax > 0) {
      const zy = y0 + plotH - ((-yMin) / (yMax - yMin)) * plotH;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x0, zy);
      ctx.lineTo(x0 + plotW, zy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Curve
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    const nPts = 200;
    for (let i = 0; i <= nPts; i++) {
      const t = i / nPts;
      const xVal = xMin + t * (xMax - xMin);
      let yVal = fn(xVal);
      yVal = Math.max(yMin, Math.min(yMax, yVal));
      const sx = x0 + t * plotW;
      const sy = y0 + plotH - ((yVal - yMin) / (yMax - yMin)) * plotH;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Label
    ctx.fillStyle = color;
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x0 + 5, y0 + 15);

    // Axis labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '9px var(--font-mono), monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${xMin}`, x0, y0 + plotH + 12);
    ctx.textAlign = 'right';
    ctx.fillText(`${xMax}`, x0 + plotW, y0 + plotH + 12);
  }

  function drawSim() {
    if (!system || !state) return;

    const w = simCanvas.width;
    const h = simCanvas.height;
    simCtx.clearRect(0, 0, w, h);

    // Step
    for (let s = 0; s < 3; s++) system.step(state);

    const pos = state.positions;
    const scale = Math.min(w, h) * 0.12;
    const cx = w / 2;
    const cy = h / 2;

    // Draw interaction lines
    for (let i = 0; i < 10; i++) {
      for (let j = i + 1; j < 10; j++) {
        const dx = pos[i * 2] - pos[j * 2];
        const dy = pos[i * 2 + 1] - pos[j * 2 + 1];
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r < 2.0) {
          const x1 = cx + pos[i * 2] * scale;
          const y1 = cy - pos[i * 2 + 1] * scale;
          const x2 = cx + pos[j * 2] * scale;
          const y2 = cy - pos[j * 2 + 1] * scale;
          simCtx.beginPath();
          simCtx.moveTo(x1, y1);
          simCtx.lineTo(x2, y2);
          simCtx.strokeStyle = `rgba(139, 92, 246, ${0.2 * (1 - r / 2)})`;
          simCtx.lineWidth = 1;
          simCtx.stroke();
        }
      }
    }

    // Draw particles
    for (let i = 0; i < 10; i++) {
      const sx = cx + pos[i * 2] * scale;
      const sy = cy - pos[i * 2 + 1] * scale;

      simCtx.beginPath();
      simCtx.arc(sx, sy, 7, 0, Math.PI * 2);
      simCtx.fillStyle = '#06b6d4';
      simCtx.globalAlpha = 0.8;
      simCtx.fill();
      simCtx.globalAlpha = 1;
    }

    // Model label
    const config = MODELS[currentModel];
    simCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    simCtx.font = '11px Inter, sans-serif';
    simCtx.textAlign = 'left';
    simCtx.fillText(config?.description || '', 10, h - 10);

    requestAnimationFrame(drawSim);
  }

  initModel('model_a');
  drawCurves();
  drawSim();
}
