/**
 * Shuffle Demo — two side-by-side snapshots with animated label scrambling.
 */
import { PRNG } from '../sim/prng';

const canvas = document.getElementById('shuffle-demo-canvas') as HTMLCanvasElement;
const shuffleBtn = document.getElementById('shuffle-btn') as HTMLButtonElement;

if (canvas && shuffleBtn) {
  const ctx = canvas.getContext('2d')!;
  const N = 8;
  const prng = new PRNG(123);

  const COLORS = [
    '#ef4444', '#f59e0b', '#22c55e', '#3b82f6',
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  ];

  // Two snapshots: slightly shifted positions
  const snapshot1: [number, number][] = [];
  const snapshot2: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const x = -0.8 + prng.random() * 1.6;
    const y = -0.7 + prng.random() * 1.4;
    snapshot1.push([x, y]);
    snapshot2.push([x + (prng.random() - 0.5) * 0.6, y + (prng.random() - 0.5) * 0.6]);
  }

  // Current matching: initially correct (i -> i)
  let matching = Array.from({ length: N }, (_, i) => i);
  let shuffled = false;
  let animProgress = 1; // 0 = animating, 1 = done

  shuffleBtn.addEventListener('click', () => {
    if (animProgress < 1) return;
    if (shuffled) {
      // Reset to correct matching
      matching = Array.from({ length: N }, (_, i) => i);
      shuffled = false;
    } else {
      // Fisher-Yates shuffle
      matching = Array.from({ length: N }, (_, i) => i);
      for (let i = N - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [matching[i], matching[j]] = [matching[j], matching[i]];
      }
      shuffled = true;
    }
    animProgress = 0;
  });

  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  function toScreen(x: number, y: number, cx: number, cy: number, scale: number): [number, number] {
    return [cx + x * scale, cy - y * scale];
  }

  function draw() {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    const halfW = w / 2;
    const scale = Math.min(halfW, h) * 0.35;

    ctx.clearRect(0, 0, w, h);

    // Update animation
    if (animProgress < 1) {
      animProgress = Math.min(1, animProgress + 0.03);
    }

    // Left panel: t₁
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(0, 0, halfW - 1, h);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Snapshot t₁', halfW / 2, 25);

    // Right panel: t₂
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(halfW + 1, 0, halfW, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('Snapshot t₂', halfW + halfW / 2, 25);

    // Draw matching lines
    for (let i = 0; i < N; i++) {
      const [x1, y1] = toScreen(snapshot1[i][0], snapshot1[i][1], halfW / 2, h / 2, scale);
      const j = matching[i];
      const [x2, y2] = toScreen(snapshot2[j][0], snapshot2[j][1], halfW + halfW / 2, h / 2, scale);

      // Interpolate line position during animation
      const correctJ = i;
      const [cx2, cy2] = toScreen(snapshot2[correctJ][0], snapshot2[correctJ][1], halfW + halfW / 2, h / 2, scale);
      const lx2 = cx2 + (x2 - cx2) * animProgress;
      const ly2 = cy2 + (y2 - cy2) * animProgress;

      const isCorrect = j === i;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(lx2, ly2);
      ctx.strokeStyle = isCorrect || !shuffled
        ? 'rgba(34, 197, 94, 0.4)'
        : 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw particles
    const r = 14;
    for (let i = 0; i < N; i++) {
      // Left (t₁)
      const [x1, y1] = toScreen(snapshot1[i][0], snapshot1[i][1], halfW / 2, h / 2, scale);
      ctx.beginPath();
      ctx.arc(x1, y1, r, 0, Math.PI * 2);
      ctx.fillStyle = COLORS[i];
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${i + 1}`, x1, y1);

      // Right (t₂) — show matched color during shuffle
      const j = matching[i];
      const [x2, y2] = toScreen(snapshot2[i][0], snapshot2[i][1], halfW + halfW / 2, h / 2, scale);
      ctx.beginPath();
      ctx.arc(x2, y2, r, 0, Math.PI * 2);
      ctx.fillStyle = shuffled ? '#475569' : COLORS[i]; // gray when shuffled (unknown identity)
      ctx.fill();
      if (!shuffled) {
        ctx.fillStyle = 'white';
        ctx.fillText(`${i + 1}`, x2, y2);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('?', x2, y2);
      }
    }

    // Label
    if (shuffled && animProgress >= 1) {
      const correct = matching.filter((j, i) => j === i).length;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Random matching: ${correct}/${N} correct`, w / 2, h - 15);
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
}
