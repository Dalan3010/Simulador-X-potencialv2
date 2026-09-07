/**
 * viz3d.js
 * -----------------------------------------------------------------------
 * Superficie 3D del potencial: eje X, eje Y y altura Z = V(x,y). Aquí
 * "altura" no es una posición física sino el valor del potencial, así
 * que el dipolo real vive en el plano z=0 y su huella se ve como un pico
 * (+q) y un valle (−q) en la superficie.
 * -----------------------------------------------------------------------
 */

const Viz3D = (() => {

  const DIVERGING_SCALE = [
    [0.0, '#2166AC'],
    [0.25, '#67A9CF'],
    [0.5, '#F5F1E9'],
    [0.75, '#F4A582'],
    [1.0, '#B2182B'],
  ];

  function render(divId, params) {
    const grid = Physics.computeGrid2D(params);

    const surface = {
      type: 'surface',
      x: grid.xs,
      y: grid.ys,
      z: grid.V,
      colorscale: DIVERGING_SCALE,
      cmid: 0,
      showscale: true,
      colorbar: { title: { text: 'V (u.a.)', font: { color: '#E4E8EE' } }, tickfont: { color: '#E4E8EE' }, outlinewidth: 0 },
      contours: {
        z: { show: params.showContours, usecolormap: true, highlightcolor: '#63D9C9', project: { z: true } },
      },
      lighting: { ambient: 0.55, diffuse: 0.6, specular: 0.2, roughness: 0.6 },
      hovertemplate: 'x=%{x:.2f}<br>y=%{y:.2f}<br>V=%{z:.3g}<extra></extra>',
    };

    const traces = [surface];

    if (params.showCharges) {
      const zAtCharge = maxAbs(grid.V) * 1.05;
      traces.push({
        type: 'scatter3d',
        mode: params.showLabels ? 'markers+text' : 'markers',
        x: [grid.positions.plus.x, grid.positions.minus.x],
        y: [grid.positions.plus.y, grid.positions.minus.y],
        z: [zAtCharge, -zAtCharge],
        text: ['+q', '−q'],
        textfont: { color: '#E4E8EE', family: 'JetBrains Mono, monospace', size: 12 },
        marker: { size: 5, color: ['#E8664A', '#4A9FE8'] },
        hoverinfo: 'text',
        hovertext: ['Carga +q', 'Carga −q'],
        showlegend: false,
      });
    }

    const layout = {
      paper_bgcolor: '#14181F',
      plot_bgcolor: '#14181F',
      font: { color: '#E4E8EE', family: 'Inter, system-ui, sans-serif' },
      margin: { l: 0, r: 0, t: 10, b: 0 },
      scene: {
        xaxis: { title: 'x', color: '#AEB6C2', gridcolor: sceneGrid(params), backgroundcolor: '#14181F' },
        yaxis: { title: 'y', color: '#AEB6C2', gridcolor: sceneGrid(params), backgroundcolor: '#14181F' },
        zaxis: { title: 'V', color: '#AEB6C2', gridcolor: sceneGrid(params), backgroundcolor: '#14181F' },
        camera: { eye: { x: 1.4, y: -1.4, z: 0.9 } },
      },
      showlegend: false,
    };

    Plotly.react(divId, traces, layout, { responsive: true, displaylogo: false });
  }

  function sceneGrid(params) {
    return params.showGrid ? 'rgba(174,182,194,0.15)' : 'rgba(0,0,0,0)';
  }

  function maxAbs(matrix) {
    let m = 0;
    for (const row of matrix) for (const v of row) m = Math.max(m, Math.abs(v));
    return m || 1;
  }

  return { render };
})();
