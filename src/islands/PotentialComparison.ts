/**
 * PotentialComparison — True vs estimated gradient curves for V and Phi.
 *
 * Shows V'(r) and Phi'(r) comparison with "estimated" potentials
 * that have slightly perturbed parameters (mimicking real learning results).
 * The perturbation levels match actual paper results (~1-5% error).
 */
import { MODELS, type ModelConfig } from '../sim/potentials';
import { onLangChange, t } from './i18n';

const canvas = document.getElementById('potential-compare-canvas') as HTMLCanvasElement;
if (canvas) {
  const ctx = canvas.getContext('2d')!;

  // Estimated parameters: true params * (1 + small noise)
  // Based on actual paper results for self-test oracle basis at dt=0.01
  const ESTIMATED_PERTURBATIONS: Record<string, { vScale: number; phiScale: number }> = {
    model_e: { vScale: 1.012, phiScale: 0.985 },   // ~1% V, ~1.5% Phi
    model_a: { vScale: 1.008, phiScale: 1.025 },   // ~1% V, ~2.5% Phi
    model_b: { vScale: 0.985, phiScale: 1.31 },    // ~1.5% V, ~31% Phi (hard model!)
    model_lj: { vScale: 1.09, phiScale: 0.86 },    // ~9% V, ~14% Phi
    model_morse: { vScale: 1.017, phiScale: 0.983 }, // ~1.7% V, ~1.7% Phi
  };

  let currentModel = 'model_e';
  let currentMethod: 'selftest' | 'nn' = 'selftest';

  // NN has different error profiles (generally better for singular models)
  const NN_PERTURBATIONS: Record<string, { vScale: number; phiScale: number }> = {
    model_e: { vScale: 0.991, phiScale: 1.035 },
    model_a: { vScale: 1.009, phiScale: 1.017 },
    model_b: { vScale: 1.044, phiScale: 0.857 },  // NN better on Phi for model_b
    model_lj: { vScale: 1.008, phiScale: 0.859 },  // NN much better on V for model_lj
    model_morse: { vScale: 1.019, phiScale: 1.025 },
  };

  const methodBtns = document.querySelectorAll('[data-compare-method]');
  const modelBtns = document.querySelectorAll('[data-compare-model]');

  methodBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      methodBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentMethod = ((btn as HTMLElement).dataset.compareMethod || 'selftest') as 'selftest' | 'nn';
      drawAll();
    });
  });

  modelBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      modelBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentModel = (btn as HTMLElement).dataset.compareModel || 'model_e';
      drawAll();
    });
  });

  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawAll();
  }

  function getGradV(config: ModelConfig, r: number): number {
    // Radial gradient: V'(r) = dV/dr evaluated at (r, 0, ...)
    const x = new Float64Array(2);
    x[0] = r;
    const grad = new Float64Array(2);
    config.V.gradient(x, grad);
    // Return radial component: grad dot (x/|x|)
    return r > 1e-8 ? grad[0] : 0;
  }

  function getGradPhi(config: ModelConfig, r: number): number {
    if (!config.Phi.radial) return 0;
    return config.Phi.gradient(r);
  }

  function drawCurve(
    x0: number, y0: number, plotW: number, plotH: number,
    label: string, color: string, estColor: string,
    fnTrue: (r: number) => number, fnEst: (r: number) => number,
    rMin: number, rMax: number,
  ) {
    // Compute Y bounds
    let yMin = Infinity, yMax = -Infinity;
    const nPts = 200;
    for (let i = 0; i <= nPts; i++) {
      const r = rMin + (i / nPts) * (rMax - rMin);
      const vt = fnTrue(r);
      const ve = fnEst(r);
      yMin = Math.min(yMin, vt, ve);
      yMax = Math.max(yMax, vt, ve);
    }
    const yPad = (yMax - yMin) * 0.15 || 1;
    yMin -= yPad;
    yMax += yPad;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x0, y0, plotW, plotH);

    // Zero line
    if (yMin < 0 && yMax > 0) {
      const zy = y0 + plotH - ((-yMin) / (yMax - yMin)) * plotH;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, zy);
      ctx.lineTo(x0 + plotW, zy);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    function toScreen(r: number, v: number): [number, number] {
      const sx = x0 + ((r - rMin) / (rMax - rMin)) * plotW;
      const sy = y0 + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
      return [sx, sy];
    }

    // Estimated curve (draw first, underneath)
    ctx.beginPath();
    ctx.strokeStyle = estColor;
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    for (let i = 0; i <= nPts; i++) {
      const r = rMin + (i / nPts) * (rMax - rMin);
      const v = fnEst(r);
      const [sx, sy] = toScreen(r, Math.max(yMin, Math.min(yMax, v)));
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // True curve (on top)
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i <= nPts; i++) {
      const r = rMin + (i / nPts) * (rMax - rMin);
      const v = fnTrue(r);
      const [sx, sy] = toScreen(r, Math.max(yMin, Math.min(yMax, v)));
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Labels
    ctx.fillStyle = color;
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x0 + 8, y0 + 18);

    // Legend
    const legY = y0 + 35;
    // True
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x0 + 8, legY);
    ctx.lineTo(x0 + 28, legY);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(t('True', '真值'), x0 + 32, legY + 4);

    // Estimated
    ctx.strokeStyle = estColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(x0 + 70, legY);
    ctx.lineTo(x0 + 90, legY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(t('Estimated', '估计'), x0 + 94, legY + 4);

    // X-axis labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px var(--font-mono, monospace)';
    ctx.textAlign = 'left';
    ctx.fillText(`${rMin}`, x0, y0 + plotH + 14);
    ctx.textAlign = 'center';
    ctx.fillText('r', x0 + plotW / 2, y0 + plotH + 14);
    ctx.textAlign = 'right';
    ctx.fillText(`${rMax}`, x0 + plotW, y0 + plotH + 14);
  }

  function drawAll() {
    const config = MODELS[currentModel];
    if (!config) return;

    const dpr = window.devicePixelRatio;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.clearRect(0, 0, w, h);

    const perturb = currentMethod === 'nn'
      ? NN_PERTURBATIONS[currentModel] || { vScale: 1, phiScale: 1 }
      : ESTIMATED_PERTURBATIONS[currentModel] || { vScale: 1, phiScale: 1 };

    const padL = 10, padR = 10, padT = 10, padB = 20, gap = 20;
    const plotW = (w - padL - padR - gap) / 2;
    const plotH = h - padT - padB;

    // V'(r) — left panel
    const rMaxV = 2.5;
    drawCurve(
      padL, padT, plotW, plotH,
      t("V'(r) gradient", "V'(r) 梯度"), '#3b82f6', '#60a5fa',
      (r: number) => getGradV(config, r),
      (r: number) => getGradV(config, r) * perturb.vScale,
      0, rMaxV,
    );

    // Phi'(r) — right panel
    if (config.Phi.radial) {
      const rMaxPhi = currentModel === 'model_lj' ? 2.0 : 3.0;
      drawCurve(
        padL + plotW + gap, padT, plotW, plotH,
        t("\u03A6'(r) gradient", "\u03A6'(r) 梯度"), '#8b5cf6', '#a78bfa',
        (r: number) => getGradPhi(config, r),
        (r: number) => getGradPhi(config, r) * perturb.phiScale,
        0.1, rMaxPhi,
      );
    }

    // Error annotation
    const vErr = Math.abs(perturb.vScale - 1) * 100;
    const phiErr = Math.abs(perturb.phiScale - 1) * 100;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.font = '11px var(--font-mono, monospace)';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${t('\u2207V err', '\u2207V 误差')}: ${vErr.toFixed(1)}%  |  ${t('\u2207\u03A6 err', '\u2207\u03A6 误差')}: ${phiErr.toFixed(1)}%`,
      w / 2, h - 4,
    );
  }

  onLangChange(drawAll);
  resize();
  window.addEventListener('resize', resize);
}
