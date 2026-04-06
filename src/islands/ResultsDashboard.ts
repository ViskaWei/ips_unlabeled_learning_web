/**
 * NN Results Dashboard — replaces the old 16-row heatmap with two focused views:
 * 1. NN vs Basis bar chart (per-model, d=2 only)
 * 2. Dimension scaling color grid (4 models × 4 dims, NN ∇V)
 * Uses safe DOM construction (no innerHTML).
 */

const container = document.getElementById('results-heatmap');

if (container) {
  loadAndRender();

  async function loadAndRender() {
    const base = import.meta.env.BASE_URL || '/ips_unlabeled_learning_web';
    try {
      const resp = await fetch(`${base}/data/cross_method.json`);
      const data = await resp.json();
      render(data.data);
    } catch {
      container!.textContent = 'Loading results data...';
    }
  }

  function el(tag: string, cls?: string, text?: string): HTMLElement {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function getColor(value: number): string {
    if (value <= 5) return 'rgba(34, 197, 94, 0.85)';
    if (value <= 20) return 'rgba(245, 158, 11, 0.75)';
    if (value <= 50) return 'rgba(239, 68, 68, 0.7)';
    return 'rgba(239, 68, 68, 0.9)';
  }

  function getCellBg(value: number): string {
    if (value <= 5) return `rgba(34, 197, 94, ${0.15 + 0.25 * (1 - value / 5)})`;
    if (value <= 20) return `rgba(245, 158, 11, ${0.1 + 0.2 * ((value - 5) / 15)})`;
    if (value <= 50) return `rgba(239, 68, 68, ${0.1 + 0.2 * ((value - 20) / 30)})`;
    return 'rgba(239, 68, 68, 0.35)';
  }

  const MODEL_LABELS: Record<string, string> = {
    A: 'A: Smooth',
    B: 'B: Cond.',
    C: 'C: LJ',
    D: 'D: Morse',
  };

  function render(rows: any[]) {
    container!.replaceChildren();

    // === Section 1: NN vs Basis Bar Chart (d=2 only) ===
    const d2Rows = rows.filter((r: any) => r.d === 2);
    const barSection = el('div');
    const barTitle = el('h3', undefined, 'Self-Test: LSE vs NN (d=2)');
    Object.assign(barTitle.style, {
      fontSize: '1rem',
      fontWeight: '600',
      marginBottom: '0.75rem',
      color: '#e2e8f0',
    });
    barSection.appendChild(barTitle);

    // Header row
    const headerRow = el('div', 'nn-bar-row');
    headerRow.style.borderBottom = '2px solid rgba(255,255,255,0.1)';
    headerRow.style.paddingBottom = '0.25rem';
    headerRow.appendChild(el('div', undefined, ''));
    const hV = el('div', undefined, '∇V error %');
    Object.assign(hV.style, { fontSize: '0.75rem', color: '#64748b', textAlign: 'center' });
    const hPhi = el('div', undefined, '∇Φ error %');
    Object.assign(hPhi.style, { fontSize: '0.75rem', color: '#64748b', textAlign: 'center' });
    headerRow.appendChild(hV);
    headerRow.appendChild(hPhi);
    barSection.appendChild(headerRow);

    let nnWinsV = 0;
    const maxV = 15; // scale for bar widths
    const maxPhi = 20;

    for (const row of d2Rows) {
      const label = MODEL_LABELS[row.model] || row.model;
      const barRow = el('div', 'nn-bar-row');

      // Model label
      barRow.appendChild(el('div', 'nn-bar-label', label));

      // ∇V group — Basis lighter, NN solid
      const vGroup = el('div', 'nn-bar-group');
      vGroup.appendChild(makeBar(row.oracle_selftest_V, maxV, 'rgba(74, 222, 128, 0.45)', 'LSE'));
      vGroup.appendChild(makeBar(row.nn_V, maxV, '#22c55e', 'NN'));
      barRow.appendChild(vGroup);

      // ∇Φ group — Basis lighter, NN solid
      const phiGroup = el('div', 'nn-bar-group');
      phiGroup.appendChild(makeBar(row.oracle_selftest_Phi, maxPhi, 'rgba(167, 139, 250, 0.45)', 'LSE'));
      phiGroup.appendChild(makeBar(row.nn_Phi, maxPhi, '#8b5cf6', 'NN'));
      barRow.appendChild(phiGroup);

      barSection.appendChild(barRow);

      if (row.nn_V < row.oracle_selftest_V) nnWinsV++;
    }

    // Summary line
    const summary = el('div');
    Object.assign(summary.style, {
      marginTop: '0.75rem',
      padding: '0.5rem 0.75rem',
      background: 'rgba(34, 197, 94, 0.08)',
      borderRadius: '6px',
      fontSize: '0.8rem',
      color: '#22c55e',
      fontWeight: '600',
    });
    summary.textContent = `NN wins ∇V in ${nnWinsV}/${d2Rows.length} models at d=2 — without knowing the potential form`;
    barSection.appendChild(summary);

    container!.appendChild(barSection);

    // === Divider ===
    const divider = el('div');
    Object.assign(divider.style, {
      width: '60px',
      height: '2px',
      background: 'linear-gradient(135deg, #3b82f6, #22d3ee)',
      borderRadius: '2px',
      margin: '2rem auto',
    });
    container!.appendChild(divider);

    // === Section 2: Dimension Scaling Grid (NN ∇V) ===
    const gridSection = el('div');
    const gridTitle = el('h3', undefined, 'Dimension Scaling: NN ∇V (%)');
    Object.assign(gridTitle.style, {
      fontSize: '1rem',
      fontWeight: '600',
      marginBottom: '0.5rem',
      color: '#e2e8f0',
    });
    gridSection.appendChild(gridTitle);

    const gridSub = el('p');
    Object.assign(gridSub.style, { fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' });
    gridSub.textContent = 'Green ≤5%  ·  Amber 5–20%  ·  Red >20%';
    gridSection.appendChild(gridSub);

    const dims = [2, 5, 10, 20];
    const models = ['A', 'B', 'C', 'D'];

    const grid = el('div', 'dim-grid');

    // Header
    grid.appendChild(el('div', 'dim-grid-header', ''));
    for (const d of dims) {
      grid.appendChild(el('div', 'dim-grid-header', `d=${d}`));
    }

    // Data rows
    for (const m of models) {
      const label = MODEL_LABELS[m] || m;
      grid.appendChild(el('div', 'dim-grid-model', label));
      for (const d of dims) {
        const row = rows.find((r: any) => r.model === m && r.d === d);
        const val = row?.nn_V ?? null;
        const cell = el('div', 'dim-grid-cell');
        if (val != null) {
          cell.textContent = val < 10 ? val.toFixed(1) : val.toFixed(0);
          cell.style.background = getCellBg(val);
          cell.style.color = val <= 5 ? '#22c55e' : val <= 20 ? '#f59e0b' : '#ef4444';
          cell.title = `NN ∇V = ${val}%`;
        } else {
          cell.textContent = '—';
          cell.style.color = '#64748b';
        }
        grid.appendChild(cell);
      }
    }

    gridSection.appendChild(grid);

    // Summary for grid
    const gridSummary = el('div');
    Object.assign(gridSummary.style, {
      marginTop: '0.75rem',
      padding: '0.5rem 0.75rem',
      background: 'rgba(34, 197, 94, 0.08)',
      borderRadius: '6px',
      fontSize: '0.8rem',
      color: '#22c55e',
      fontWeight: '600',
    });

    // Count cells ≤ 5%
    let under5 = 0;
    const total = models.length * dims.length;
    for (const m of models) {
      for (const d of dims) {
        const row = rows.find((r: any) => r.model === m && r.d === d);
        if (row?.nn_V != null && row.nn_V <= 5) under5++;
      }
    }
    gridSummary.textContent = `V universally learnable: ${under5}/${total} settings have NN ∇V ≤ 5%`;
    gridSection.appendChild(gridSummary);

    // === Section 3: Dimension Scaling Grid (NN ∇Φ) ===
    const phiDivider = el('div');
    Object.assign(phiDivider.style, { height: '1.5rem' });
    gridSection.appendChild(phiDivider);

    const phiTitle = el('h3', undefined, 'Dimension Scaling: NN ∇Φ (%)');
    Object.assign(phiTitle.style, {
      fontSize: '1rem',
      fontWeight: '600',
      marginBottom: '0.5rem',
      color: '#e2e8f0',
    });
    gridSection.appendChild(phiTitle);

    const phiGrid = el('div', 'dim-grid');

    // Header
    phiGrid.appendChild(el('div', 'dim-grid-header', ''));
    for (const d of dims) {
      phiGrid.appendChild(el('div', 'dim-grid-header', `d=${d}`));
    }

    // Data rows
    for (const m of models) {
      const label = MODEL_LABELS[m] || m;
      phiGrid.appendChild(el('div', 'dim-grid-model', label));
      for (const d of dims) {
        const row = rows.find((r: any) => r.model === m && r.d === d);
        const val = row?.nn_Phi ?? null;
        const cell = el('div', 'dim-grid-cell');
        if (val != null) {
          cell.textContent = val >= 100 ? val.toFixed(0) : val < 10 ? val.toFixed(1) : val.toFixed(0);
          cell.style.background = getCellBg(val);
          cell.style.color = val <= 5 ? '#22c55e' : val <= 20 ? '#f59e0b' : '#ef4444';
          cell.title = `NN ∇Φ = ${val}%`;
        } else {
          cell.textContent = '—';
          cell.style.color = '#64748b';
        }
        phiGrid.appendChild(cell);
      }
    }

    gridSection.appendChild(phiGrid);

    const phiSummary = el('div');
    Object.assign(phiSummary.style, {
      marginTop: '0.75rem',
      padding: '0.5rem 0.75rem',
      background: 'rgba(245, 158, 11, 0.08)',
      borderRadius: '6px',
      fontSize: '0.8rem',
      color: '#f59e0b',
      fontWeight: '600',
    });
    phiSummary.textContent = 'Φ is the bottleneck — model-dependent and dimension-sensitive';
    gridSection.appendChild(phiSummary);

    container!.appendChild(gridSection);
  }

  function makeBar(value: number, maxVal: number, color: string, label: string): HTMLElement {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '6px';
    row.style.height = '20px';
    row.title = `${label}: ${value}%`;

    // Label (fixed width)
    const lbl = document.createElement('span');
    lbl.textContent = label;
    Object.assign(lbl.style, {
      fontSize: '0.7rem',
      color: 'rgba(255,255,255,0.5)',
      minWidth: '32px',
      textAlign: 'right',
    });
    row.appendChild(lbl);

    // Bar
    const bar = document.createElement('div');
    const pct = Math.min(100, (value / maxVal) * 100);
    Object.assign(bar.style, {
      width: `${Math.max(pct, 5)}%`,
      height: '16px',
      borderRadius: '3px',
      background: color,
      flexShrink: '0',
      transition: 'width 0.4s ease',
    });
    row.appendChild(bar);

    // Value
    const val = document.createElement('span');
    val.textContent = `${value.toFixed(1)}%`;
    Object.assign(val.style, {
      fontSize: '0.7rem',
      fontFamily: 'var(--font-mono)',
      color: value <= 5 ? '#22c55e' : value <= 20 ? '#f59e0b' : '#ef4444',
      fontWeight: '600',
      whiteSpace: 'nowrap',
    });
    row.appendChild(val);

    return row;
  }
}
