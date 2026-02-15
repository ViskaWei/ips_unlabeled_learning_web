/**
 * Energy Balance Visualization — animated energy ledger with V/Phi sliders.
 * Shows how wrong potentials break the energy balance.
 */
import { ParticleSystem } from '../sim/euler-maruyama';
import { QuadraticConfinement, PiecewiseInteraction } from '../sim/potentials';

const canvas = document.getElementById('energy-canvas') as HTMLCanvasElement;
const vSlider = document.getElementById('v-scale') as HTMLInputElement;
const phiSlider = document.getElementById('phi-scale') as HTMLInputElement;

if (canvas && vSlider && phiSlider) {
  const ctx = canvas.getContext('2d')!;
  const N = 10;
  const d = 2;
  const sigma = 0.1;
  const dt = 0.005;

  // True potentials
  const trueV = new QuadraticConfinement(-1.0, 2.0);
  const truePhi = new PiecewiseInteraction(-3.0, 2.0);

  // Simulation with true potentials
  const system = new ParticleSystem(trueV, truePhi, sigma, dt, N, d, 77);
  const state = system.initialize(0.8);

  // Running averages for the energy ledger
  let dissipation = 0;
  let diffusion = 0;
  let energyChange = 0;
  let residual = 0;
  const smoothing = 0.95;

  // History for chart
  const maxHistory = 200;
  const residualHistory: number[] = [];

  function computeEnergy(positions: Float64Array, vScale: number, phiScale: number): number {
    let Vsum = 0;
    let Phisum = 0;
    const tmpX = new Float64Array(d);

    for (let i = 0; i < N; i++) {
      for (let k = 0; k < d; k++) tmpX[k] = positions[i * d + k];
      Vsum += trueV.evaluate(tmpX) * vScale;

      for (let j = i + 1; j < N; j++) {
        let rSq = 0;
        for (let k = 0; k < d; k++) {
          const diff = positions[i * d + k] - positions[j * d + k];
          rSq += diff * diff;
        }
        Phisum += truePhi.evaluate(Math.sqrt(rSq)) * phiScale;
      }
    }
    return Vsum / N + Phisum / (N * N);
  }

  function computeDissipation(positions: Float64Array, vScale: number, phiScale: number): number {
    let sum = 0;
    const gradV = new Float64Array(d);
    const diff = new Float64Array(d);
    const tmpX = new Float64Array(d);

    for (let i = 0; i < N; i++) {
      for (let k = 0; k < d; k++) tmpX[k] = positions[i * d + k];
      trueV.gradient(tmpX, gradV);
      for (let k = 0; k < d; k++) gradV[k] *= vScale;

      // Interaction gradient
      let gPhiX = 0, gPhiY = 0;
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        let rSq = 0;
        for (let k = 0; k < d; k++) {
          diff[k] = positions[i * d + k] - positions[j * d + k];
          rSq += diff[k] * diff[k];
        }
        const r = Math.max(Math.sqrt(rSq), 1e-10);
        const dPhiDr = truePhi.gradient(r) * phiScale;
        gPhiX += dPhiDr * diff[0] / r;
        gPhiY += dPhiDr * diff[1] / r;
      }
      gPhiX /= N;
      gPhiY /= N;

      const totalGradX = gradV[0] + gPhiX;
      const totalGradY = gradV[1] + gPhiY;
      sum += totalGradX * totalGradX + totalGradY * totalGradY;
    }
    return sum / N;
  }

  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  // Save previous positions for energy change
  let prevPositions = new Float64Array(state.positions);

  function draw() {
    const w = canvas.width / window.devicePixelRatio;
    const h = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, w, h);

    const vScale = parseFloat(vSlider.value);
    const phiScale = parseFloat(phiSlider.value);

    // Step simulation (using TRUE potentials for dynamics)
    system.step(state);

    // Compute energy terms with GUESSED potentials (scaled)
    const E_prev = computeEnergy(prevPositions, vScale, phiScale);
    const E_curr = computeEnergy(state.positions, vScale, phiScale);
    const dE = E_curr - E_prev;
    const J_diss = computeDissipation(prevPositions, vScale, phiScale) * dt;

    // Smoothed values
    dissipation = smoothing * dissipation + (1 - smoothing) * (0.5 * J_diss);
    energyChange = smoothing * energyChange + (1 - smoothing) * dE;
    const selfTestLoss = dissipation + energyChange; // simplified (ignoring diffusion for visual)
    residual = smoothing * residual + (1 - smoothing) * selfTestLoss;

    residualHistory.push(residual);
    if (residualHistory.length > maxHistory) residualHistory.shift();

    prevPositions.set(state.positions);

    // ─── Draw Layout ───
    const simW = w * 0.4;
    const ledgerX = simW + 30;

    // Left: Particle simulation
    const scale = simW * 0.2;
    const cx = simW / 2;
    const cy = h / 2;

    for (let i = 0; i < N; i++) {
      const sx = cx + state.positions[i * 2] * scale;
      const sy = cy - state.positions[i * 2 + 1] * scale;

      ctx.beginPath();
      ctx.arc(sx, sy, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Right: Energy ledger
    const ledgerW = w - ledgerX - 20;
    const barH = 22;
    const ledgerY = 30;

    // Title
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Energy Ledger', ledgerX, ledgerY);

    // Dissipation bar (red - spending)
    const maxBar = ledgerW * 0.7;
    const dissBar = Math.min(Math.abs(dissipation) * 2000, maxBar);
    const row1Y = ledgerY + 25;

    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fillRect(ledgerX, row1Y, ledgerW, barH);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.fillRect(ledgerX, row1Y, dissBar, barH);
    ctx.fillStyle = '#ef4444';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`Dissipation (spending): ${dissipation.toFixed(5)}`, ledgerX + 5, row1Y + 15);

    // Energy change bar (blue - balance)
    const row2Y = row1Y + barH + 8;
    const eBar = Math.min(Math.abs(energyChange) * 2000, maxBar);

    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.fillRect(ledgerX, row2Y, ledgerW, barH);
    ctx.fillStyle = energyChange < 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(59, 130, 246, 0.6)';
    ctx.fillRect(ledgerX, row2Y, eBar, barH);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText(`Energy change (balance): ${energyChange.toFixed(5)}`, ledgerX + 5, row2Y + 15);

    // Residual (self-test loss)
    const row3Y = row2Y + barH + 15;
    const resColor = Math.abs(residual) < 0.001 ? '#22c55e' : '#ef4444';
    ctx.fillStyle = resColor;
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillText(`Self-test loss: ${residual.toFixed(5)}`, ledgerX, row3Y + 5);

    // Scale labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText(`V scale: ${vScale.toFixed(1)}×  |  Φ scale: ${phiScale.toFixed(1)}×`, ledgerX, row3Y + 25);

    const atTruth = Math.abs(vScale - 1) < 0.05 && Math.abs(phiScale - 1) < 0.05;
    ctx.fillStyle = atTruth ? '#22c55e' : '#f59e0b';
    ctx.fillText(
      atTruth ? '✓ True potentials — loss is negative' : '✗ Wrong potentials — residual grows',
      ledgerX,
      row3Y + 45,
    );

    // Mini chart of residual history
    const chartY = row3Y + 65;
    const chartH = h - chartY - 20;
    if (chartH > 40 && residualHistory.length > 2) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ledgerX, chartY + chartH / 2);
      ctx.lineTo(ledgerX + ledgerW, chartY + chartH / 2);
      ctx.stroke();

      const minR = Math.min(...residualHistory, -0.01);
      const maxR = Math.max(...residualHistory, 0.01);
      const range = maxR - minR || 0.01;

      ctx.beginPath();
      ctx.strokeStyle = resColor;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < residualHistory.length; i++) {
        const x = ledgerX + (i / maxHistory) * ledgerW;
        const y = chartY + chartH - ((residualHistory[i] - minR) / range) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
}
