/**
 * Euler-Maruyama IPS simulator — ported from core/sde_simulator.py.
 *
 * dX_i = (-grad_V(X_i) - (1/N) sum_j grad_Phi(X_i - X_j)) dt + sigma * dW_i
 */

import type { ConfinementPotential, InteractionPotential } from './potentials';
import { PRNG } from './prng';

export interface ParticleState {
  /** Positions: flat array of length N*d */
  positions: Float64Array;
  N: number;
  d: number;
}

export class ParticleSystem {
  private gradV: Float64Array;
  private gradPhi: Float64Array;
  private diff: Float64Array;
  private noise: Float64Array;
  private gradOut: Float64Array;
  public prng: PRNG;

  constructor(
    public V: ConfinementPotential,
    public Phi: InteractionPotential,
    public sigma: number,
    public dt: number,
    public N: number,
    public d: number,
    seed: number = 42,
  ) {
    this.prng = new PRNG(seed);
    // Pre-allocate work arrays
    this.gradV = new Float64Array(d);
    this.gradPhi = new Float64Array(d);
    this.diff = new Float64Array(d);
    this.noise = new Float64Array(N * d);
    this.gradOut = new Float64Array(d);
  }

  /** Initialize particles from Gaussian distribution */
  initialize(std: number = 1.0): ParticleState {
    const pos = new Float64Array(this.N * this.d);
    for (let i = 0; i < pos.length; i++) {
      pos[i] = std * this.prng.randn();
    }
    return { positions: pos, N: this.N, d: this.d };
  }

  /** Get position of particle i as a view */
  private getParticle(state: ParticleState, i: number): Float64Array {
    return state.positions.subarray(i * this.d, (i + 1) * this.d);
  }

  /** Perform one Euler-Maruyama step in-place */
  step(state: ParticleState): void {
    const { N, d, dt, sigma } = this;
    const sqrtDt = Math.sqrt(dt);

    // Generate noise
    this.prng.randnArray(this.noise);

    for (let i = 0; i < N; i++) {
      const xi = this.getParticle(state, i);

      // grad_V(X_i)
      this.V.gradient(xi, this.gradV);

      // Interaction: (1/N) sum_j grad_Phi(X_i - X_j)
      for (let k = 0; k < d; k++) this.gradPhi[k] = 0;

      if (this.Phi.radial) {
        for (let j = 0; j < N; j++) {
          if (i === j) continue;
          const xj = this.getParticle(state, j);
          let rSq = 0;
          for (let k = 0; k < d; k++) {
            this.diff[k] = xi[k] - xj[k];
            rSq += this.diff[k] * this.diff[k];
          }
          const r = Math.max(Math.sqrt(rSq), 1e-10);
          const dPhiDr = this.Phi.gradient(r);
          for (let k = 0; k < d; k++) {
            this.gradPhi[k] += dPhiDr * this.diff[k] / r;
          }
        }
      } else {
        for (let j = 0; j < N; j++) {
          if (i === j) continue;
          const xj = this.getParticle(state, j);
          for (let k = 0; k < d; k++) this.diff[k] = xi[k] - xj[k];
          this.Phi.gradient(this.diff, this.gradOut);
          for (let k = 0; k < d; k++) this.gradPhi[k] += this.gradOut[k];
        }
      }

      // Mean field
      for (let k = 0; k < d; k++) this.gradPhi[k] /= N;

      // Update: X_new = X + (-gradV - gradPhi) * dt + sigma * sqrt(dt) * noise
      const base = i * d;
      for (let k = 0; k < d; k++) {
        xi[k] += (-this.gradV[k] - this.gradPhi[k]) * dt + sigma * sqrtDt * this.noise[base + k];
      }
    }
  }

  /** Run simulation for nSteps, returning positions at each step */
  simulate(nSteps: number, initStd: number = 1.0): ParticleState[] {
    const state = this.initialize(initStd);
    const trajectory: ParticleState[] = [
      { positions: new Float64Array(state.positions), N: this.N, d: this.d },
    ];

    for (let s = 0; s < nSteps; s++) {
      this.step(state);
      if (s % 10 === 0 || s === nSteps - 1) {
        trajectory.push({
          positions: new Float64Array(state.positions),
          N: this.N,
          d: this.d,
        });
      }
    }

    return trajectory;
  }
}
