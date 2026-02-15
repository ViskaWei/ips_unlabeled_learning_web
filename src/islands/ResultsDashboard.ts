/**
 * Interactive Results Dashboard — renders paper Tables 1 and 2 as colored heatmaps.
 * Uses safe DOM construction (no innerHTML) to prevent XSS.
 */

const container = document.getElementById('results-heatmap');
const tableBtns = document.querySelectorAll('[data-table]');

if (container) {
  let currentTable = 'cross_method';

  tableBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tableBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentTable = (btn as HTMLElement).dataset.table || 'cross_method';
      loadAndRender();
    });
  });

  async function loadAndRender() {
    const base = import.meta.env.BASE_URL || '/ips_unlabeled_learning_web';
    try {
      const resp = await fetch(`${base}/data/${currentTable}.json`);
      const data = await resp.json();
      renderHeatmap(data);
    } catch {
      container!.textContent = 'Loading results data...';
    }
  }

  function getColor(value: number): string {
    if (value <= 5) return `rgba(34, 197, 94, ${0.3 + 0.7 * (1 - value / 5)})`;
    if (value <= 20) return `rgba(245, 158, 11, ${0.3 + 0.4 * ((value - 5) / 15)})`;
    if (value <= 50) return `rgba(239, 68, 68, ${0.3 + 0.3 * ((value - 20) / 30)})`;
    return `rgba(239, 68, 68, 0.8)`;
  }

  function el(tag: string, styles?: Record<string, string>, text?: string): HTMLElement {
    const e = document.createElement(tag);
    if (styles) Object.assign(e.style, styles);
    if (text) e.textContent = text;
    return e;
  }

  function renderHeatmap(data: any) {
    const rows = data.data;
    if (!rows || rows.length === 0) return;
    container!.replaceChildren();
    if (currentTable === 'cross_method') {
      renderCrossMethodTable(rows);
    } else {
      renderDtSweepTable(rows);
    }
  }

  function makeTable(): HTMLTableElement {
    const table = document.createElement('table');
    Object.assign(table.style, { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' });
    return table;
  }

  function addHeaderRow(thead: HTMLTableSectionElement, cells: { text: string; colspan?: number; color?: string }[]) {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '2px solid rgba(255,255,255,0.1)';
    for (const c of cells) {
      const th = document.createElement('th');
      th.textContent = c.text;
      th.style.padding = '8px';
      th.style.textAlign = c.colspan ? 'center' : 'left';
      th.style.color = c.color || 'var(--text-muted)';
      if (c.colspan) th.colSpan = c.colspan;
      tr.appendChild(th);
    }
    thead.appendChild(tr);
  }

  function addSubHeaderRow(thead: HTMLTableSectionElement, labels: string[]) {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
    for (const label of labels) {
      const th = document.createElement('th');
      th.textContent = label;
      th.style.padding = '4px 8px';
      th.style.fontSize = '0.75rem';
      th.style.color = 'var(--text-muted)';
      tr.appendChild(th);
    }
    thead.appendChild(tr);
  }

  function addDataCell(tr: HTMLTableRowElement, value: number, isBest: boolean) {
    const td = document.createElement('td');
    td.textContent = value >= 100 ? value.toFixed(0) : value.toFixed(1);
    td.title = `${value}%`;
    Object.assign(td.style, {
      padding: '6px 8px',
      textAlign: 'center',
      background: getColor(value),
      fontWeight: isBest ? '700' : 'normal',
    });
    tr.appendChild(td);
  }

  function renderCrossMethodTable(rows: any[]) {
    const table = makeTable();
    const thead = document.createElement('thead');
    addHeaderRow(thead, [
      { text: 'Model' },
      { text: 'd' },
      { text: 'Oracle Best', colspan: 2, color: '#22c55e' },
      { text: 'RBF Best', colspan: 2, color: '#f59e0b' },
      { text: 'NN Best (ours)', colspan: 2, color: '#3b82f6' },
    ]);
    addSubHeaderRow(thead, ['', '', '\u2207V', '\u2207\u03A6', '\u2207V', '\u2207\u03A6', '\u2207V', '\u2207\u03A6']);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const row of rows) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid rgba(255,255,255,0.04)';

      const modelTd = el('td', { padding: '6px 8px', fontWeight: '600' }, row.model);
      tr.appendChild(modelTd);

      const dimTd = el('td', { padding: '6px 8px', textAlign: 'center', color: 'var(--text-muted)' }, String(row.d));
      tr.appendChild(dimTd);

      const minV = Math.min(row.oracle_V, row.rbf_V, row.nn_V);
      const minPhi = Math.min(row.oracle_Phi, row.rbf_Phi, row.nn_Phi);

      addDataCell(tr, row.oracle_V, row.oracle_V === minV);
      addDataCell(tr, row.oracle_Phi, row.oracle_Phi === minPhi);
      addDataCell(tr, row.rbf_V, row.rbf_V === minV);
      addDataCell(tr, row.rbf_Phi, row.rbf_Phi === minPhi);
      addDataCell(tr, row.nn_V, row.nn_V === minV);
      addDataCell(tr, row.nn_Phi, row.nn_Phi === minPhi);

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container!.replaceChildren(table);
  }

  function renderDtSweepTable(rows: any[]) {
    const table = makeTable();
    const thead = document.createElement('thead');
    addHeaderRow(thead, [
      { text: 'Model' },
      { text: '\u0394t' },
      { text: 'Oracle MLE', colspan: 2, color: '#22c55e' },
      { text: 'Oracle Self-Test', colspan: 2, color: '#f59e0b' },
      { text: 'NN Self-Test', colspan: 2, color: '#3b82f6' },
    ]);
    addSubHeaderRow(thead, ['', '', '\u2207V', '\u2207\u03A6', '\u2207V', '\u2207\u03A6', '\u2207V', '\u2207\u03A6']);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const row of rows) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid rgba(255,255,255,0.04)';

      const modelTd = el('td', { padding: '6px 8px', fontWeight: '600' }, row.model);
      tr.appendChild(modelTd);

      const dtTd = el('td', {
        padding: '6px 8px',
        textAlign: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
      }, String(row.dt_obs));
      tr.appendChild(dtTd);

      const minV = Math.min(row.oracle_mle_V, row.oracle_selftest_V, row.nn_selftest_V);
      const minPhi = Math.min(row.oracle_mle_Phi, row.oracle_selftest_Phi, row.nn_selftest_Phi);

      addDataCell(tr, row.oracle_mle_V, row.oracle_mle_V === minV);
      addDataCell(tr, row.oracle_mle_Phi, row.oracle_mle_Phi === minPhi);
      addDataCell(tr, row.oracle_selftest_V, row.oracle_selftest_V === minV);
      addDataCell(tr, row.oracle_selftest_Phi, row.oracle_selftest_Phi === minPhi);
      addDataCell(tr, row.nn_selftest_V, row.nn_selftest_V === minV);
      addDataCell(tr, row.nn_selftest_Phi, row.nn_selftest_Phi === minPhi);

      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container!.replaceChildren(table);
  }

  loadAndRender();
}
