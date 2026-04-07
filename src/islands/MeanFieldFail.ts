/**
 * Mean-Field Failure Demo
 * Shows that empirical measure is lumpy/discrete for finite N,
 * only converging to smooth density as N → ∞.
 * Slider: N from 5 to 200.
 * At bottom: "Our setting: N = 10"
 */
import { PRNG } from '../sim/prng';
import { t } from './i18n';

const canvas = document.getElementById('mean-field-canvas') as HTMLCanvasElement;
const slider = document.getElementById('mean-field-n-slider') as HTMLInputElement;
const valueLabel = document.getElementById('mean-field-n-value');

if (canvas) {
  const ctx = canvas.getContext('2d')!;
  const prng = new PRNG(42);

  // Sample positions from a 2D Gaussian (what the true density looks like)
  function sampleGaussian2D(n: number): [number, number][] {
    const points: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const u1 = prng.random(), u2 = prng.random();
      const r = Math.sqrt(-2 * Math.log(u1 + 1e-10));
      const theta = 2 * Math.PI * u2;
      points.push([r * Math.cos(theta) * 0.5, r * Math.sin(theta) * 0.4]);
    }
    return points;
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

    const W = canvas.width / devicePixelRatio;
    const H = canvas.height / devicePixelRatio;
    ctx.clearRect(0, 0, W, H);

    // Draw in TWO panels: left = empirical measure (delta spikes), right = smooth density
    const half = W / 2 - 10;
    const scale = Math.min(half, H) * 0.75;
    const cx1 = half / 2, cy = H / 2;
    const cx2 = W / 2 + 10 + half / 2;

    // Divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2, 30);
    ctx.lineTo(W / 2, H - 20);
    ctx.stroke();

    // Panel labels
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t(`Empirical measure μₙ (N=${N})`, `经验测度 μₙ (N=${N})`), cx1, 18);
    ctx.fillText(t('True density ρ (N→∞)', '真实密度 ρ (N→∞)'), cx2, 18);

    // Generate N samples
    const pts = sampleGaussian2D(N);

    // LEFT: empirical measure (delta spikes as dots with spike lines)
    const dotRadius = N > 100 ? 2 : N > 60 ? 3 : 5;
    pts.forEach(([x, y]) => {
      const sx = cx1 + x * scale;
      const rawSy = cy - y * scale;
      const spikeCap = Math.max(8, H * 0.05);
      const sy = Math.max(spikeCap, rawSy);
      // Spike line
      ctx.beginPath();
      ctx.moveTo(sx, H * 0.85);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = 'rgba(79, 156, 249, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Dot
      ctx.beginPath();
      ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#4f9cf9';
      ctx.fill();
    });

    // "Our setting: N=10" fixed annotation when slider > 10
    if (N > 10) {
      const n10x = cx1;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(n10x, 28);
      ctx.lineTo(n10x, H * 0.85);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('Our setting: N=10', '我们的设置：N=10'), n10x, H * 0.85 + 12);
    }

    // RIGHT: smooth density (Gaussian bell curve, 2D projection as 1D cross-section)
    ctx.beginPath();
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const x = -1.5 + (i / steps) * 3;
      const y = Math.exp(-x * x / (2 * 0.25)) / (Math.sqrt(2 * Math.PI) * 0.5);
      const sx = cx2 + x * scale;
      const sy = H * 0.85 - y * scale * 0.5;
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Fill under the curve
    ctx.lineTo(cx2 + 1.5 * scale, H * 0.85);
    ctx.lineTo(cx2 - 1.5 * scale, H * 0.85);
    ctx.closePath();
    ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
    ctx.fill();

    // Annotation
    if (N <= 15) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('⚠ Lumpy! Mean-field approximation invalid here', '⚠ 离散！均场近似在此失效'), cx1, H - 10);
    } else if (N >= 100) {
      ctx.fillStyle = '#22c55e';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('Converging to smooth density — but N=100 is not our regime', '逼近光滑密度——但我们的设置是 N=10'), cx1, H - 10);
    }
  }

  if (slider) slider.addEventListener('input', draw);
  resize();
  window.addEventListener('resize', resize);
}
