/**
 * Delta-t Slider Demo — shows how observation interval affects MLE vs Self-Test.
 * Uses data from dt_obs_sweep.json for Model A.
 */

const vizContainer = document.getElementById('dt-slider-viz');
const slider = document.getElementById('dt-slider') as HTMLInputElement;
const dtValueLabel = document.getElementById('dt-value');

if (vizContainer && slider) {
  const dtValues = [0.001, 0.01, 0.1];
  const dtLabels = ['0.001', '0.01', '0.1'];

  // Model A data from paper Table 1
  const modelAData = {
    oracle_mle_V:   [6.08, 20.3, 0.49],
    oracle_mle_Phi: [12.5, 52.9, 92.2],
    oracle_selftest_V:   [0.78, 0.82, 8.03],
    oracle_selftest_Phi: [1.72, 2.69, 2.84],
    nn_selftest_V:   [0.45, 1.95, 5.69],
    nn_selftest_Phi: [3.81, 4.03, 8.86],
  };

  function render(dtIdx: number) {
    if (dtValueLabel) dtValueLabel.textContent = dtLabels[dtIdx];

    // Clear previous content
    while (vizContainer!.firstChild) vizContainer!.removeChild(vizContainer!.firstChild);

    const wrapper = document.createElement('div');
    wrapper.style.display = 'grid';
    wrapper.style.gridTemplateColumns = '1fr 1fr';
    wrapper.style.gap = '2rem';

    // Create two panels: grad_V and grad_Phi
    const panels = [
      { title: '\u2207V Error (%)', key: 'V' },
      { title: '\u2207\u03A6 Error (%)', key: 'Phi' },
    ];

    for (const panel of panels) {
      const div = document.createElement('div');

      const title = document.createElement('h4');
      title.textContent = panel.title;
      Object.assign(title.style, {
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        marginBottom: '1rem',
        textAlign: 'center',
      });
      div.appendChild(title);

      const methods = [
        { name: 'Oracle MLE', color: '#22c55e', values: panel.key === 'V' ? modelAData.oracle_mle_V : modelAData.oracle_mle_Phi },
        { name: 'Oracle Self-Test', color: '#f59e0b', values: panel.key === 'V' ? modelAData.oracle_selftest_V : modelAData.oracle_selftest_Phi },
        { name: 'NN Self-Test (ours)', color: '#3b82f6', values: panel.key === 'V' ? modelAData.nn_selftest_V : modelAData.nn_selftest_Phi },
      ];

      const maxVal = Math.max(...methods.flatMap((m) => m.values));
      const barMax = Math.min(maxVal * 1.1, 100);

      for (const method of methods) {
        const row = document.createElement('div');
        Object.assign(row.style, {
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '0.75rem',
        });

        const label = document.createElement('span');
        label.textContent = method.name;
        Object.assign(label.style, {
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          minWidth: '130px',
          textAlign: 'right',
        });
        row.appendChild(label);

        const barOuter = document.createElement('div');
        Object.assign(barOuter.style, {
          flex: '1',
          height: '24px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '4px',
          position: 'relative',
          overflow: 'hidden',
        });

        const barInner = document.createElement('div');
        const val = method.values[dtIdx];
        const pct = Math.min((val / barMax) * 100, 100);
        Object.assign(barInner.style, {
          height: '100%',
          width: `${pct}%`,
          background: method.color,
          opacity: '0.6',
          borderRadius: '4px',
          transition: 'width 0.4s ease',
        });
        barOuter.appendChild(barInner);

        const valLabel = document.createElement('span');
        valLabel.textContent = `${val.toFixed(1)}%`;
        Object.assign(valLabel.style, {
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '0.8rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          fontWeight: '600',
        });
        barOuter.appendChild(valLabel);

        row.appendChild(barOuter);
        div.appendChild(row);
      }

      wrapper.appendChild(div);
    }

    vizContainer!.appendChild(wrapper);

    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = `Model A at \u0394t = ${dtLabels[dtIdx]} (d=2, M=2000, N=10)`;
    Object.assign(subtitle.style, {
      textAlign: 'center',
      fontSize: '0.8rem',
      color: 'var(--text-muted)',
      marginTop: '1rem',
    });
    vizContainer!.appendChild(subtitle);
  }

  slider.addEventListener('input', () => {
    render(parseInt(slider.value));
  });

  render(1); // Start at dt=0.01
}
