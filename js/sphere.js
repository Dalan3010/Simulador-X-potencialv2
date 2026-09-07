/**
 * sphere.js
 * -----------------------------------------------------------------------
 * Segunda representación 3D: una esfera de radio R centrada en el dipolo,
 * coloreada según el potencial eléctrico evaluado en cada punto de su
 * superficie (coordenadas esféricas theta, phi). El radio se mantiene
 * constante y toda la información física se codifica en el color, que es
 * la forma más clara de ver cómo cambia el signo y la magnitud de V
 * alrededor del dipolo sin que la geometría de la esfera se distorsione.
 * -----------------------------------------------------------------------
 */

const Sphere3D = (() => {

  const DIVERGING_SCALE = [
    [0.0, '#2166AC'],
    [0.25, '#67A9CF'],
    [0.5, '#F5F1E9'],
    [0.75, '#F4A582'],
    [1.0, '#B2182B'],
  ];

  function render(divId, params) {
    const data = Physics.computeSphere(params);

    const surface = {
      type: 'surface',
      x: data.X,
      y: data.Y,
      z: data.Z,
      surfacecolor: data.V,
      colorscale: DIVERGING_SCALE,
      cmid: 0,
      showscale: true,
      colorbar: { title: { text: 'V (u.a.)', font: { color: '#E4E8EE' } }, tickfont: { color: '#E4E8EE' }, outlinewidth: 0 },
      lighting: { ambient: 0.65, diffuse: 0.5, specular: 0.15, roughness: 0.7 },
      hovertemplate: 'V=%{surfacecolor:.3g}<extra></extra>',
    };

    const traces = [surface];

    if (params.showCharges) {
      traces.push({
        type: 'scatter3d',
        mode: params.showLabels ? 'markers+text' : 'markers',
        x: [data.positions.plus.x, data.positions.minus.x],
        y: [data.positions.plus.y, data.positions.minus.y],
        z: [data.positions.plus.z, data.positions.minus.z],
        text: ['+q', '−q'],
        textfont: { color: '#E4E8EE', family: 'JetBrains Mono, monospace', size: 12 },
        marker: { size: 5, color: '#0B0E14', line: { color: '#E4E8EE', width: 1 } },
        hoverinfo: 'text',
        hovertext: ['Carga +q', 'Carga −q'],
        showlegend: false,
      });

      // Segmento que marca la orientación del dipolo (de -q a +q).
      traces.push({
        type: 'scatter3d',
        mode: 'lines',
        x: [data.positions.minus.x, data.positions.plus.x],
        y: [data.positions.minus.y, data.positions.plus.y],
        z: [data.positions.minus.z, data.positions.plus.z],
        line: { color: '#63D9C9', width: 5 },
        hoverinfo: 'skip',
        showlegend: false,
      });
    }

    const gc = params.showGrid ? 'rgba(174,182,194,0.15)' : 'rgba(0,0,0,0)';
    const layout = {
      paper_bgcolor: '#14181F',
      plot_bgcolor: '#14181F',
      font: { color: '#E4E8EE', family: 'Inter, system-ui, sans-serif' },
      margin: { l: 0, r: 0, t: 10, b: 0 },
      scene: {
        xaxis: { title: 'x', color: '#AEB6C2', gridcolor: gc, backgroundcolor: '#14181F' },
        yaxis: { title: 'y', color: '#AEB6C2', gridcolor: gc, backgroundcolor: '#14181F' },
        zaxis: { title: 'z', color: '#AEB6C2', gridcolor: gc, backgroundcolor: '#14181F' },
        aspectmode: 'data',
        camera: { eye: { x: 1.5, y: 1.3, z: 1.1 } },
      },
      showlegend: false,
    };

    Plotly.react(divId, traces, layout, { responsive: true, displaylogo: false });
  }

  return { render };
})();
