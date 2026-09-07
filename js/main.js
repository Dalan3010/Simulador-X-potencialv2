/**
 * main.js
 * -----------------------------------------------------------------------
 * Punto de entrada. No contiene física ni detalles de Plotly: solo sabe
 * qué vista está activa y a qué módulo debe delegar el redibujado cada
 * vez que el usuario cambia un control.
 * -----------------------------------------------------------------------
 */

(function () {
  const state = { view: 'map' };

  function renderCurrent() {
    const params = UI.getParams();
    switch (state.view) {
      case 'map':
        Viz2D.render('plot', params, 'map');
        break;
      case 'contours':
        Viz2D.render('plot', params, 'contours');
        break;
      case 'field':
        Viz2D.render('plot', params, 'field');
        break;
      case 'surface3d':
        Viz3D.render('plot', params);
        break;
      case 'sphere':
        Sphere3D.render('plot', params);
        break;
      default:
        Viz2D.render('plot', params, 'map');
    }
  }

  UI.init({
    onChange: renderCurrent,
    onViewChange: (view) => {
      state.view = view;
      renderCurrent();
    },
  });

  renderCurrent();
})();
