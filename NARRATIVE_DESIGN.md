# NARRATIVE_DESIGN.md — Explorable Narrative Protocol

Applied to: "Learning Interacting Particle Systems from Unlabeled Data" (Viska Wei & Fei Lu, 2026)

---

## 1. Seven-Question Narrative Chain

### Q1: What can the reader SEE before any math?
**Answer:** Colored particles moving in 2D, confined by an external potential V and interacting via Φ.
**Demo:** HeroParticles.ts (existing) — animated particle cloud.
**Takeaway:** "These particles follow rules. Can we discover those rules from data?"

### Q2: What specific data do we actually have?
**Answer:** Unlabeled snapshots — positions at times t₁, t₂, ..., but NO identity labels.
**Demo:** ParticleLabelDemo.ts (existing) — side-by-side labeled vs unlabeled.
**Takeaway:** "We see WHERE particles are, but not WHICH is which."

### Q3: Why can't we just match them up?
**Answer:** Three distinct failure modes, each a different type of impossibility:
1. **Label matching (Sinkhorn/OT):** O(N!) combinatorial explosion; at large Δt, matching accuracy drops to random (24.5% vs 10% baseline). Error propagates catastrophically: ∇Φ goes from 5% → 89%.
2. **Distribution matching (Wasserstein):** Computationally intractable — requires simulating full particle system at EVERY gradient step. O(N² × 1000+ steps).
3. **Mean-field shortcut:** Only valid as N→∞. Paper uses N=10. Empirical measure is 10 discrete delta spikes, not a smooth density. Approximation error O(1/N) = 10% before learning begins.

**Demos:**
- ShuffleDemo.ts (existing) — shows label confusion at large Δt
- DtSliderDemo.ts (existing) — shows error explosion with Δt
- DistributionMatchingFail.ts (NEW) — bar chart: computational cost comparison
- MeanFieldFail.ts (NEW) — canvas: discrete spikes vs smooth density, N slider

**Cognitive Gate 1:** "I see why obvious approaches fail — show me the right question →"

### Q4: What object do we ACTUALLY observe?
**Answer:** The empirical measure μₙ = (1/N)∑ᵢ δ_{Xᵢ}. NOT a degraded version of trajectories — a DIFFERENT mathematical object (a random sum of Dirac delta masses). It has its own evolution equation.
**Demo:** EmpiricalMeasurePivot.ts (NEW) — 3-phase animation:
- Phase 1: Colored labeled particles with trajectory lines
- Phase 2: Labels/colors fade → gray anonymous dots
- Phase 3: Dots → KDE density heatmap (the empirical measure)
**Takeaway:** "Stop recovering what's missing. Start from what we have."

### Q5: What formulation does this object FORCE?
**Answer:** Weak form. μₙ is a sum of delta masses → pointwise derivative is ∞ → classical PDE impossible. BUT: ∫ψ dμₙ = (1/N)∑ᵢ ψ(Xᵢ) is computable from any snapshot. Weak form is the ONLY language available.
**Display:** Side-by-side comparison: Pointwise PDE (impossible, red) vs Weak Form (the only path, green).
**Quote:** "We do not move to weak form because it is fancy. We move because the observable itself forces us to."

### Q6: What must the test function family satisfy?
**Answer:** Three criteria, each with a concrete violation example:
1. **Data-computable:** evaluable from observed snapshots (violation: using smooth density ρ)
2. **Linear in (V,Φ):** quadratic loss → convex least squares (violation: multiplying V×Φ → quartic)
3. **Induces SPD geometry:** unique minimizer + condition number theory (violation: asymmetric B)

**Demo:** DesignCriteriaGate.ts (NEW) — 3-gate interactive. User checks off each criterion before self-test is revealed.

**REVEAL:** The self-test family ψ = V + Φ*μ satisfies all three automatically. Not a trick — the natural answer.

### Q7: What does this buy us?
**Answer:** Five concrete freedoms, each resolving a specific failure from Q3:
1. No label matching (resolves failure 1)
2. No trajectory reconstruction (resolves Sinkhorn dependency)
3. No velocity estimation (avoids dXᵢ/dt approximation)
4. No full distribution matching (resolves failure 2)
5. Quadratic geometry → convex, direct solver (resolves non-convexity)

**Demo:** FiveBenefits.ts (NEW) — animated checklist with IntersectionObserver. Each card references the specific failure demo it resolves.

**Cognitive Gate 2:** "I understand the method — show me theory and experiments →"

---

## 2. Section-by-Section Skeleton

| # | Section ID | Transition | Content Summary | Demo | Island File |
|---|-----------|-----------|-----------------|------|-------------|
| 1 | hero | HOOK | Animated particles, paper title | Particle cloud | HeroParticles.ts ✅ |
| 2 | what-are-forces | SETTING | V = confinement, Φ = interaction | Force arrows on 3 particles | ForceViz.ts ✅ |
| 3a | problem | BUT | Unlabeled data — no identity | Side-by-side labeled/unlabeled | ParticleLabelDemo.ts ✅ |
| 3b | challenge | BUT | Label matching fails (approach 1) | Shuffle + Δt error | ShuffleDemo.ts ✅ + DtSliderDemo.ts ✅ |
| 3c | dist-matching-fail | BUT | Distribution matching fails (approach 2) | Cost bar chart | DistributionMatchingFail.ts 🆕 |
| 3d | mean-field-fail | BUT | Mean-field fails (approach 3) | Discrete vs smooth density | MeanFieldFail.ts 🆕 |
| — | cognitive-gate-1 | GATE | "I see why obvious approaches fail" | Button | (inline) |
| 4a | pivot | THEREFORE | Empirical measure is the observable | 3-phase transformation | EmpiricalMeasurePivot.ts 🆕 |
| 4b | weak-form-necessity | THEREFORE | Observable forces weak form | Pointwise vs weak comparison | (static HTML) |
| 4c | design-criteria | THEREFORE | 3 criteria for valid test family | 3-gate interactive | DesignCriteriaGate.ts 🆕 |
| 5 | insight | THEREFORE | Self-test loss anatomy | Energy balance viz | EnergyBalanceViz.ts ✅ |
| 6 | five-benefits | THEREFORE | 5 freedoms from self-test | Animated checklist | FiveBenefits.ts 🆕 |
| — | cognitive-gate-2 | GATE | "I understand the method" | Button | (inline) |
| 7 | implementations | THEREFORE | Basis vs NN implementations | Side-by-side cards | (static HTML) ✅ |
| 8 | experiments | THEREFORE | Setup + prediction labels | Stat cards | (static HTML) ✅ |
| 9 | error-bound | THEREFORE | Theory validation + figures | Figures + condition table | (static HTML) ✅ |
| 10 | results | THEREFORE | NN vs Basis heatmap | Results dashboard | ResultsDashboard.ts ✅ |

---

## 3. Anti-Pattern Checklist

| ID | Anti-Pattern | Status | Resolution |
|----|-------------|--------|------------|
| AP-01 | Math before observable | ✅ FIXED | Setting section (ForceViz) shows particles before any equations |
| AP-02 | Solution before failed approaches | ✅ FIXED | Three failure sections (label, distribution, mean-field) precede pivot |
| AP-03 | Self-test before design criteria | ✅ FIXED | DesignCriteriaGate requires all 3 criteria checked before reveal |
| AP-04 | AND THEN transitions | ✅ FIXED | Every transition labeled THEREFORE or BUT with causal reasoning |
| AP-05 | Theory as content | ✅ ADDRESSED | Theory reframed as "rules out the worry that..." |
| AP-06 | Experiments as results | ✅ ADDRESSED | Each chart gets prediction label connecting back to theory |
| AP-07 | "We chose weak form" | ✅ FIXED | Now: "observable forces us to" — no choice framing |
| AP-08 | Terminology confusion | ✅ CHECKED | ψ = V+Φ*μ is "test function family", not "energy functional" |
| AP-09 | Overclaiming | ✅ CHECKED | Convergence theorem stated with Δt ≤ Δ₀, modulo constants |
| AP-10 | Sandbox too early | ✅ ADDRESSED | PotentialExplorer gated after five-benefits section |
| AP-11 | Isolated demos | ✅ FIXED | Each demo has contextual "This shows WHY X" label |
| AP-12 | No cognitive gates | ✅ FIXED | 2 explicit cognitive gates (after failures, after benefits) |
| AP-13 | Abstract before concrete | ✅ FIXED | EmpiricalMeasurePivot shows concrete visual before naming |

---

## 4. Island File Inventory

### Existing (no changes needed)
| File | Purpose | Status |
|------|---------|--------|
| HeroParticles.ts | Animated particle cloud hook | ✅ |
| ForceViz.ts | V/Φ force arrows visualization | ✅ |
| ParticleLabelDemo.ts | Labeled vs unlabeled side-by-side | ✅ |
| ShuffleDemo.ts | Label matching confusion demo | ✅ |
| DtSliderDemo.ts | Error vs Δt comparison | ✅ |
| EnergyBalanceViz.ts | Energy balance with V/Φ sliders | ✅ |
| LossLandscape.ts | Why squared-residual has trivial minimum | ✅ |
| PotentialExplorer.ts | Interactive sandbox | ✅ |
| PotentialComparison.ts | Potential comparison views | ✅ |
| TrajectoryComparison.ts | Trajectory comparison | ✅ |
| TrajectoryViewer.ts | Trajectory viewer | ✅ |
| ResultsDashboard.ts | Results heatmap | ✅ |
| LcurveDemo.ts | L-curve regularization | ✅ |
| MathRenderer.ts | Math rendering (replaced by Math.astro) | ✅ |
| i18n.ts | Language switching utility | ✅ |

### New (created in this commit)
| File | Purpose | DOM Target |
|------|---------|------------|
| DistributionMatchingFail.ts | Wasserstein cost bar chart | #dist-matching-canvas |
| MeanFieldFail.ts | Empirical measure vs smooth density | #mean-field-canvas |
| EmpiricalMeasurePivot.ts | 3-phase transformation animation | #pivot-canvas |
| DesignCriteriaGate.ts | 3-gate criterion interactive | #criteria-gate-container |
| FiveBenefits.ts | Animated benefit cards | #five-benefits-container |
