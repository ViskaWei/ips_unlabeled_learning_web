/**
 * Energy Balance Visualization — Self-test loss running average.
 *
 * KEY INSIGHT: E[L(V*, Φ*)] = −½ E[J_diss · Δt] < 0 (always negative at true potentials).
 * This visualization shows a RUNNING AVERAGE converging BELOW ZERO when sliders are at 1.0.
 * When V or Φ sliders deviate from 1.0, the average shifts UPWARD toward zero or positive.
 *
 * The self-test loss formula:
 *   L = ½ J_diss Δt − (σ²/2) J_diff Δt + [E_f(X_{t+Δt}) − E_f(X_t)]
 * where:
 *   J_diss = (1/N) Σᵢ |∇V(Xᵢ) + (1/N)Σⱼ≠ᵢ ∇Φ(Xᵢ−Xⱼ)|²  (≥ 0)
 *   J_diff = (1/N) Σᵢ ΔV(Xᵢ) + (1/N²) Σᵢ≠ⱼ ΔΦ(Xᵢ−Xⱼ)
 *   E_f(X) = (1/N) Σᵢ V(Xᵢ) + (1/2N²) Σᵢ≠ⱼ Φ(Xᵢ−Xⱼ)
 *
 * Uses RING BUFFER of 300 samples for running mean instead of slow exponential smoothing.
 */
import { ParticleSystem } from '../sim/euler-maruyama';
import { MODELS } from '../sim/potentials';
import { onLangChange, t } from './i18n';

const canvas = document.getElementById('energy-canvas') as HTMLCanvasElement;
const vSlider = document.getElementById('v-scale') as HTMLInputElement;
const phiSlider = document.getElementById('phi-scale') as HTMLInputElement;

if (canvas && vSlider && phiSlider) {
  const ctx = canvas.getContext('2d')!;
  const N = 4;
  const d = 2;
  const ref = MODELS.model_e;
  const sigma = 0.25;
  const dt = 0.008;

  const trueV = ref.V;
  const truePhi = ref.Phi;

  const system = new ParticleSystem(trueV, truePhi, sigma, dt, N, d, 77);
  const state = system.initialize(1.0);
  for (let i = 0; i < 500; i++) system.step(state);  // Long warmup for equilibrium

  // Ring buffer for self-test loss samples
  const BUFFER = 300;
  const lossBuf: number[] = [];
  // Chart history of running means
  const CHART_LEN = 200;
  const meanHistory: number[] = [];

  // Energy: E_f(X; V_s, Φ_s) = (1/N) Σᵢ V_s(Xᵢ) + (1/2N²) Σᵢ≠ⱼ Φ_s(Xᵢ−Xⱼ)
  function computeEf(positions: Float64Array, vScale: number, phiScale: number): number {
    let Vsum = 0, Phisum = 0;
    const tmp = new Float64Array(d);
    for (let i = 0; i < N; i++) {
      for (let k = 0; k < d; k++) tmp[k] = positions[i * d + k];
      Vsum += trueV.evaluate(tmp) * vScale;
      for (let j = i + 1; j < N; j++) {
        let rSq = 0;
        for (let k = 0; k < d; k++) {
          const dif = positions[i * d + k] - positions[j * d + k];
          rSq += dif * dif;
        }
        Phisum += (truePhi as any).evaluate(Math.sqrt(rSq)) * phiScale;
      }
    }
    return Vsum / N + Phisum / (N * N);
  }

  // J_diss = (1/N) Σᵢ |∇V(Xᵢ) + (1/N)Σⱼ≠ᵢ ∇Φ(Xᵢ−Xⱼ)|²
  function computeJdiss(positions: Float64Array, vScale: number, phiScale: number): number {
    let sum = 0;
    const gradV = new Float64Array(d);
    const diff = new Float64Array(d);
    const tmpX = new Float64Array(d);
    for (let i = 0; i < N; i++) {
      for (let k = 0; k < d; k++) tmpX[k] = positions[i * d + k];
      trueV.gradient(tmpX, gradV);
      let gx = gradV[0] * vScale, gy = gradV[1] * vScale;
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        let rSq = 0;
        for (let k = 0; k < d; k++) { diff[k] = positions[i * d + k] - positions[j * d + k]; rSq += diff[k] * diff[k]; }
        const r = Math.max(Math.sqrt(rSq), 1e-10);
        const dPhi = ((truePhi as any).gradient(r) as number) * phiScale / N;
        gx += dPhi * diff[0] / r;
        gy += dPhi * diff[1] / r;
      }
      sum += gx * gx + gy * gy;
    }
    return sum / N;
  }

  // J_diff = (1/N) Σᵢ ΔV(Xᵢ) + (1/N²) Σᵢ≠ⱼ ΔΦ(Xᵢ−Xⱼ)
  function computeJdiff(positions: Float64Array, vScale: number, phiScale: number): number {
    const h = 1e-4;
    const tmp = new Float64Array(d), tp = new Float64Array(d), tm = new Float64Array(d);
    let lapV = 0;
    for (let i = 0; i < N; i++) {
      for (let k = 0; k < d; k++) tmp[k] = positions[i * d + k];
      const v0 = trueV.evaluate(tmp);
      for (let k = 0; k < d; k++) {
        tp.set(tmp); tp[k] += h;
        tm.set(tmp); tm[k] -= h;
        lapV += (trueV.evaluate(tp) + trueV.evaluate(tm) - 2 * v0) / (h * h);
      }
    }
    let lapPhi = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        let rSq = 0;
        for (let k = 0; k < d; k++) { const dif = positions[i * d + k] - positions[j * d + k]; rSq += dif * dif; }
        const r = Math.max(Math.sqrt(rSq), 1e-10);
        const rp = r + h, rm = Math.max(r - h, 1e-10);
        const d2 = (((truePhi as any).gradient(rp) as number) - ((truePhi as any).gradient(rm) as number)) / (rp - rm);
        lapPhi += d2 + (d - 1) / r * ((truePhi as any).gradient(r) as number);
      }
    }
    return vScale * lapV / N + phiScale * lapPhi / (N * N);
  }

  function resize() {
    const rect = canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const prevPos = new Float64Array(state.positions);

  function draw() {
    const W = canvas.width / window.devicePixelRatio;
    const H = canvas.height / window.devicePixelRatio;
    ctx.clearRect(0, 0, W, H);

    const vScale = parseFloat(vSlider.value);
    const phiScale = parseFloat(phiSlider.value);

    // Step ONE simulation step, compute instantaneous loss
    const Ef_prev = computeEf(prevPos, vScale, phiScale);
    system.step(state);
    const Ef_curr = computeEf(state.positions, vScale, phiScale);
    const Jdiss = computeJdiss(prevPos, vScale, phiScale);
    const Jdiff = computeJdiff(prevPos, vScale, phiScale);
    // L_inst = ½ J_diss Δt − (σ²/2) J_diff Δt + δE_f
    const L_inst = 0.5 * Jdiss * dt - (sigma * sigma / 2) * Jdiff * dt + (Ef_curr - Ef_prev);
    prevPos.set(state.positions);

    lossBuf.push(L_inst);
    if (lossBuf.length > BUFFER) lossBuf.shift();

    const runMean = lossBuf.reduce((a, b) => a + b, 0) / lossBuf.length;
    meanHistory.push(runMean);
    if (meanHistory.length > CHART_LEN) meanHistory.shift();

    const atTruth = Math.abs(vScale - 1) < 0.08 && Math.abs(phiScale - 1) < 0.08;
    const meanColor = runMean < -0.0001 ? '#22c55e' : runMean < 0.0001 ? '#f59e0b' : '#ef4444';

    // ── Layout ────────────────────────────────────────────────────
    const simW = Math.min(W * 0.38, 220);
    const rX = simW + 24;
    const rW = W - rX - 16;

    // ── Left: Particle simulation ─────────────────────────────────
    const scale = Math.min(simW, H) * 0.36;
    const cx = simW / 2, cy = H * 0.45;

    // Color particles green (correct) → red (wrong)
    const err = Math.min(1, (Math.abs(vScale - 1) + Math.abs(phiScale - 1)) / 2);
    const pR = Math.round(34 + 205 * err), pG = Math.round(197 - 150 * err), pB = 68;
    for (let i = 0; i < N; i++) {
      const sx = cx + state.positions[i * 2] * scale;
      const sy = cy - state.positions[i * 2 + 1] * scale;
      ctx.beginPath();
      ctx.arc(sx, sy, 14, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${pR},${pG},${pB},0.85)`;
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('V×' + vScale.toFixed(1) + '  Φ×' + phiScale.toFixed(1), 'V×' + vScale.toFixed(1) + '  Φ×' + phiScale.toFixed(1)), cx, H * 0.9);

    // ── Right top: Gauge bar ──────────────────────────────────────
    const gaugeY = 20, gaugeH = 28;
    const GAUGE_RANGE = 0.006;   // ±0.006 range
    const zeroPx = rX + rW * 0.5;
    const scalePx = rW / (2 * GAUGE_RANGE);

    // Background track
    ctx.fillStyle = 'rgba(239,68,68,0.12)';
    ctx.fillRect(zeroPx, gaugeY, rX + rW - zeroPx - 4, gaugeH);
    ctx.fillStyle = 'rgba(34,197,94,0.12)';
    ctx.fillRect(rX + 4, gaugeY, zeroPx - rX - 4, gaugeH);

    // Mean marker
    const markerX = Math.max(rX + 6, Math.min(rX + rW - 6, zeroPx + runMean * scalePx));
    ctx.fillStyle = meanColor;
    ctx.fillRect(markerX - 3, gaugeY, 6, gaugeH);

    // Zero line
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(zeroPx, gaugeY - 4); ctx.lineTo(zeroPx, gaugeY + gaugeH + 4); ctx.stroke();

    // Gauge labels
    ctx.fillStyle = '#22c55e'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'right';
    ctx.fillText(t('negative (correct)', '负值（正确）'), zeroPx - 4, gaugeY + 18);
    ctx.fillStyle = '#ef4444'; ctx.textAlign = 'left';
    ctx.fillText(t('positive (wrong)', '正值（错误）'), zeroPx + 4, gaugeY + 18);

    // Running mean value
    ctx.fillStyle = meanColor;
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      t(`Running avg L(V,Φ) = ${runMean.toFixed(5)} (last ${lossBuf.length} steps)`,
        `平均 L(V,Φ) = ${runMean.toFixed(5)}（最近 ${lossBuf.length} 步）`),
      rX + rW / 2, gaugeY + gaugeH + 16,
    );

    // Status message
    ctx.fillStyle = atTruth ? '#22c55e' : '#f59e0b';
    ctx.font = '10px Inter, sans-serif';
    const msg = atTruth
      ? t('✓ True potentials: avg converges to −½⟨J_diss⟩Δt < 0', '✓ 真实势函数：均值收敛到 −½⟨J_diss⟩Δt < 0')
      : t('Perturbed potentials: loss shifts toward 0 or positive', '扰动势函数：损失趋向 0 或正值');
    ctx.fillText(msg, rX + rW / 2, gaugeY + gaugeH + 32);

    // ── Right bottom: time series chart ──────────────────────────
    const chartY = gaugeY + gaugeH + 50;
    const chartH_px = H - chartY - 20;
    if (chartH_px > 40 && meanHistory.length > 2) {
      // Chart background
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(rX, chartY, rW, chartH_px);

      // Zero line
      const zeroY = chartY + chartH_px / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(rX, zeroY); ctx.lineTo(rX + rW, zeroY); ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText('0', rX - 2, zeroY + 3);

      // Plot running mean history
      const minM = Math.min(...meanHistory, -GAUGE_RANGE * 0.5);
      const maxM = Math.max(...meanHistory, GAUGE_RANGE * 0.5);
      const rangeM = Math.max(maxM - minM, 0.001);
      ctx.beginPath();
      ctx.strokeStyle = meanColor;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < meanHistory.length; i++) {
        const x = rX + (i / CHART_LEN) * rW;
        const y = chartY + chartH_px - ((meanHistory[i] - minM) / rangeM) * chartH_px;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(t('Running mean over time →', '随时间的滑动均值 →'), rX + 4, chartY + chartH_px - 4);
    }

    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  onLangChange(() => {});
  draw();
}
