/**
 * Potential functions for IPS simulation — ported from core/potentials.py.
 * All potentials implement evaluate() and gradient() for both V and Phi.
 */

export interface ConfinementPotential {
  /** V(x) for x of shape [d] */
  evaluate(x: Float64Array): number;
  /** grad V(x) for x of shape [d], writes into out */
  gradient(x: Float64Array, out: Float64Array): void;
}

export interface RadialInteraction {
  radial: true;
  /** Phi(r) for scalar distance r */
  evaluate(r: number): number;
  /** dPhi/dr for scalar distance r */
  gradient(r: number): number;
}

export interface VectorInteraction {
  radial: false;
  /** Phi(z) for displacement z of shape [d] */
  evaluate(z: Float64Array): number;
  /** nabla_z Phi(z), writes into out */
  gradient(z: Float64Array, out: Float64Array): void;
}

export type InteractionPotential = RadialInteraction | VectorInteraction;

// ─── Confinement Potentials ───────────────────────────────

/** V(x) = 0.5 * k * |x|^2 */
export class HarmonicPotential implements ConfinementPotential {
  constructor(public k: number = 1.0) {}

  evaluate(x: Float64Array): number {
    let s = 0;
    for (let i = 0; i < x.length; i++) s += x[i] * x[i];
    return 0.5 * this.k * s;
  }

  gradient(x: Float64Array, out: Float64Array): void {
    for (let i = 0; i < x.length; i++) out[i] = this.k * x[i];
  }
}

/** V(x) = alpha1/2 * |x| + alpha2 * |x|^2  (Model A) */
export class QuadraticConfinement implements ConfinementPotential {
  constructor(public alpha1: number = -1.0, public alpha2: number = 2.0) {}

  evaluate(x: Float64Array): number {
    let rSq = 0;
    for (let i = 0; i < x.length; i++) rSq += x[i] * x[i];
    const r = Math.sqrt(rSq);
    return 0.5 * this.alpha1 * r + this.alpha2 * rSq;
  }

  gradient(x: Float64Array, out: Float64Array): void {
    let rSq = 0;
    for (let i = 0; i < x.length; i++) rSq += x[i] * x[i];
    const r = Math.max(Math.sqrt(rSq), 1e-10);
    const c1 = 0.5 * this.alpha1 / r;
    const c2 = 2.0 * this.alpha2;
    for (let i = 0; i < x.length; i++) out[i] = c1 * x[i] + c2 * x[i];
  }
}

/** V(x) = (|x|^2 - 1)^2 / 4  (Model B) */
export class DoubleWellPotential implements ConfinementPotential {
  evaluate(x: Float64Array): number {
    let rSq = 0;
    for (let i = 0; i < x.length; i++) rSq += x[i] * x[i];
    return 0.25 * (rSq - 1.0) ** 2;
  }

  gradient(x: Float64Array, out: Float64Array): void {
    let rSq = 0;
    for (let i = 0; i < x.length; i++) rSq += x[i] * x[i];
    const c = rSq - 1.0;
    for (let i = 0; i < x.length; i++) out[i] = c * x[i];
  }
}

/** V(x) = sum_k a_k * x_k^2  (Anisotropic confinement) */
export class AnisotropicConfinement implements ConfinementPotential {
  constructor(public a: number[]) {}

  evaluate(x: Float64Array): number {
    let s = 0;
    for (let i = 0; i < x.length; i++) s += this.a[i] * x[i] * x[i];
    return s;
  }

  gradient(x: Float64Array, out: Float64Array): void {
    for (let i = 0; i < x.length; i++) out[i] = 2.0 * this.a[i] * x[i];
  }
}

// ─── Radial Interaction Potentials ────────────────────────

/** Phi(r) = A * exp(-r^2 / (2*sigma^2)) */
export class GaussianInteraction implements RadialInteraction {
  radial = true as const;
  constructor(public A: number = 1.0, public sigma: number = 1.0) {}

  evaluate(r: number): number {
    return this.A * Math.exp(-r * r / (2 * this.sigma * this.sigma));
  }

  gradient(r: number): number {
    const s2 = this.sigma * this.sigma;
    return -this.A * r / s2 * Math.exp(-r * r / (2 * s2));
  }
}

/** Phi(r) = beta1 * I_{[0.5,1]}(r) + beta2 * I_{[1,2]}(r)  (Model A, smoothed) */
export class PiecewiseInteraction implements RadialInteraction {
  radial = true as const;
  constructor(
    public beta1: number = -3.0,
    public beta2: number = 2.0,
    public eps: number = 0.05,
  ) {}

  private smoothInd(r: number, lo: number, hi: number): number {
    return 0.5 * (Math.tanh((r - lo) / this.eps) - Math.tanh((r - hi) / this.eps));
  }

  private smoothIndGrad(r: number, lo: number, hi: number): number {
    const sech2Lo = 1.0 / Math.cosh((r - lo) / this.eps) ** 2;
    const sech2Hi = 1.0 / Math.cosh((r - hi) / this.eps) ** 2;
    return 0.5 / this.eps * (sech2Lo - sech2Hi);
  }

  evaluate(r: number): number {
    return this.beta1 * this.smoothInd(r, 0.5, 1.0) + this.beta2 * this.smoothInd(r, 1.0, 2.0);
  }

  gradient(r: number): number {
    return (
      this.beta1 * this.smoothIndGrad(r, 0.5, 1.0) + this.beta2 * this.smoothIndGrad(r, 1.0, 2.0)
    );
  }
}

/** Phi(r) = gamma / (r + 1)  (Model B) */
export class InverseInteraction implements RadialInteraction {
  radial = true as const;
  constructor(public gamma: number = 0.5) {}

  evaluate(r: number): number {
    return this.gamma / (r + 1.0);
  }

  gradient(r: number): number {
    return -this.gamma / ((r + 1.0) * (r + 1.0));
  }
}

/** Phi(r) = D * (1 - exp(-a*(r-r0)))^2  (Morse) */
export class MorsePotential implements RadialInteraction {
  radial = true as const;
  constructor(public D: number = 0.5, public a: number = 2.0, public r0: number = 0.8) {}

  evaluate(r: number): number {
    const e = Math.exp(-this.a * (r - this.r0));
    return this.D * (1 - e) ** 2;
  }

  gradient(r: number): number {
    const e = Math.exp(-this.a * (r - this.r0));
    return 2 * this.D * this.a * (1 - e) * e;
  }
}

/** Truncated & shifted Lennard-Jones (Model C) */
export class LennardJonesPotential implements RadialInteraction {
  radial = true as const;
  private rSafe: number;
  private shift: number;

  constructor(
    public epsilon: number = 0.5,
    public sigmaLJ: number = 0.5,
    public rCut: number = 2.5,
    rSafeFactor: number = 0.7,
  ) {
    this.rSafe = rSafeFactor * sigmaLJ;
    const sr6Cut = (sigmaLJ / rCut) ** 6;
    this.shift = 4.0 * epsilon * (sr6Cut ** 2 - sr6Cut);
  }

  evaluate(r: number): number {
    if (r >= this.rCut) return 0;
    const rc = Math.max(r, this.rSafe);
    const sr6 = (this.sigmaLJ / rc) ** 6;
    return 4.0 * this.epsilon * (sr6 * sr6 - sr6) - this.shift;
  }

  gradient(r: number): number {
    if (r >= this.rCut) return 0;
    const rc = Math.max(r, this.rSafe);
    const sr6 = (this.sigmaLJ / rc) ** 6;
    return (4.0 * this.epsilon / rc) * (-12.0 * sr6 * sr6 + 6.0 * sr6);
  }
}

// ─── Non-Radial Interaction Potentials ────────────────────

/** Phi(z) = A * exp(-(z1^2/s1^2 + z2^2/s2^2)/2)  (Anisotropic) */
export class AnisotropicGaussianInteraction implements VectorInteraction {
  radial = false as const;
  private sSq: number[];

  constructor(public A: number = 2.0, public s: number[] = [0.5, 1.5]) {
    this.sSq = s.map((si) => si * si);
  }

  evaluate(z: Float64Array): number {
    let exponent = 0;
    for (let i = 0; i < z.length; i++) exponent += (z[i] * z[i]) / this.sSq[i];
    return this.A * Math.exp(-0.5 * exponent);
  }

  gradient(z: Float64Array, out: Float64Array): void {
    const phi = this.evaluate(z);
    for (let i = 0; i < z.length; i++) out[i] = -phi * z[i] / this.sSq[i];
  }
}

// ─── Model Configurations ─────────────────────────────────

export interface ModelConfig {
  name: string;
  label: string;
  V: ConfinementPotential;
  Phi: InteractionPotential;
  sigma: number;
  description: string;
}

export const MODELS: Record<string, ModelConfig> = {
  model_a: {
    name: 'model_a',
    label: 'Model A (Quadratic + Piecewise)',
    V: new QuadraticConfinement(-1.0, 2.0),
    Phi: new PiecewiseInteraction(-3.0, 2.0),
    sigma: 0.1,
    description: 'Quadratic confinement with piecewise constant interaction',
  },
  model_b: {
    name: 'model_b',
    label: 'Model B (Double-Well + Inverse)',
    V: new DoubleWellPotential(),
    Phi: new InverseInteraction(0.5),
    sigma: 0.1,
    description: 'Double-well confinement with inverse-distance interaction',
  },
  model_lj: {
    name: 'model_lj',
    label: 'Model C (Harmonic + Lennard-Jones)',
    V: new HarmonicPotential(2.0),
    Phi: new LennardJonesPotential(),
    sigma: 0.1,
    description: 'Harmonic confinement with truncated Lennard-Jones interaction',
  },
  model_morse: {
    name: 'model_morse',
    label: 'Model D (Double-Well + Morse)',
    V: new DoubleWellPotential(),
    Phi: new MorsePotential(0.5, 2.0, 0.8),
    sigma: 0.1,
    description: 'Double-well confinement with Morse interaction',
  },
  model_aniso: {
    name: 'model_aniso',
    label: 'Model E (Anisotropic)',
    V: new AnisotropicConfinement([1.0, 4.0]),
    Phi: new AnisotropicGaussianInteraction(2.0, [0.5, 1.5]),
    sigma: 0.1,
    description: 'Anisotropic confinement with direction-dependent Gaussian interaction',
  },
};
