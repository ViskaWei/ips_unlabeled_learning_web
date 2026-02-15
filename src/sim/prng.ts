/**
 * Seeded PRNG (xoshiro128**) for reproducible simulations.
 * Produces uniform [0,1) and standard normal values.
 */
export class PRNG {
  private s: Uint32Array;

  constructor(seed: number) {
    // SplitMix32 to initialize state from a single seed
    this.s = new Uint32Array(4);
    for (let i = 0; i < 4; i++) {
      seed += 0x9e3779b9;
      let t = seed ^ (seed >>> 16);
      t = Math.imul(t, 0x21f0aaad);
      t ^= t >>> 15;
      t = Math.imul(t, 0x735a2d97);
      t ^= t >>> 15;
      this.s[i] = t >>> 0;
    }
  }

  private next(): number {
    const s = this.s;
    const result = Math.imul(s[1] * 5, 7) >>> 0;
    const t = s[1] << 9;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = (s[3] << 11) | (s[3] >>> 21);
    return (result >>> 0) / 4294967296;
  }

  /** Uniform random in [0, 1) */
  random(): number {
    return this.next();
  }

  /** Standard normal via Box-Muller */
  randn(): number {
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1 + 1e-30)) * Math.cos(2 * Math.PI * u2);
  }

  /** Fill Float64Array with standard normal values */
  randnArray(arr: Float64Array): void {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = this.randn();
    }
  }
}
