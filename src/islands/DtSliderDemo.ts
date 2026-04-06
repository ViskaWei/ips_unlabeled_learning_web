/**
 * Delta-t Slider Demo — dot-on-gradient gauge showing error severity.
 * Left (green) = low error = good. Right (red) = high error = bad.
 * Uses Reference model (Model E) data from paper Table 2.
 * NN Self-Test (our method) is green.
 */

const vizContainer = document.getElementById('dt-slider-viz');
const slider = document.getElementById('dt-slider') as HTMLInputElement;
const dtValueLabel = document.getElementById('dt-value');

if (vizContainer && slider) {
  const dtLabels = ['0.0001', '0.001', '0.01', '0.1'];

  // Reference model (Model E) data from paper Table 2
  const refData: Record<string, (number | null)[]> = {
    oracle_mle_V:       [0.80, 1.41, 10.44, 11.30],
    oracle_mle_Phi:     [0.35, 5.18, 37.49, 89.38],
    sinkhorn_V:         [1.34, 3.13, 21.64, 45.37],
    sinkhorn_Phi:       [0.82, 7.17, 47.38, 95.78],
    oracle_selftest_V:  [1.35, 0.67, 0.80, 6.84],
    oracle_selftest_Phi:[1.24, 0.74, 1.10, 6.93],
    nn_selftest_V:      [null, 0.91, 1.25, 3.15],
    nn_selftest_Phi:    [null, 1.74, 2.47, 5.80],
  };

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  vizContainer.style.position = 'relative';
  vizContainer.replaceChildren(canvas);

  let currentIdx = 2;
  let animatedValues: Record<string, number> = {};

  const methods = [
    { key: 'nn',       name: 'Self-Test NN ★',      dot: '#22c55e', ring: '#16a34a', label: '#22c55e' },
    { key: 'oracle',   name: 'Self-Test LSE ★',     dot: '#4ade80', ring: '#16a34a', label: '#4ade80' },
    { key: 'sinkhorn', name: 'Sinkhorn MLE',        dot: '#a78bfa', ring: '#7c3aed', label: '#a78bfa' },
    { key: 'mle',      name: 'Labeled MLE',         dot: '#94a3b8', ring: '#64748b', label: '#94a3b8' },
  ];

  interface MethodValues {
    nn_V: number | null; nn_Phi: number | null;
    oracle_V: number | null; oracle_Phi: number | null;
    sinkhorn_V: number | null; sinkhorn_Phi: number | null;
    mle_V: number | null; mle_Phi: number | null;
  }

  function getValues(dtIdx: number): MethodValues {
    return {
      nn_V: refData.nn_selftest_V[dtIdx],
      nn_Phi: refData.nn_selftest_Phi[dtIdx],
      oracle_V: refData.oracle_selftest_V[dtIdx],
      oracle_Phi: refData.oracle_selftest_Phi[dtIdx],
      sinkhorn_V: refData.sinkhorn_V[dtIdx],
      sinkhorn_Phi: refData.sinkhorn_Phi[dtIdx],
      mle_V: refData.oracle_mle_V[dtIdx],
      mle_Phi: refData.oracle_mle_Phi[dtIdx],
    };
  }

  function resize() {
    const rect = vizContainer!.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

  function errorToColor(val: number): string {
    if (val <= 5) return `rgb(${Math.round(lerp(34, 200, val / 5))}, ${Math.round(lerp(197, 180, val / 5))}, ${Math.round(lerp(20, 20, val / 5))})`;
    if (val <= 30) return `rgb(${Math.round(lerp(200, 239, (val - 5) / 25))}, ${Math.round(lerp(180, 100, (val - 5) / 25))}, ${Math.round(lerp(20, 20, (val - 5) / 25))})`;
    return `rgb(239, ${Math.round(lerp(100, 50, Math.min((val - 30) / 70, 1)))}, ${Math.round(lerp(20, 50, Math.min((val - 30) / 70, 1)))})`;
  }

  function drawPanel(
    ctx: CanvasRenderingContext2D,
    x0: number, panelW: number, h: number,
    title: string,
    rows: { method: typeof methods[0]; val: number | null; target: number | null }[],
  ) {
    const padL = 130, padR = 30, padT = 10;
    const rowH = 36, gaugeH = 16;
    const gaugeX = x0 + padL;
    const gaugeW = panelW - padL - padR;
    const maxError = 100;

    let y = padT;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, gaugeX, y + 14);
    y += 24;

    for (const row of rows) {
      const gaugeY = y + (rowH - gaugeH) / 2;

      ctx.fillStyle = row.method.label;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(row.method.name, gaugeX - 10, gaugeY + gaugeH / 2 + 4);

      if (row.val == null) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.beginPath();
        ctx.roundRect(gaugeX, gaugeY, gaugeW, gaugeH, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('N/A', gaugeX + gaugeW / 2, gaugeY + gaugeH / 2 + 4);
        y += rowH;
        continue;
      }

      const grad = ctx.createLinearGradient(gaugeX, 0, gaugeX + gaugeW, 0);
      grad.addColorStop(0, 'rgba(34, 197, 94, 0.15)');
      grad.addColorStop(0.1, 'rgba(34, 197, 94, 0.12)');
      grad.addColorStop(0.3, 'rgba(245, 158, 11, 0.12)');
      grad.addColorStop(0.6, 'rgba(239, 68, 68, 0.12)');
      grad.addColorStop(1, 'rgba(239, 68, 68, 0.2)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(gaugeX, gaugeY, gaugeW, gaugeH, 4);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const goodZoneW = (5 / maxError) * gaugeW;
      ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
      ctx.beginPath();
      ctx.roundRect(gaugeX, gaugeY, goodZoneW, gaugeH, [4, 0, 0, 4]);
      ctx.fill();

      const errorPct = Math.min(row.val / maxError, 1);
      const barW = errorPct * gaugeW;
      ctx.fillStyle = errorToColor(row.val);
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.roundRect(gaugeX, gaugeY, barW, gaugeH, 4);
      ctx.fill();
      ctx.globalAlpha = 1;

      const dotX = gaugeX + errorPct * gaugeW;
      const dotY = gaugeY + gaugeH / 2;
      const dotR = 7;

      ctx.beginPath();
      ctx.arc(dotX, dotY, dotR + 4, 0, Math.PI * 2);
      ctx.fillStyle = `${row.method.dot}33`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = row.method.dot;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
      ctx.strokeStyle = row.method.ring;
      ctx.lineWidth = 2;
      ctx.stroke();

      const valText = `${row.target!.toFixed(1)}%`;
      ctx.fillStyle = row.val > 30 ? '#ef4444' : row.val > 10 ? '#f59e0b' : '#22c55e';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      if (errorPct > 0.85) {
        ctx.textAlign = 'right';
        ctx.fillText(valText, dotX - dotR - 6, dotY + 4);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(valText, Math.min(dotX + dotR + 8, x0 + panelW - padR - 30), dotY + 4);
      }

      y += rowH;
    }

    // Axis
    const axisY = y + 4;
    ctx.fillStyle = '#22c55e';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('0%', gaugeX, axisY);
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'right';
    ctx.fillText('100%', gaugeX + gaugeW, axisY);
  }

  function draw() {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    const vals = getValues(currentIdx);

    for (const [k, target] of Object.entries(vals)) {
      if (target == null) continue;
      if (!(k in animatedValues)) animatedValues[k] = target as number;
      animatedValues[k] += ((target as number) - animatedValues[k]) * 0.12;
    }

    type RowData = { method: typeof methods[0]; val: number | null; target: number | null };

    const vRows: RowData[] = [
      { method: methods[0], val: vals.nn_V != null ? animatedValues.nn_V ?? null : null, target: vals.nn_V },
      { method: methods[1], val: animatedValues.oracle_V ?? null, target: vals.oracle_V },
      { method: methods[2], val: animatedValues.sinkhorn_V ?? null, target: vals.sinkhorn_V },
      { method: methods[3], val: animatedValues.mle_V ?? null, target: vals.mle_V },
    ];
    const phiRows: RowData[] = [
      { method: methods[0], val: vals.nn_Phi != null ? animatedValues.nn_Phi ?? null : null, target: vals.nn_Phi },
      { method: methods[1], val: animatedValues.oracle_Phi ?? null, target: vals.oracle_Phi },
      { method: methods[2], val: animatedValues.sinkhorn_Phi ?? null, target: vals.sinkhorn_Phi },
      { method: methods[3], val: animatedValues.mle_Phi ?? null, target: vals.mle_Phi },
    ];

    const halfW = w / 2;

    // Left panel: ∇V
    drawPanel(ctx, 0, halfW - 8, h, '\u2207V Error', vRows);

    // Vertical separator
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(halfW, 10);
    ctx.lineTo(halfW, h - 40);
    ctx.stroke();

    // Right panel: ∇Φ
    drawPanel(ctx, halfW + 8, halfW - 8, h, '\u2207\u03A6 Error', phiRows);

    // Bottom center: model info + crossover
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Reference model  \u0394t = ${dtLabels[currentIdx]}  (d=2, M=2000, N=10)`, w / 2, h - 28);

    if (currentIdx >= 2) {
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(
        currentIdx === 3
          ? '\u2605 At large \u0394t, self-test is the ONLY viable method'
          : '\u2605 Crossover: self-test begins to dominate',
        w / 2, h - 10,
      );
    }

    requestAnimationFrame(draw);
  }

  slider.addEventListener('input', () => {
    currentIdx = parseInt(slider.value);
    if (dtValueLabel) dtValueLabel.textContent = dtLabels[currentIdx];
  });

  resize();
  window.addEventListener('resize', () => { resize(); });
  draw();
}
