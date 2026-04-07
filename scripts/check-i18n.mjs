import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = new URL('../src/', import.meta.url);
const attrPattern = /data-i18n-(?:en|zh)="([^"]*)"/g;
const allowedTags = /<\/?(?:sup|sub|strong|code)\b[^>]*>|<br\s*\/?>/g;
const issues = [];

async function walk(dirUrl) {
  const dir = dirUrl.pathname;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const nextUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dirUrl);
    if (entry.isDirectory()) {
      await walk(nextUrl);
      continue;
    }
    if (!entry.name.endsWith('.astro')) {
      continue;
    }

    const relPath = path.relative(process.cwd(), nextUrl.pathname);
    const source = await readFile(nextUrl, 'utf8');

    let match;
    while ((match = attrPattern.exec(source)) !== null) {
      const value = match[1];
      const line = source.slice(0, match.index).split('\n').length;
      const stripped = value.replace(allowedTags, '');

      if (/[<>]/.test(stripped)) {
        issues.push(`${relPath}:${line} data-i18n 含未转义的 < 或 >: ${value}`);
      }
      if (value.includes('&sup1;&sup2;')) {
        issues.push(`${relPath}:${line} 可疑上标实体，可能想写 r^{-12}: ${value}`);
      }
    }
  }
}

await walk(root);

if (issues.length > 0) {
  console.error('i18n 内容检查失败:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('i18n 内容检查通过');
