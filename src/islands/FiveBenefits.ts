/**
 * Five Benefits Animated Checklist
 * Each benefit card fades in via IntersectionObserver.
 * Each card links back to the failure demo it resolves.
 */
import { t } from './i18n';

const benefits = [
  {
    title: t('No label matching', '无需标签匹配'),
    detail: t(
      'Particle identities never needed. The loss depends only on μₙ — the positions we can see.',
      '从不需要粒子身份。损失只依赖于 μₙ——我们能看到的位置。',
    ),
    callback: t(
      'Recall: at large Δt, the label-matching demo showed N! equally valid matchings. Self-test never needs any matching.',
      '回想：在大 Δt 时，标签匹配演示展示了 N! 个同样有效的匹配方案。自测从不需要任何匹配。',
    ),
    color: '#ef4444',
    delay: 0,
  },
  {
    title: t('No trajectory reconstruction', '无需轨迹重建'),
    detail: t(
      'No hidden pairings to recover. Two snapshots are enough; no need to reconstruct who went where.',
      '无需恢复隐藏的配对。两张快照已足够；无需重建谁去了哪里。',
    ),
    callback: t(
      'Recall: Sinkhorn MLE must reconstruct a trajectory first (via optimal transport). Self-test skips this entirely.',
      '回想：Sinkhorn MLE 必须先重建轨迹（通过最优传输）。自测完全跳过这一步。',
    ),
    color: '#f59e0b',
    delay: 100,
  },
  {
    title: t('No velocity estimation from data', '无需从数据估计速度'),
    detail: t(
      'No time derivatives of particle positions needed. Only ψ(Xᵢ) — pointwise evaluations of the test function.',
      '无需粒子位置的时间导数。只需 ψ(Xᵢ)——测试函数的逐点求值。',
    ),
    callback: t(
      'Recall: many trajectory-based methods need to estimate dXᵢ/dt from discrete snapshots — yet another source of error. Self-test avoids this.',
      '回想：许多基于轨迹的方法需要从离散快照估计 dXᵢ/dt——这是另一个误差来源。自测避免了这个问题。',
    ),
    color: '#22c55e',
    delay: 200,
  },
  {
    title: t('No full distribution matching', '无需完整分布匹配'),
    detail: t(
      'No Wasserstein minimization needed. No full system simulation at each optimization step.',
      '无需 Wasserstein 最小化。无需在每个优化步骤模拟完整系统。',
    ),
    callback: t(
      'Recall: distribution matching requires O(N² × 1000s of steps) computation. Self-test is a closed-form solve.',
      '回想：分布匹配需要 O(N² × 数千步) 的计算量。自测是封闭形式求解。',
    ),
    color: '#3b82f6',
    delay: 300,
  },
  {
    title: t('Quadratic geometry', '二次几何'),
    detail: t(
      'The loss is quadratic in (V,Φ). Under linear parameterization: convex least squares, SPD matrix A, condition number κ = O(N).',
      '损失关于 (V,Φ) 是二次的。在线性参数化下：凸最小二乘、SPD 矩阵 A、条件数 κ = O(N)。',
    ),
    callback: t(
      'Compare: energy-balance approach gives a quartic loss (degree 4). Wasserstein gives a non-convex objective. Self-test: convex, direct solver applicable.',
      '比较：能量平衡方法给出四次损失（4次）。Wasserstein 给出非凸目标函数。自测：凸，可用直接求解器。',
    ),
    color: '#8b5cf6',
    delay: 400,
  },
];

const container = document.getElementById('five-benefits-container');
if (container) {
  benefits.forEach((b) => {
    const card = document.createElement('div');
    card.style.cssText = `
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.5s ease ${b.delay}ms, transform 0.5s ease ${b.delay}ms;
      background: ${b.color}0a;
      border: 1px solid ${b.color}33;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 0.875rem;
    `;
    card.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:1rem;">
        <div style="width:8px;height:8px;border-radius:50%;background:${b.color};flex-shrink:0;margin-top:0.5rem;"></div>
        <div style="flex:1;">
          <h4 style="margin:0 0 0.4rem;color:${b.color};font-size:1rem;">${b.title}</h4>
          <p style="margin:0 0 0.5rem;font-size:0.875rem;color:rgba(255,255,255,0.7);">${b.detail}</p>
          <p style="margin:0;font-size:0.775rem;color:rgba(255,255,255,0.4);font-style:italic;">${b.callback}</p>
        </div>
      </div>
    `;
    container.appendChild(card);

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
          obs.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(card);
  });
}
