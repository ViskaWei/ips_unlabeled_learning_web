/**
 * Distribution Matching Failure Demo
 * Shows WHY Wasserstein minimization fails: requires simulating the full
 * particle system at every optimization step → O(N² × steps) total cost.
 * Contrast: self-test loss is a closed-form expression.
 */
import { t } from './i18n';

const canvas = document.getElementById('dist-matching-canvas') as HTMLCanvasElement;
if (canvas) {
  const ctx = canvas.getContext('2d')!;

  // Conceptual cost model (log scale, steps × per-step cost)
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

  const slider = document.getElementById('n-particles-slider') as HTMLInputElement;
  let N = parseInt(slider?.value ?? '20');

  function draw() {
    const W = canvas.width / devicePixelRatio;
    const H = canvas.height / devicePixelRatio;
    ctx.clearRect(0, 0, W, H);

    const costs = computeCosts(N);
    const maxCost = costs.wasserstein;
    const barWidth = W / 5;
    const chartH = H - 80;

    const bars = [
      { label: t('Label Matching\n(Sinkhorn MLE)', '标签匹配\n(Sinkhorn MLE)'), cost: costs.labelMatching, color: '#94a3b8' },
      { label: t('Distribution\nMatching (Wasserstein)', '分布匹配\n(Wasserstein)'), cost: costs.wasserstein, color: '#a78bfa' },
      { label: t('Self-Test\n(ours)', '自测\n(本文方法)'), cost: costs.selfTest, color: '#22c55e' },
    ];

    bars.forEach((bar, i) => {
      const x = barWidth * 0.3 + i * (W / 3);
      const height = (bar.cost / maxCost) * chartH * 0.9;
      const y = H - 50 - height;

      ctx.fillStyle = bar.color + '33';
      ctx.fillRect(x, y, barWidth * 0.7, height);
      ctx.strokeStyle = bar.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, barWidth * 0.7, height);

      // Cost label
      ctx.fillStyle = bar.color;
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      const costStr = bar.cost >= 1000 ? `${(bar.cost / 1000).toFixed(0)}K` : `${bar.cost}`;
      ctx.fillText(costStr + t(' ops', ' 次运算'), x + barWidth * 0.35, y - 8);

      // Method label (multi-line)
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '10px Inter, sans-serif';
      bar.label.split('\n').forEach((line, li) => {
        ctx.fillText(line, x + barWidth * 0.35, H - 40 + li * 13);
      });
    });

    // Axes
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H - 50);
    ctx.lineTo(W, H - 50);
    ctx.stroke();

    // Y-axis label
    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('Computational cost (relative)', '计算代价（相对）'), 0, 0);
    ctx.restore();
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
  window.addEventListener('resize', resize);
}
