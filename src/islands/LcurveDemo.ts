/**
 * L-curve Demo — Interactive visualization of Tikhonov regularization.
 * Shows how the L-curve method selects the optimal regularization parameter λ
 * by finding the point of maximum curvature on the log-log trade-off curve.
 *
 * Left plot: L-curve (log ||x_λ|| vs log ||Ax_λ - b||)
 * Right plot: Curvature κ(λ) — peak indicates optimal λ
 * Bottom: Recovered solution bars compared to truth
 */

const container = document.getElementById('lcurve-viz');
const lambdaSlider = document.getElementById('lambda-slider') as HTMLInputElement;
const noiseSlider = document.getElementById('noise-slider') as HTMLInputElement;
const condSlider = document.getElementById('cond-slider') as HTMLInputElement;
const lambdaLabel = document.getElementById('lambda-value');
const noiseLabel = document.getElementById('noise-value');
const condLabel = document.getElementById('cond-value');

if (container) {
  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.style.position = 'relative';
  container.replaceChildren(canvas);

  // ─── Problem Setup ───
  const p = 5;  // number of parameters
  const xTrue = [1.0, 0.8, 0.5, 0.3, 0.1];

  // Seeded pseudo-random for reproducibility
  let seed = 42;
  function rand(): number {
    seed = (seed * 16807 + 0) % 2147483647;
    return seed / 2147483647;
  }
  function randn(): number {
    const u1 = rand(), u2 = rand();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // λ sweep: 200 points from 1e-8 to 1e4
  const nLambda = 200;
  const logLambdaMin = -8, logLambdaMax = 4;
  const logLambdas = Array.from({ length: nLambda }, (_, i) =>
    logLambdaMin + (logLambdaMax - logLambdaMin) * i / (nLambda - 1));
  const lambdas = logLambdas.map(l => Math.pow(10, l));

  // State
  let noiseLevel = 0.5;
  let condNumber = 4;  // log10(condition number)
  let currentLogLambda = -2;
  let noiseRealization: number[] = [];

  function generateNoise() {
    seed = 42;
    noiseRealization = Array.from({ length: p }, () => randn());
  }
  generateNoise();

  function getSingularValues(): number[] {
    // Logarithmically spaced from 10 down to 10^(1 - condNumber)
    return Array.from({ length: p }, (_, i) =>
      Math.pow(10, 1 - condNumber * i / (p - 1)));
  }

  function getRHS(sigmas: number[]): number[] {
    // d_i = σ_i * x_true_i + noise * ε_i
    return sigmas.map((s, i) => s * xTrue[i] + noiseLevel * noiseRealization[i]);
  }

  // ─── L-curve Computation ───
  interface LcurvePoint {
    lambda: number;
    logLambda: number;
    solNorm: number;    // ||x_λ||
    resNorm: number;    // ||Ax_λ - b||
    logSol: number;
    logRes: number;
    solution: number[];
  }

  function computeLcurve(): LcurvePoint[] {
    const sigmas = getSingularValues();
    const d = getRHS(sigmas);
    return lambdas.map((lam, idx) => {
      let solNormSq = 0, resNormSq = 0;
      const solution: number[] = [];
      for (let i = 0; i < p; i++) {
        const filter = sigmas[i] / (sigmas[i] * sigmas[i] + lam);
        const xi = filter * d[i];
        solution.push(xi);
        solNormSq += xi * xi;
        const ri = lam * d[i] / (sigmas[i] * sigmas[i] + lam);
        resNormSq += ri * ri;
      }
      const solNorm = Math.sqrt(Math.max(solNormSq, 1e-30));
      const resNorm = Math.sqrt(Math.max(resNormSq, 1e-30));
      return {
        lambda: lam,
        logLambda: logLambdas[idx],
        solNorm, resNorm,
        logSol: Math.log10(solNorm),
        logRes: Math.log10(resNorm),
        solution,
      };
    });
  }

  function computeCurvature(points: LcurvePoint[]): number[] {
    const n = points.length;
    const kappa = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
      const h = points[i + 1].logLambda - points[i - 1].logLambda;
      // Numerical derivatives of ρ (logRes) and η (logSol) w.r.t. logLambda
      const dRho = (points[i + 1].logRes - points[i - 1].logRes) / h;
      const dEta = (points[i + 1].logSol - points[i - 1].logSol) / h;
      const h2 = h / 2;
      const ddRho = (points[i + 1].logRes - 2 * points[i].logRes + points[i - 1].logRes) / (h2 * h2);
      const ddEta = (points[i + 1].logSol - 2 * points[i].logSol + points[i - 1].logSol) / (h2 * h2);
      const denom = Math.pow(dRho * dRho + dEta * dEta, 1.5);
      kappa[i] = denom > 1e-20 ? (dRho * ddEta - dEta * ddRho) / denom : 0;
    }
    return kappa;
  }

  function findOptimalLambda(kappa: number[]): number {
    let maxK = -Infinity, maxIdx = 0;
    for (let i = 2; i < kappa.length - 2; i++) {
      if (kappa[i] > maxK) { maxK = kappa[i]; maxIdx = i; }
    }
    return maxIdx;
  }

  // ─── Drawing ───
  function resize() {
    const rect = container!.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

  function draw() {
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width / window.devicePixelRatio;
    const H = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, W, H);

    const points = computeLcurve();
    const kappa = computeCurvature(points);
    const optIdx = findOptimalLambda(kappa);

    // Current λ from slider
    const curIdx = Math.round((currentLogLambda - logLambdaMin) / (logLambdaMax - logLambdaMin) * (nLambda - 1));
    const clampedIdx = Math.max(0, Math.min(nLambda - 1, curIdx));

    // Layout: left = L-curve (60%), right = curvature (40%), bottom = solution bars
    const gap = 20;
    const padL = 55, padR = 15, padT = 30, padB = 85;
    const plotW = W - padL - padR;
    const splitX = padL + plotW * 0.55;
    const plotH = H - padT - padB;

    // ─── Left: L-curve ───
    const lcW = splitX - padL - gap / 2;
    const lcH = plotH;

    // Compute axis ranges
    const logSols = points.map(p => p.logSol);
    const logRess = points.map(p => p.logRes);
    const xMin = Math.min(...logSols) - 0.1;
    const xMax = Math.max(...logSols) + 0.1;
    const yMin = Math.min(...logRess) - 0.1;
    const yMax = Math.max(...logRess) + 0.1;

    function lcX(logSol: number) { return padL + (logSol - xMin) / (xMax - xMin) * lcW; }
    function lcY(logRes: number) { return padT + lcH - (logRes - yMin) / (yMax - yMin) * lcH; }

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      const px = lcX(x);
      ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, padT + lcH); ctx.stroke();
    }
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
      const py = lcY(y);
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + lcW, py); ctx.stroke();
    }

    // L-curve path
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const x = lcX(points[i].logSol);
      const y = lcY(points[i].logRes);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Gradient dots along the curve (every 10th point)
    for (let i = 0; i < points.length; i += 10) {
      const x = lcX(points[i].logSol);
      const y = lcY(points[i].logRes);
      const t = i / (points.length - 1);
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${Math.round(lerp(59, 239, t))}, ${Math.round(lerp(130, 68, t))}, ${Math.round(lerp(246, 68, t))}, 0.6)`;
      ctx.fill();
    }

    // Optimal λ — green star
    {
      const x = lcX(points[optIdx].logSol);
      const y = lcY(points[optIdx].logRes);
      // Glow
      ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.2)'; ctx.fill();
      // Circle
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e'; ctx.fill();
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.stroke();
      // Label
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`\u03BB* = ${points[optIdx].lambda.toExponential(1)}`, x + 14, y + 4);
    }

    // Current λ — amber dot
    {
      const pt = points[clampedIdx];
      const x = lcX(pt.logSol);
      const y = lcY(pt.logRes);
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.3)'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b'; ctx.fill();
      ctx.strokeStyle = '#d97706'; ctx.lineWidth = 2; ctx.stroke();
    }

    // Axis labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('log \u2016x\u03BB\u2016 (solution norm)', padL + lcW / 2, padT + lcH + 18);
    ctx.save();
    ctx.translate(12, padT + lcH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('log \u2016Ax\u03BB\u2212b\u2016 (residual)', 0, 0);
    ctx.restore();

    // L-curve title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('L-curve', padL + lcW / 2, padT - 10);

    // Annotations: under-regularized (right) and over-regularized (left)
    const annotY = padT + lcH - 15;
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.textAlign = 'left';
    ctx.fillText('\u2190 over-regularized', padL + 5, annotY);
    ctx.textAlign = 'right';
    ctx.fillText('under-regularized \u2192', padL + lcW - 5, padT + 20);

    // ─── Right: Curvature plot ───
    const curveL = splitX + gap / 2;
    const curveW = W - padR - curveL;
    const curveH = plotH * 0.45;

    // Curvature range
    const kappaFiltered = kappa.slice(2, -2);
    const kMax = Math.max(...kappaFiltered, 0.1);
    const kMin = Math.min(...kappaFiltered, 0);

    function curX(logLam: number) { return curveL + (logLam - logLambdaMin) / (logLambdaMax - logLambdaMin) * curveW; }
    function curY(k: number) { return padT + curveH - (k - kMin) / (kMax - kMin + 1e-10) * curveH; }

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = Math.ceil(logLambdaMin); x <= Math.floor(logLambdaMax); x += 2) {
      const px = curX(x);
      ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, padT + curveH); ctx.stroke();
    }

    // Zero line
    if (kMin < 0) {
      const zy = curY(0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(curveL, zy); ctx.lineTo(curveL + curveW, zy); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Curvature curve
    ctx.beginPath();
    for (let i = 2; i < kappa.length - 2; i++) {
      const x = curX(logLambdas[i]);
      const y = curY(kappa[i]);
      if (i === 2) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Optimal λ marker on curvature
    {
      const x = curX(logLambdas[optIdx]);
      const y = curY(kappa[optIdx]);
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e'; ctx.fill();
      ctx.strokeStyle = '#16a34a'; ctx.lineWidth = 2; ctx.stroke();
    }

    // Current λ on curvature
    if (clampedIdx >= 2 && clampedIdx < kappa.length - 2) {
      const x = curX(logLambdas[clampedIdx]);
      const y = curY(kappa[clampedIdx]);
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b'; ctx.fill();
    }

    // Curvature title and axis
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Curvature \u03BA(\u03BB)', curveL + curveW / 2, padT - 10);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('log \u03BB', curveL + curveW / 2, padT + curveH + 18);

    // ─── Right-bottom: Solution bars ───
    const barTop = padT + curveH + 35;
    const barH = plotH - curveH - 35;
    const barW = curveW / p;
    const barPad = 6;

    // Find max value for scaling
    const curSol = points[clampedIdx].solution;
    const allVals = [...xTrue, ...curSol];
    const vMax = Math.max(...allVals.map(Math.abs), 0.01) * 1.2;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Recovered vs True Solution', curveL + curveW / 2, barTop - 5);

    for (let i = 0; i < p; i++) {
      const bx = curveL + i * barW;
      const halfW = (barW - barPad * 2) / 2;

      // True value bar (left, cyan)
      const trueH = (xTrue[i] / vMax) * barH * 0.8;
      const trueY = barTop + barH * 0.9 - Math.max(trueH, 0);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.fillRect(bx + barPad, trueY, halfW, Math.abs(trueH));
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + barPad, trueY, halfW, Math.abs(trueH));

      // Recovered value bar (right, amber)
      const recH = (curSol[i] / vMax) * barH * 0.8;
      const recY = barTop + barH * 0.9 - Math.max(recH, 0);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.fillRect(bx + barPad + halfW, recY, halfW, Math.abs(recH));
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + barPad + halfW, recY, halfW, Math.abs(recH));

      // Label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`x${i + 1}`, bx + barW / 2, barTop + barH - 2);
    }

    // Legend for bars
    const legY = barTop + barH + 12;
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = '#06b6d4';
    ctx.textAlign = 'right';
    ctx.fillText('\u25A0 True', curveL + curveW / 2 - 5, legY);
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'left';
    ctx.fillText('\u25A0 Recovered', curveL + curveW / 2 + 5, legY);

    // ─── Info panel ───
    const infoY = padT + lcH + 30;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';

    const pt = points[clampedIdx];
    const optPt = points[optIdx];
    const sigmas = getSingularValues();
    const relErr = Math.sqrt(curSol.reduce((s, x, i) => s + (x - xTrue[i]) ** 2, 0) /
                             xTrue.reduce((s, x) => s + x * x, 0)) * 100;

    ctx.fillText(`\u03BB = ${pt.lambda.toExponential(2)}`, padL, infoY);
    ctx.fillText(`\u2016x\u03BB\u2016 = ${pt.solNorm.toFixed(3)}`, padL, infoY + 16);
    ctx.fillText(`\u2016r\u03BB\u2016 = ${pt.resNorm.toFixed(3)}`, padL, infoY + 32);

    ctx.fillStyle = relErr < 10 ? '#22c55e' : relErr < 30 ? '#f59e0b' : '#ef4444';
    ctx.fillText(`err = ${relErr.toFixed(1)}%`, padL + 180, infoY);

    ctx.fillStyle = '#22c55e';
    ctx.fillText(`\u03BB* = ${optPt.lambda.toExponential(2)}`, padL + 180, infoY + 16);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillText(`\u03BA = ${sigmas[0].toFixed(1)} / ${sigmas[p - 1].toExponential(1)}`, padL + 180, infoY + 32);

    requestAnimationFrame(draw);
  }

  // ─── Event Handlers ───
  if (lambdaSlider) {
    lambdaSlider.addEventListener('input', () => {
      currentLogLambda = parseFloat(lambdaSlider.value);
      if (lambdaLabel) {
        const lam = Math.pow(10, currentLogLambda);
        lambdaLabel.textContent = lam < 0.001 ? lam.toExponential(1) : lam.toFixed(4);
      }
    });
  }

  if (noiseSlider) {
    noiseSlider.addEventListener('input', () => {
      noiseLevel = parseFloat(noiseSlider.value);
      if (noiseLabel) noiseLabel.textContent = noiseLevel.toFixed(2);
    });
  }

  if (condSlider) {
    condSlider.addEventListener('input', () => {
      condNumber = parseFloat(condSlider.value);
      if (condLabel) condLabel.textContent = `10^${condNumber.toFixed(1)}`;
    });
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
}
