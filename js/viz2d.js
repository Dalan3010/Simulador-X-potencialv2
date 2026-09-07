/**
 * viz2d.js
 * -----------------------------------------------------------------------
 * Todo lo que se dibuja en el plano XY. Un mismo modulo atiende tres de
 * las cinco vistas del selector porque comparten la misma malla y los
 * mismos ejes; lo unico que cambia entre ellas es que capa es la
 * protagonista:
 *   - "map"      -> mapa de color relleno (curvas de nivel opcionales)
 *   - "contours" -> solo curvas de nivel, sin relleno
 *   - "field"    -> vectores de campo electrico sobre un fondo tenue
 * -----------------------------------------------------------------------
 */

const Viz2D = (() => {

  const DIVERGING_SCALE = [
    [0.0, '#2166AC'],
    [0.25, '#67A9CF'],
    [0.5, '#F5F1E9'],
    [0.75, '#F4A582'],
    [1.0, '#B2182B'],
  ];

  function chargeTraces(positions, params) {
    if (!params.showCharges) return [];
    return [{
      type: 'scatter',
      mode: params.showLabels ? 'markers+text' : 'markers',
      x: [positions.plus.x, positions.minus.x],
      y: [positions.plus.y, positions.minus.y],
      text: ['+q', '\u2212q'],
      textposition: 'top center',
      textfont: { color: '#E4E8EE', family: 'JetBrains Mono, monospace', size: 13 },
      marker: {
        size: 16,
        color: ['#E8664A', '#4A9FE8'],
        line: { color: '#0B0E14', width: 2 },
      },
      hoverinfo: 'text',
      hovertext: ['Carga +q', 'Carga -q'],
      showlegend: false,
      name: 'Cargas',
    }];
  }

  function fieldTraces(params) {
    const { px, py, ex, ey, emag } = Physics.computeField2D(params);
    if (px.length === 0) return [];

    const maxMag = Math.max(...emag, 1e-9);
    const spanX = (params.xmax - params.xmin) / params.resolution;
    const spanY = (params.ymax - params.ymin) / params.resolution;
    const baseLen = Math.max(spanX, spanY) * (params.fieldDensity / 2.2);

    const lineX = [], lineY = [];
    const headX = [], headY = [];
    for (let k = 0; k < px.length; k++) {
      const mag = emag[k];
      if (mag < 1e-12) continue;
      const scale = (0.3 + 0.7 * (Math.log10(1 + mag) / Math.log10(1 + maxMag))) * baseLen;
      const ux = ex[k] / mag;
      const uy = ey[k] / mag;
      const x0 = px[k], y0 = py[k];
      const x1 = x0 + ux * scale, y1 = y0 + uy * scale;
      lineX.push(x0, x1, null);
      lineY.push(y0, y1, null);

      const ang = Math.atan2(uy, ux);
      const headSize = scale * 0.35;
      const a1 = ang + Math.PI * 0.85;
      const a2 = ang - Math.PI * 0.85;
      headX.push(x1, x1 + headSize * Math.cos(a1), null, x1, x1 + headSize * Math.cos(a2), null);
      headY.push(y1, y1 + headSize * Math.sin(a1), null, y1, y1 + headSize * Math.sin(a2), null);
    }

    const style = { color: '#E8B84A', width: 1.6 };
    return [
      { type: 'scatter', mode: 'lines', x: lineX, y: lineY, line: style, hoverinfo: 'skip', showlegend: false, name: 'Campo E' },
      { type: 'scatter', mode: 'lines', x: headX, y: headY, line: style, hoverinfo: 'skip', showlegend: false },
    ];
  }

  function potentialTrace(grid, params, mode) {
    const isContoursView = mode === 'contours';
    const isFieldView = mode === 'field';

    return {
      type: 'contour',
      x: grid.xs,
      y: grid.ys,
      z: grid.V,
      colorscale: DIVERGING_SCALE,
      zmid: 0,
      opacity: isFieldView ? 0.35 : 1,
      contours: {
        coloring: isContoursView ? 'lines' : 'heatmap',
        showlines: isContoursView ? true : params.showContours,
      },
      line: { color: isContoursView ? undefined : 'rgba(11,14,20,0.55)', width: isContoursView ? 1.4 : 1 },
      showscale: !isContoursView,
      colorbar: { title: { text: 'V (u.a.)', font: { color: '#E4E8EE' } }, tickfont: { color: '#E4E8EE' }, outlinewidth: 0 },
      hovertemplate: 'x=%{x:.2f}<br>y=%{y:.2f}<br>V=%{z:.3g}<extra></extra>',
    };
  }

  function render(divId, params, mode) {
    const grid = Physics.computeGrid2D(params);
    const traces = [potentialTrace(grid, params, mode), ...chargeTraces(grid.positions, params)];

    if (mode === 'field') traces.push(...fieldTraces(params));

    const gridColor = params.showGrid ? 'rgba(174,182,194,0.15)' : 'rgba(0,0,0,0)';
    const layout = {
      paper_bgcolor: '#14181F',
      plot_bgcolor: '#14181F',
      font: { color: '#E4E8EE', family: 'Inter, system-ui, sans-serif' },
      margin: { l: 60, r: 20, t: 20, b: 50 },
      showlegend: false,
      xaxis: { title: 'x', range: [params.xmin, params.xmax], color: '#AEB6C2', gridcolor: gridColor, zeroline: false },
      yaxis: { title: 'y', range: [params.ymin, params.ymax], color: '#AEB6C2', gridcolor: gridColor, zeroline: false, scaleanchor: 'x' },
    };

    Plotly.react(divId, traces, layout, { responsive: true, displaylogo: false });
  }

  return { render };
})();
