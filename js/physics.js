/**
 * physics.js
 * -----------------------------------------------------------------------
 * Toda la física del dipolo vive aquí y en ningún otro archivo:
 *   - posición de las dos cargas a partir de los parámetros del usuario
 *   - potencial eléctrico V(x,y,z) = k * (q1/r1 + q2/r2)
 *   - campo eléctrico E = -∇V (por diferencias finitas centradas)
 *   - generación de mallas 2D y de puntos sobre una esfera
 *
 * Nada en este archivo dibuja nada: solo devuelve números. Esa separación
 * es intencional para poder cambiar la física sin tocar Plotly, o cambiar
 * la biblioteca de gráficos sin tocar la física.
 * -----------------------------------------------------------------------
 */

const Physics = (() => {

  // Suavizado numérico: evita división por cero cuando un punto de
  // evaluación cae exactamente sobre una carga. Es una fracción pequeña
  // de la separación entre cargas, así que se adapta a la escala del
  // problema en vez de ser una constante mágica fija.
  function softening(params) {
    return Math.max(params.d * 1e-3, 1e-6);
  }

  /**
   * Calcula la posición 3D de +q y -q a partir de:
   *   - centro del dipolo (cx, cy, cz)
   *   - separación d entre cargas
   *   - orientación dada por dos ángulos esféricos (azimutAng, polarAng)
   *     medidos en grados: azimutAng gira en el plano XY, polarAng inclina
   *     el dipolo fuera de ese plano (90° = dipolo contenido en el plano XY).
   */
  function chargePositions(params) {
    const az = (params.azimuth * Math.PI) / 180;
    const pol = (params.polar * Math.PI) / 180;

    // Vector unitario de orientación en coordenadas esféricas físicas
    const ux = Math.sin(pol) * Math.cos(az);
    const uy = Math.sin(pol) * Math.sin(az);
    const uz = Math.cos(pol);

    const half = params.d / 2;
    const plus = {
      x: params.cx + half * ux,
      y: params.cy + half * uy,
      z: params.cz + half * uz,
    };
    const minus = {
      x: params.cx - half * ux,
      y: params.cy - half * uy,
      z: params.cz - half * uz,
    };
    return { plus, minus, dipoleUnit: { x: ux, y: uy, z: uz } };
  }

  /** Distancia 3D suavizada entre (x,y,z) y una carga. */
  function distTo(x, y, z, charge, eps) {
    const dx = x - charge.x;
    const dy = y - charge.y;
    const dz = z - charge.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz + eps * eps);
  }

  /** V(x,y,z) = k*q1/r1 + k*q2/r2, con q1=+q, q2=-q. */
  function potentialAt(x, y, z, params, positions, eps) {
    const r1 = distTo(x, y, z, positions.plus, eps);
    const r2 = distTo(x, y, z, positions.minus, eps);
    return params.k * params.q * (1 / r1 - 1 / r2);
  }

  /**
   * Genera una malla regular NxN sobre [xmin,xmax] x [ymin,ymax] y evalúa
   * el potencial en el plano z = params.cz (el plano que contiene, por
   * defecto, al dipolo). Devuelve arreglos planos aptos para Plotly.
   */
  function computeGrid2D(params) {
    const n = params.resolution;
    const xs = linspace(params.xmin, params.xmax, n);
    const ys = linspace(params.ymin, params.ymax, n);
    const positions = chargePositions(params);
    const eps = softening(params);

    const V = new Array(n);
    for (let j = 0; j < n; j++) {
      const row = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        row[i] = potentialAt(xs[i], ys[j], params.cz, params, positions, eps);
      }
      V[j] = row;
    }
    return { xs, ys, V, positions };
  }

  /**
   * Campo eléctrico 2D sobre la misma malla, obtenido numéricamente como
   * E = -∇V mediante diferencias finitas centradas. Se calcula sobre una
   * submalla más gruesa (params.fieldStride) para que las flechas no se
   * amontonen unas sobre otras.
   */
  function computeField2D(params) {
    const { xs, ys, V, positions } = computeGrid2D(params);
    const n = xs.length;
    const stride = Math.max(1, Math.round(n / Math.max(params.fieldDensity, 4)));

    const hx = xs[1] - xs[0];
    const hy = ys[1] - ys[0];

    const px = [], py = [], ex = [], ey = [], emag = [];
    for (let j = stride; j < n - stride; j += stride) {
      for (let i = stride; i < n - stride; i += stride) {
        const dVdx = (V[j][i + 1] - V[j][i - 1]) / (2 * hx);
        const dVdy = (V[j + 1][i] - V[j - 1][i]) / (2 * hy);
        const Exi = -dVdx;
        const Eyi = -dVdy;
        px.push(xs[i]);
        py.push(ys[j]);
        ex.push(Exi);
        ey.push(Eyi);
        emag.push(Math.hypot(Exi, Eyi));
      }
    }
    return { px, py, ex, ey, emag, positions };
  }

  /**
   * Evalúa el potencial sobre una esfera de radio R centrada en el centro
   * del dipolo, parametrizada por (theta = polar, phi = azimutal).
   * Devuelve todo lo necesario para dibujar una superficie esférica
   * coloreada por potencial con Plotly (surface o mesh3d).
   */
  function computeSphere(params) {
    const nTheta = params.sphereResolution;
    const nPhi = params.sphereResolution * 2;
    const positions = chargePositions(params);
    const eps = softening(params);

    const thetas = linspace(1e-3, Math.PI - 1e-3, nTheta);
    const phis = linspace(0, 2 * Math.PI, nPhi);

    const X = new Array(nTheta), Y = new Array(nTheta), Z = new Array(nTheta), Vgrid = new Array(nTheta);
    for (let t = 0; t < nTheta; t++) {
      const xRow = new Float64Array(nPhi);
      const yRow = new Float64Array(nPhi);
      const zRow = new Float64Array(nPhi);
      const vRow = new Float64Array(nPhi);
      const st = Math.sin(thetas[t]);
      const ct = Math.cos(thetas[t]);
      for (let p = 0; p < nPhi; p++) {
        const sp = Math.sin(phis[p]);
        const cp = Math.cos(phis[p]);
        const x = params.cx + params.sphereRadius * st * cp;
        const y = params.cy + params.sphereRadius * st * sp;
        const z = params.cz + params.sphereRadius * ct;
        xRow[p] = x; yRow[p] = y; zRow[p] = z;
        vRow[p] = potentialAt(x, y, z, params, positions, eps);
      }
      X[t] = xRow; Y[t] = yRow; Z[t] = zRow; Vgrid[t] = vRow;
    }
    return { X, Y, Z, V: Vgrid, positions };
  }

  function linspace(a, b, n) {
    const out = new Float64Array(n);
    if (n === 1) { out[0] = a; return out; }
    const step = (b - a) / (n - 1);
    for (let i = 0; i < n; i++) out[i] = a + step * i;
    return out;
  }

  return {
    chargePositions,
    potentialAt,
    computeGrid2D,
    computeField2D,
    computeSphere,
    linspace,
  };
})();
