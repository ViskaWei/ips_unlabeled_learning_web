export type Lang = 'en' | 'zh';

export function getLang(): Lang {
  const docLang = document.documentElement.lang;
  if (docLang === 'zh') return 'zh';
  const stored = localStorage.getItem('ips-lang');
  return stored === 'zh' ? 'zh' : 'en';
}

export function t<T extends string>(en: T, zh: T): T {
  return (getLang() === 'zh' ? zh : en) as T;
}

export function onLangChange(callback: () => void) {
  window.addEventListener('ips:langchange', () => callback());
}

const MODEL_LABELS: Record<string, { en: string; zh: string }> = {
  model_e: { en: 'E: Reference ★', zh: 'E：基准 ★' },
  model_a: { en: 'A: Smoothness', zh: 'A：光滑性' },
  model_b: { en: 'B: Conditioning', zh: 'B：条件数' },
  model_lj: { en: 'C: LJ', zh: 'C：LJ' },
  model_morse: { en: 'D: Morse', zh: 'D：Morse' },
};

export function modelLabel(key: string): string {
  const labels = MODEL_LABELS[key];
  return labels ? t(labels.en, labels.zh) : key;
}
