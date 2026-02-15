/**
 * Delta-t Slider Demo — dot-on-gradient gauge showing error severity.
 * Left (green) = low error = good. Right (red) = high error = bad.
 * NN Self-Test (our method) is green.
 */

const vizContainer = document.getElementById('dt-slider-viz');
const slider = document.getElementById('dt-slider') as HTMLInputElement;
const dtValueLabel = document.getElementById('dt-value');

if (vizContainer && slider) {
  const dtLabels = ['0.001', '0.01', '0.1'];

  // Model A data from paper Table 1
  const modelAData = {
    oracle_mle_V:       [6.08, 20.3, 0.49],
    oracle_mle_Phi:     [12.5, 52.9, 92.2],
    oracle_selftest_V:  [0.78, 0.82, 8.03],
    oracle_selftest_Phi:[1.72, 2.69, 2.84],
    nn_selftest_V:      [0.45, 1.95, 5.69],
    nn_selftest_Phi:    [3.81, 4.03, 8.86],
  };

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  vizContainer.style.position = 'relative';
  vizContainer.replaceChildren(canvas);

  let currentIdx = 1;
  // For smooth animation
  let animatedValues: Record<string, number> = {};

  const methods = [
    { key: 'nn',      name: 'NN Self-Test (ours)', dot: '#22c55e', ring: '#16a34a', label: '#22c55e' },
    { key: 'oracle',  name: 'Oracle Self-Test',    dot: '#f59e0b', ring: '#d97706', label: '#f59e0b' },
    { key: 'mle',     name: 'Oracle MLE',          dot: '#94a3b8', ring: '#64748b', label: '#94a3b8' },
  ];

  function getValues(dtIdx: number) {
    return {
      nn_V: modelAData.nn_selftest_V[dtIdx],
      nn_Phi: modelAData.nn_selftest_Phi[dtIdx],
      oracle_V: modelAData.oracle_selftest_V[dtIdx],
      oracle_Phi: modelAData.oracle_selftest_Phi[dtIdx],
      mle_V: modelAData.oracle_mle_V[dtIdx],
      mle_Phi: modelAData.oracle_mle_Phi[dtIdx],
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
    if (val <= 5) return `rgb(${Math.round(lerp(34, 200, val / 5))}, ${Math.round(lerp(197, 180, val / 5))}, ${Math.round(lerp(94, 20, val / 5))})`;
    if (val <= 30) return `rgb(${Math.round(lerp(200, 239, (val - 5) / 25))}, ${Math.round(lerp(180, 100, (val - 5) / 25))}, ${Math.round(lerp(20, 20, (val - 5) / 25))})`;
    return `rgb(239, ${Math.round(lerp(100, 50, Math.min((val - 30) / 70, 1)))}, ${Math.round(lerp(20, 50, Math.min((val - 30) / 70, 1)))})`;
  }

  function draw() {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    const vals = getValues(currentIdx);

    // Animate values smoothly
    for (const [k, target] of Object.entries(vals)) {
      if (!(k in animatedValues)) animatedValues[k] = target;
      animatedValues[k] += (target - animatedValues[k]) * 0.12;
    }

    const padL = 150, padR = 40, padT = 10, padB = 20;
    const rowH = 44;
    const gaugeH = 18;
    const gaugeW = w - padL - padR;
    const maxError = 100; // scale cap

    const panels = [
      { title: '\u2207V Error', rows: [
        { method: methods[0], val: animatedValues.nn_V, target: vals.nn_V },
        { method: methods[1], val: animatedValues.oracle_V, target: vals.oracle_V },
        { method: methods[2], val: animatedValues.mle_V, target: vals.mle_V },
      ]},
      { title: '\u2207\u03A6 Error', rows: [
        { method: methods[0], val: animatedValues.nn_Phi, target: vals.nn_Phi },
        { method: methods[1], val: animatedValues.oracle_Phi, target: vals.oracle_Phi },
        { method: methods[2], val: animatedValues.mle_Phi, target: vals.mle_Phi },
      ]},
    ];

    let y = padT;

    for (const panel of panels) {
      // Panel title
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(panel.title, padL, y + 14);
      y += 22;

      for (const row of panel.rows) {
        const gaugeY = y + (rowH - gaugeH) / 2;

        // Method label
        ctx.fillStyle = row.method.label;
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(row.method.name, padL - 12, gaugeY + gaugeH / 2 + 4);

        // Gauge background: green → yellow → red gradient
        const grad = ctx.createLinearGradient(padL, 0, padL + gaugeW, 0);
        grad.addColorStop(0, 'rgba(34, 197, 94, 0.15)');
        grad.addColorStop(0.1, 'rgba(34, 197, 94, 0.12)');
        grad.addColorStop(0.3, 'rgba(245, 158, 11, 0.12)');
        grad.addColorStop(0.6, 'rgba(239, 68, 68, 0.12)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0.2)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(padL, gaugeY, gaugeW, gaugeH, 4);
        ctx.fill();

        // Gauge outline
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // "Good" zone indicator: subtle green tint on left
        const goodZoneW = (5 / maxError) * gaugeW; // 0-5% is "good"
        ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
        ctx.beginPath();
        ctx.roundRect(padL, gaugeY, goodZoneW, gaugeH, [4, 0, 0, 4]);
        ctx.fill();

        // Filled bar from left to error position — colored by error severity
        const errorPct = Math.min(row.val / maxError, 1);
        const barW = errorPct * gaugeW;
        const barColor = errorToColor(row.val);

        ctx.fillStyle = barColor;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.roundRect(padL, gaugeY, barW, gaugeH, 4);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Dot marker at error position
        const dotX = padL + errorPct * gaugeW;
        const dotY = gaugeY + gaugeH / 2;
        const dotR = 8;

        // Glow
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotR + 4, 0, Math.PI * 2);
        ctx.fillStyle = `${row.method.dot}33`;
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
        ctx.fillStyle = row.method.dot;
        ctx.fill();

        // Ring
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
        ctx.strokeStyle = row.method.ring;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Value label next to dot
        const valText = `${row.target.toFixed(1)}%`;
        const valX = dotX + dotR + 8;
        ctx.fillStyle = row.val > 30 ? '#ef4444' : row.val > 10 ? '#f59e0b' : '#22c55e';
        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        // If dot is too far right, put label on the left side
        if (errorPct > 0.85) {
          ctx.textAlign = 'right';
          ctx.fillText(valText, dotX - dotR - 6, dotY + 4);
        } else {
          ctx.fillText(valText, valX, dotY + 4);
        }

        y += rowH;
      }

      y += 8; // gap between panels
    }

    // Axis labels at bottom
    const axisY = y + 2;
    ctx.fillStyle = '#22c55e';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Good (0%)', padL, axisY);

    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'right';
    ctx.fillText('Bad (100%)', padL + gaugeW, axisY);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.textAlign = 'center';
    ctx.fillText('10%', padL + gaugeW * 0.1, axisY);
    ctx.fillText('50%', padL + gaugeW * 0.5, axisY);

    // Subtitle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Model A at \u0394t = ${dtLabels[currentIdx]}  (d=2, M=2000, N=10)`, w / 2, axisY + 20);

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
