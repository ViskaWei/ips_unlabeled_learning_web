import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../src/', import.meta.url);
const issues = [];

const forbiddenPatterns = [
  {
    pattern: /conserves energy/i,
    message: '随机 SDE 语境不要写“conserves energy”；这里应当是 free-energy balance identity。',
  },
  {
    pattern: /energy functional/i,
    message: 'self-testing family 不是泛泛的 “energy functional”；请区分 ψ = V + Φ*μ 与 free energy。',
  },
  {
    pattern: /same theoretical guarantee/i,
    message: '不要把参数化估计器的正式误差界直接外推成 NN “同样已证明”。',
  },
  {
    pattern: /validates the error bound formula/i,
    message: '实验最多是 empirically supports scaling law，不应写成 validates formula。',
  },
  {
    pattern: /universally learnable/i,
    message: '“universally learnable” 过度宣称，请改成 benchmark-scoped 表述。',
  },
  {
    pattern: /optimal λ|optimal lambda|optimal &lambda;/i,
    message: 'L-curve 是 heuristic，不应写成 optimal λ。',
  },
  {
    pattern: /fundamental limit/i,
    message: '“fundamental limit” 过度绝对，请改成 benchmark- 或 regime-scoped 的表述。',
  },
  {
    pattern: /purely from estimation error/i,
    message: '轨迹偏差不应写成 purely from estimation error；请改成 mainly reflects。',
  },
  {
    pattern: /directly observable from unlabeled data/i,
    message: 'δE_f 依赖候选 (V, Φ)，不应写成 directly observable。',
  },
  {
    pattern: /δE_tot|\\delta E_\{\\text\{tot\}\}|\\delta E_\{tot\}/,
    message: '网页叙事统一使用 δE_f，不要回退到 δE_tot。',
  },
  {
    pattern: /-\s*&gamma;\s*r\/\(r\+1\)|-γ\s*r\/\(r\+1\)|-\\gamma\s*r\/\s*\(r\+1\)/,
    message: '网页里的 conditioning test 统一使用 shifted form γ/(r+1)，并说明加法常数不可辨识。',
  },
];

async function walk(dirUrl) {
  const dir = dirUrl.pathname;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const nextUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dirUrl);
    if (entry.isDirectory()) {
      await walk(nextUrl);
      continue;
    }
    if (!/\.(astro|ts|tsx|js|mjs)$/.test(entry.name)) {
      continue;
    }

    const relPath = path.relative(process.cwd(), nextUrl.pathname);
    const source = await readFile(nextUrl, 'utf8');

    for (const { pattern, message } of forbiddenPatterns) {
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(source)) !== null) {
        const line = source.slice(0, match.index).split('\n').length;
        issues.push(`${relPath}:${line} ${message}`);
        if (!pattern.global) {
          break;
        }
      }
    }
  }
}

await walk(root);

if (issues.length > 0) {
  console.error('内容质检失败:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('内容质检通过');
