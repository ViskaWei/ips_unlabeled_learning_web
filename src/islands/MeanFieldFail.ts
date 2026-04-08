/**
 * Mean-Field Failure Demo — HISTOGRAM VERSION
 *
 * Shows WHY mean-field theory fails at finite N.
 * Blue bars = empirical measure (histogram of N particle positions).
 * Green line = true smooth density (what mean-field assumes you already have).
 * At N=5: only 5 bars — clearly NOT a smooth density.
 * At N=200: histogram starts to look smooth — but paper uses N=10.
 */
import { PRNG } from '../sim/prng';
import { onLangChange, t } from './i18n';

const canvas = document.getElementById('mean-field-canvas') as HTMLCanvasElement;
const slider = document.getElementById('mean-field-n-slider') as HTMLInputElement;
const valueLabel = document.getElementById('mean-field-n-value');

if (canvas) {
  const ctx = canvas.getContext('2d')!;
  const NUM_BINS = 15;
  const X_MIN = -2.2, X_MAX = 2.2;
  const SIGMA = 0.72;

  function gaussianPDF(x: number): number {
    return Math.exp(-x * x / (2 * SIGMA * SIGMA)) / (SIGMA * Math.sqrt(2 * Math.PI));
  }

  // Fixed seed per N for reproducible histograms
  function samplePositions(N: number): number[] {
    const prng = new PRNG(42 + N * 7);
    const pts: number[] = [];
    for (let i = 0; i < N; i++) {
      const u1 = Math.max(prng.random(), 1e-10);
      const u2 = prng.random();
      const r = Math.sqrt(-2 * Math.log(u1));
      pts.push(r * Math.cos(2 * Math.PI * u2) * SIGMA);
    }
    return pts;
  }

  // Normalize histogram to density (area sums to 1)
  function buildHistogram(pts: number[]): number[] {
    const counts = new Array(NUM_BINS).fill(0);
    const binWidth = (X_MAX - X_MIN) / NUM_BINS;
    for (const x of pts) {
      const bin = Math.floor((x - X_MIN) / binWidth);
      if (bin >= 0 && bin < NUM_BINS) counts[bin]++;
    }
    return counts.map(c => c / (pts.length * binWidth));
  }

  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    const N = parseInt(slider?.value ?? '10');
    if (valueLabel) valueLabel.textContent = N.toString();

    const W = canvas.width / window.devicePixelRatio;
    const H = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, W, H);

    const PAD_L = 36, PAD_R = 16, PAD_T = 38, PAD_B = 52;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;
    const binWidth = (X_MAX - X_MIN) / NUM_BINS;

    const pts = samplePositions(N);
    const hist = buildHistogram(pts);
    const maxPDF = gaussianPDF(0) * 1.25;

    const toSX = (x: number) => PAD_L + ((x - X_MIN) / (X_MAX - X_MIN)) * chartW;
    const toSY = (d: number) => PAD_T + chartH * (1 - Math.min(d, maxPDF) / maxPDF);

    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      t('Empirical measure (blue bars) vs true smooth density (green curve)', '经验测度（蓝色条形）vs 真实光滑密度（绿色曲线）'),
      W / 2, 14,
    );

    // X-axis
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, PAD_T + chartH);
    ctx.lineTo(PAD_L + chartW, PAD_T + chartH);
    ctx.stroke();

    // X-axis ticks
    [-1.5, -1, 0, 1, 1.5].forEach(tick => {
      const sx = toSX(tick);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tick.toFixed(1), sx, PAD_T + chartH + 11);
    });

    // Histogram bars (empirical measure — blue)
    for (let i = 0; i < NUM_BINS; i++) {
      const x0 = toSX(X_MIN + i * binWidth);
      const x1 = toSX(X_MIN + (i + 1) * binWidth);
      const barTopY = toSY(hist[i]);
      const barBotY = PAD_T + chartH;
      const barH_px = Math.max(0, barBotY - barTopY);
      if (barH_px < 0.5) continue;
      ctx.fillStyle = 'rgba(79, 156, 249, 0.55)';
      ctx.fillRect(x0 + 1, barTopY, x1 - x0 - 2, barH_px);
      ctx.strokeStyle = 'rgba(79, 156, 249, 0.85)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 1, barTopY, x1 - x0 - 2, barH_px);
    }

    // True smooth density — green curve (always shown)
    ctx.beginPath();
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const x = X_MIN + (i / steps) * (X_MAX - X_MIN);
      const sy = toSY(gaussianPDF(x));
      if (i === 0) ctx.moveTo(toSX(x), sy); else ctx.lineTo(toSX(x), sy);
    }
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Y-axis label
    ctx.save();
    ctx.translate(12, PAD_T + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('density', '密度'), 0, 0);
    ctx.restore();

    // Legend
    const lx = PAD_L + 8, ly = PAD_T + 8;
    ctx.fillStyle = 'rgba(79,156,249,0.55)';
    ctx.fillRect(lx, ly, 12, 10);
    ctx.strokeStyle = 'rgba(79,156,249,0.85)'; ctx.lineWidth = 1;
    ctx.strokeRect(lx, ly, 12, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(t(`Empirical (N=${N})`, `经验测度 (N=${N})`), lx + 16, ly + 9);

    ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, ly + 22); ctx.lineTo(lx + 12, ly + 22); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText(t('True density (N→∞)', '真实密度 (N→∞)'), lx + 16, ly + 26);

    // Bottom annotation
    const annotY = PAD_T + chartH + 34;
    ctx.textAlign = 'center';
    if (N <= 10) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(
        t(`N=${N}: only ${N} bars — clearly discrete. Mean-field invalid here.`, `N=${N}：只有 ${N} 个条形——明显是离散的。均场近似在此失效。`),
        W / 2, annotY,
      );
    } else if (N <= 50) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(
        t(`N=${N}: lumpy histogram ≠ smooth density. Paper uses N=10 (even lumpier).`, `N=${N}：颗粒状直方图 ≠ 光滑密度。论文用 N=10（更加离散）。`),
        W / 2, annotY,
      );
    } else if (N < 150) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(
        t(`N=${N}: smoother — but paper uses N=10, not N=${N}.`, `N=${N}：更光滑了——但论文用的是 N=10，不是 N=${N}。`),
        W / 2, annotY,
      );
    } else {
      ctx.fillStyle = 'rgba(100,200,100,0.8)';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(
        t(`N=${N}: histogram ≈ density (N→∞ regime) — but irrelevant. Paper: N=10.`, `N=${N}：直方图 ≈ 密度（N→∞ 范围）——但与论文无关。论文：N=10。`),
        W / 2, annotY,
      );
    }
  }

  if (slider) slider.addEventListener('input', draw);
  onLangChange(draw);
  resize();
  window.addEventListener('resize', resize);
}
