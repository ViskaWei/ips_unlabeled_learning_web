/**
 * Distribution Matching Failure Demo
 * Shows WHY Wasserstein minimization fails: requires simulating the full
 * particle system at every optimization step → O(N² × steps) total cost.
 * Contrast: self-test loss is a closed-form expression.
 */
import { onLangChange, t } from './i18n';

const canvas = document.getElementById('dist-matching-canvas') as HTMLCanvasElement;
if (canvas) {
  const ctx = canvas.getContext('2d')!;
  const slider = document.getElementById('n-particles-slider') as HTMLInputElement;
  const MAX_N = 100;

  // Conceptual cost model (steps × per-step cost)
  // Label matching: N² cost per step, converges in ~20 steps → total O(N² × 20)
  // Wasserstein: must simulate forward system at each gradient step (costly)
  //              ~1000 steps × N² cost per simulation → total O(1000 × N²)
  // Self-test: SINGLE matrix solve → O(K³) where K = basis size (tiny)
  function computeCosts(N: number) {
    return {
      labelMatching: N * N * 20,
      wasserstein: N * N * 1000,
      selfTest: 100,
    };
  }

  let N = parseInt(slider?.value ?? '20');
  const minCost = 100;
  const maxCost = computeCosts(MAX_N).wasserstein;

  function formatCost(cost: number) {
    if (cost >= 1_000_000) return `${(cost / 1_000_000).toFixed(1)}M`;
    if (cost >= 1_000) return `${(cost / 1_000).toFixed(cost >= 10_000 ? 0 : 1)}K`;
    return `${cost}`;
  }

  function rawCostToWidth(cost: number, trackW: number) {
    const logMin = Math.log10(minCost);
    const logMax = Math.log10(maxCost);
    const logCost = Math.log10(Math.max(cost, minCost));
    return ((logCost - logMin) / (logMax - logMin)) * trackW;
  }

  function draw() {
    const W = canvas.width / window.devicePixelRatio;
    const H = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, W, H);

    const costs = computeCosts(N);
    const padL = Math.max(170, W * 0.28);
    const padR = 28;
    const padT = 28;
    const rowGap = 28;
    const barH = 28;
    const rowH = barH + rowGap;
    const trackX = padL;
    const trackW = Math.max(200, W - padL - padR);
    const axisY = H - 34;

    const bars = [
      {
        label: t('Label Matching', '标签匹配'),
        sublabel: t('Sinkhorn MLE', 'Sinkhorn MLE'),
        cost: costs.labelMatching,
        color: '#94a3b8',
      },
      {
        label: t('Distribution Matching', '分布匹配'),
        sublabel: t('Wasserstein', 'Wasserstein'),
        cost: costs.wasserstein,
        color: '#a78bfa',
      },
      {
        label: t('Self-Test', '自测'),
        sublabel: t('ours', '本文方法'),
        cost: costs.selfTest,
        color: '#22c55e',
      },
    ];

    bars.forEach((bar, i) => {
      const y = padT + i * rowH;
      const width = Math.max(8, rawCostToWidth(bar.cost, trackW));
      const rounded = Math.min(10, barH / 2);

      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.roundRect(trackX, y, trackW, barH, rounded);
      ctx.fill();

      ctx.fillStyle = `${bar.color}22`;
      ctx.beginPath();
      ctx.roundRect(trackX, y, width, barH, rounded);
      ctx.fill();

      ctx.strokeStyle = `${bar.color}cc`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(trackX, y, width, barH, rounded);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.font = '600 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(bar.label, 16, y + 12);

      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(bar.sublabel, 16, y + 27);

      ctx.fillStyle = bar.color;
      ctx.font = '700 11px JetBrains Mono, monospace';
      ctx.textAlign = width > 72 ? 'right' : 'left';
      const labelX = width > 72 ? trackX + width - 10 : trackX + width + 10;
      ctx.fillText(`${formatCost(bar.cost)}${t(' ops', ' 次运算')}`, labelX, y + 19);
    });

    const ticks = [100, 10_000, 1_000_000, maxCost];
    ticks.forEach((tick) => {
      const x = trackX + rawCostToWidth(tick, trackW);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, padT - 8);
      ctx.lineTo(x, axisY - 12);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(formatCost(tick), x, axisY);
    });

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      t('Relative compute budget (fixed log scale)', '相对计算预算（固定对数尺度）'),
      trackX + trackW / 2,
      H - 12,
    );
  }

  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  if (slider) {
    slider.addEventListener('input', () => {
      N = parseInt(slider.value);
      const label = document.getElementById('n-particles-value');
      if (label) label.textContent = N.toString();
      draw();
    });
  }

  resize();
  onLangChange(draw);
  window.addEventListener('resize', resize);
}
