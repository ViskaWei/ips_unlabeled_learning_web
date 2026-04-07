/**
 * Loss Landscape — shows self-test loss vs squared residual.
 * Illustrates why the (1/2) coefficient breaks the V=Phi=0 degeneracy.
 */

const canvas = document.getElementById('loss-landscape-canvas') as HTMLCanvasElement;

if (canvas) {
  const ctx = canvas.getContext('2d')!;

  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    draw();
  }

  function draw() {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    const padL = 60, padR = 30, padT = 40, padB = 50;
    const plotW = (w - padL - padR - 40) / 2;
    const plotH = h - padT - padB;

    // Two panels: Left = squared, Right = self-test
    const panels = [
      { x: padL, label: '|Residual|² (degenerate)', color: '#ef4444', fn: 'squared' },
      { x: padL + plotW + 40, label: 'Self-Test Loss (ours)', color: '#3b82f6', fn: 'selftest' },
    ];

    // Scale factor s: V = s*V*, Phi = s*Phi*
    // At s=1: true parameters. At s=0: trivial solution.
    const J_diss = 2.0;

    // Loss functions:
    // Squared residual: residual = (J_diss/2)*s*(s-1), loss = residual²
    //   → double well: loss=0 at BOTH s=0 and s=1 (degenerate!)
    // Self-test: L(s) = (J_diss/2)*s² - J_diss*s
    //   → single well: L(0)=0, L(1)=-J_diss/2 < 0 (true minimum is negative)
    function computeLoss(fnName: string, s: number): number {
      if (fnName === 'squared') {
        const residual = 0.5 * J_diss * s * (s - 1);
        return residual * residual;
      } else {
        return 0.5 * s * s * J_diss - s * J_diss;
      }
    }

    for (const panel of panels) {
      const { x: px, label, color, fn: fnName } = panel;

      // Axes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, padT + plotH);
      ctx.lineTo(px + plotW, padT + plotH);
      ctx.stroke();

      // Zero line
      const zeroY = padT + plotH * 0.4; // 40% from top = zero
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, zeroY);
      ctx.lineTo(px + plotW, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('0', px - 5, zeroY + 4);

      ctx.textAlign = 'center';
      ctx.fillText(label, px + plotW / 2, padT - 10);

      // X-axis labels
      ctx.fillText('0', px, padT + plotH + 18);
      ctx.fillText('scale s', px + plotW / 2, padT + plotH + 35);
      ctx.fillText('1 (true)', px + plotW * 0.5, padT + plotH + 18);
      ctx.fillText('2', px + plotW, padT + plotH + 18);

      // Draw curve
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;

      const nPts = 200;
      for (let i = 0; i <= nPts; i++) {
        const s = (i / nPts) * 2.0; // scale from 0 to 2
        const sx = px + (i / nPts) * plotW;

        const loss = computeLoss(fnName, s);

        // Map loss to screen
        const lossScale = fnName === 'squared' ? 1.2 : 1.5;
        const sy = zeroY - loss * (plotH * 0.3) * lossScale;
        const clampedY = Math.max(padT, Math.min(padT + plotH, sy));

        if (i === 0) ctx.moveTo(sx, clampedY);
        else ctx.lineTo(sx, clampedY);
      }
      ctx.stroke();

      // Mark special points
      const markPoint = (s: number, label: string, markerColor: string) => {
        const sx = px + (s / 2.0) * plotW;
        const loss = computeLoss(fnName, s);
        const lossScale = fnName === 'squared' ? 1.2 : 1.5;
        const sy = Math.max(padT, Math.min(padT + plotH, zeroY - loss * (plotH * 0.3) * lossScale));

        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = markerColor;
        ctx.fill();

        ctx.fillStyle = markerColor;
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, sx, sy - 12);
      };

      // Mark s=0 (trivial) and s=1 (true)
      markPoint(0, 's=0', '#f59e0b');
      markPoint(1, 's=1 (true)', '#22c55e');

      // For squared: both are minima (problem!)
      if (fnName === 'squared') {
        ctx.fillStyle = '#ef4444';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Both are minima!', px + plotW / 2, padT + plotH - 10);
      } else {
        ctx.fillStyle = '#22c55e';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Only true minimum is negative', px + plotW / 2, padT + plotH - 10);
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);
}
