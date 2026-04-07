/**
 * Design Criteria Gate — 3-gate interactive
 * User must "unlock" all 3 criteria before the self-test solution is revealed.
 *
 * Each gate shows:
 *   1. What criterion is required
 *   2. What happens without it (violation demo)
 *   3. "I understand" button to check it off
 *
 * After all 3: reveal CTA to the solution.
 */
import { t } from './i18n';

const gates = [
  {
    id: 'gate-1',
    title: t('Criterion 1: Data-Computable', '标准 1：可由数据计算'),
    desc: t(
      'The test function must be evaluable from observed snapshots — no hidden labels, no estimated velocities, no trajectory reconstruction.',
      '测试函数必须可以从观测到的快照直接计算——不需要隐藏标签、估计速度或轨迹重建。',
    ),
    violation: t(
      'Example violation: using the smooth density ρ(x,t) as a test function. We don\'t observe ρ — we observe μₙ (discrete delta masses). ρ must be estimated, which requires additional assumptions.',
      '违例示例：用光滑密度 ρ(x,t) 作为测试函数。我们观测不到 ρ——我们观测到的是 μₙ（离散 delta 质量）。ρ 必须被估计，这需要额外假设。',
    ),
    checkText: t('✓ Any good test family must be computable from μₙ directly', '✓ 任何好的测试族必须可以直接从 μₙ 计算'),
    color: '#3b82f6',
  },
  {
    id: 'gate-2',
    title: t('Criterion 2: Linear in (V, Φ)', '标准 2：关于 (V, Φ) 线性'),
    desc: t(
      'The test family must depend LINEARLY on the unknown potentials. If it\'s nonlinear, the loss becomes non-convex — no unique minimizer, no efficient solver, no conditioning theory.',
      '测试族必须对未知势函数线性依赖。若为非线性，损失函数变成非凸——无唯一极小值、无高效求解器、无条件数理论。',
    ),
    violation: t(
      'Example violation: a test function that multiplies V and Φ together. The resulting loss has degree 4 — "quartic" — making optimization much harder. (This is exactly the energy-balance approach\'s problem.)',
      '违例示例：一个把 V 和 Φ 相乘的测试函数。结果损失是 4 次——"四次型"——使优化困难得多。（这正是能量平衡方法的问题。）',
    ),
    checkText: t('✓ Linearity → quadratic loss → convex least squares (under linear parameterization)', '✓ 线性 → 二次损失 → 凸最小二乘（在线性参数化下）'),
    color: '#f59e0b',
  },
  {
    id: 'gate-3',
    title: t('Criterion 3: Guarantees a Unique Solution', '标准 3：保证唯一解'),
    desc: t(
      'The bilinear form B(φ,ψ) must be symmetric and non-negative — like a bowl shape. This gives the loss matrix A a well-structured form — guaranteeing a unique minimizer and enabling condition number analysis.',
      '测试族诱导的双线性型 B(φ,ψ) 必须是对称且非负定——像碗的形状。这赋予损失矩阵 A 一个结构良好的形式——保证唯一极小值并使条件数分析成为可能。',
    ),
    violation: t(
      'Example violation: an asymmetric test family where B(φ,ψ) ≠ B(ψ,φ). The matrix A is no longer symmetric — no guarantee that the minimum is unique, and standard convergence theory fails.',
      '违例示例：一个不对称测试族，使 B(φ,ψ) ≠ B(ψ,φ)。矩阵 A 不再对称——无法保证极小值唯一，标准收敛理论失效。',
    ),
    checkText: t('✓ Well-structured (symmetric, non-negative) matrix → unique minimizer → condition number κ = O(N) → convergence', '✓ 结构良好（对称、非负）矩阵 → 唯一极小值 → 条件数 κ = O(N) → 收敛'),
    color: '#22c55e',
  },
];

const container = document.getElementById('criteria-gate-container');
const revealSection = document.getElementById('self-test-reveal');

if (container) {
  const checked = new Set<number>();

  gates.forEach((gate, i) => {
    const el = document.createElement('div');
    el.className = 'criteria-gate';
    el.style.cssText = `
      border: 1px solid ${gate.color}44;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1rem;
      background: ${gate.color}08;
      transition: all 0.3s;
    `;
    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
        <div class="gate-check" id="check-${i}" style="width:24px;height:24px;border-radius:50%;border:2px solid ${gate.color};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;"></div>
        <h4 style="margin:0;color:${gate.color};font-size:0.95rem;">${gate.title}</h4>
      </div>
      <p style="margin:0 0 0.75rem;font-size:0.875rem;color:rgba(255,255,255,0.7);">${gate.desc}</p>
      <div class="violation-box" style="background:rgba(239,68,68,0.06);border-left:3px solid #ef4444;border-radius:0 8px 8px 0;padding:0.75rem 1rem;margin-bottom:1rem;font-size:0.8rem;color:rgba(255,255,255,0.6);">
        <strong style="color:#ef4444">Without this:</strong> ${gate.violation}
      </div>
      <button class="gate-btn" id="btn-${i}" style="background:${gate.color}22;color:${gate.color};border:1px solid ${gate.color}66;border-radius:6px;padding:0.4rem 1.25rem;cursor:pointer;font-size:0.85rem;font-weight:600;transition:all 0.2s;">
        ${t('I understand →', '我理解了 →')}
      </button>
      <p class="check-text" id="ctext-${i}" style="display:none;color:${gate.color};font-size:0.85rem;margin:0.5rem 0 0;font-weight:500;">${gate.checkText}</p>
    `;
    container.appendChild(el);

    const btn = el.querySelector(`#btn-${i}`) as HTMLButtonElement;
    btn.addEventListener('click', () => {
      checked.add(i);
      const checkEl = el.querySelector(`#check-${i}`) as HTMLElement;
      checkEl.textContent = '✓';
      checkEl.style.background = gate.color;
      checkEl.style.color = '#000';
      btn.style.display = 'none';
      const ctextEl = el.querySelector(`#ctext-${i}`) as HTMLElement;
      ctextEl.style.display = 'block';
      el.style.background = gate.color + '12';
      el.style.borderColor = gate.color + '88';

      if (checked.size === 3 && revealSection) {
        revealSection.style.display = 'block';
        revealSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}
