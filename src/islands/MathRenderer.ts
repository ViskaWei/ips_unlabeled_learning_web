/**
 * KaTeX math rendering for all math blocks on the page.
 */
import katex from 'katex';

const mathBlocks: Record<string, string> = {
  'math-selftest': String.raw`\mathcal{L}(\theta) = \frac{1}{2}\, J_{\text{diss}}\, \Delta t \;-\; \frac{\sigma^2}{2}\, J_{\text{diff}}\, \Delta t \;+\; \delta E_{\text{tot}}`,

  'math-sde': String.raw`dX_t^i = \left(-\nabla V(X_t^i) - \frac{1}{N}\sum_{j \neq i} \nabla\Phi(X_t^i - X_t^j)\right) dt + \sigma\, dW_t^i`,

  'math-ito': String.raw`\underbrace{\delta E_{\text{tot}}}_{\text{energy change}} \;=\; \underbrace{\frac{\sigma^2}{2}\, J_{\text{diff}}\, \Delta t}_{\text{diffusion (income)}} \;-\; \underbrace{J_{\text{diss}}\, \Delta t}_{\text{dissipation (spending)}} \;+\; \text{martingale}`,

  'math-loss': String.raw`\mathbb{E}\!\left[\mathcal{L}(V^*, \Phi^*)\right] = -\frac{1}{2}\,\mathbb{E}\!\left[J_{\text{diss}}^*\, \Delta t\right] < 0 \qquad \text{vs.} \qquad \mathcal{L}(0, 0) = 0`,
};

for (const [id, tex] of Object.entries(mathBlocks)) {
  const el = document.getElementById(id);
  if (el) {
    katex.render(tex, el, { displayMode: true, throwOnError: false });
  }
}
