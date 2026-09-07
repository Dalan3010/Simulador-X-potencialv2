/**
 * ui.js
 * -----------------------------------------------------------------------
 * Puente entre el panel de controles (HTML) y el resto de la aplicación.
 * No sabe nada de física ni de Plotly: solo lee/escribe valores del DOM,
 * mantiene los valores por defecto para el botón de reinicio, y notifica
 * a quien lo pida (main.js) cuando algo cambió.
 * -----------------------------------------------------------------------
 */

const UI = (() => {

  // Debe reflejar exactamente los "value" iniciales del HTML.
  const DEFAULTS = {
    q: 1.0, k: 8.99, d: 2.0,
    azimuth: 0, polar: 90,
    cx: 0, cy: 0, cz: 0,
    xmin: -5, xmax: 5, ymin: -5, ymax: 5,
    resolution: 70, fieldDensity: 14,
    sphereRadius: 3.0, sphereResolution: 45,
    showCharges: true, showLabels: true,
    showContours: true, showGrid: true, showField: false,
  };

  const NUMERIC_IDS = [
    'q', 'k', 'd', 'azimuth', 'polar', 'cx', 'cy', 'cz',
    'xmin', 'xmax', 'ymin', 'ymax', 'resolution', 'fieldDensity',
    'sphereRadius', 'sphereResolution',
  ];
  const BOOL_IDS = ['showCharges', 'showLabels', 'showContours', 'showGrid', 'showField'];

  // Cuántos decimales mostrar junto a cada slider (no todo lo numérico
  // debe leerse igual: un ángulo en grados no necesita decimales, una
  // carga en nC sí).
  const DECIMALS = {
    q: 1, k: 2, d: 1, azimuth: 0, polar: 0,
    resolution: 0, fieldDensity: 0,
    sphereRadius: 1, sphereResolution: 0,
  };

  function getParams() {
    const p = {};
    for (const id of NUMERIC_IDS) p[id] = parseFloat(document.getElementById(id).value);
    for (const id of BOOL_IDS) p[id] = document.getElementById(id).checked;
    return p;
  }

  function applyDefaults() {
    for (const id of NUMERIC_IDS) {
      const el = document.getElementById(id);
      el.value = DEFAULTS[id];
      syncOutput(id);
    }
    for (const id of BOOL_IDS) document.getElementById(id).checked = DEFAULTS[id];
  }

  function syncOutput(id) {
    const out = document.getElementById(id + 'Val');
    if (!out) return;
    const el = document.getElementById(id);
    const decimals = DECIMALS[id] !== undefined ? DECIMALS[id] : 1;
    out.textContent = parseFloat(el.value).toFixed(decimals);
  }

  function init({ onChange, onViewChange }) {
    for (const id of NUMERIC_IDS) {
      const el = document.getElementById(id);
      syncOutput(id);
      el.addEventListener('input', () => { syncOutput(id); onChange(); });
    }
    for (const id of BOOL_IDS) {
      document.getElementById(id).addEventListener('change', onChange);
    }

    document.getElementById('resetBtn').addEventListener('click', () => {
      applyDefaults();
      onChange();
    });

    document.querySelectorAll('.tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        onViewChange(btn.dataset.view);
      });
    });

    const overlay = document.getElementById('helpOverlay');
    document.getElementById('helpToggle').addEventListener('click', () => {
      overlay.classList.add('open');
      if (window.renderMathInElement) {
        renderMathInElement(document.querySelector('.help-panel'), {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
          ],
        });
      }
    });
    document.getElementById('helpClose').addEventListener('click', () => overlay.classList.remove('open'));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
  }

  return { getParams, init, DEFAULTS };
})();
