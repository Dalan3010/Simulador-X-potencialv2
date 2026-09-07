# Dipolo eléctrico — Simulación interactiva de potencial (2D/3D)

Simulador educativo e interactivo de un dipolo eléctrico (dos cargas puntuales
`+q` y `−q`), con mapa de potencial 2D, curvas equipotenciales, superficie 3D
`V(x,y)`, una esfera 3D coloreada por potencial y una vista opcional del
campo eléctrico `E = −∇V`.

Es una aplicación **100% en el navegador**: no hay backend, no hay que
instalar Python ni Node — se abre un archivo HTML y ya funciona.

---

## 1. Comparación de lenguajes/tecnologías

| Criterio | Python (NumPy+Matplotlib) | Python (NumPy+Plotly/Dash) | JavaScript/TypeScript (Plotly.js/Three.js) | MATLAB | C++ (VTK/Qt) |
|---|---|---|---|---|---|
| Calidad gráficos 2D | Muy buena | Muy buena | Muy buena | Buena | Excelente pero laboriosa |
| Calidad gráficos 3D | Limitada (mplot3d es lento y poco interactivo) | Buena (WebGL vía Plotly) | Excelente (WebGL nativo) | Buena | Excelente |
| Interactividad en vivo (sliders → redibujo instantáneo) | Pobre (requiere `%matplotlib widget` o recargar figuras) | Buena, pero **exige levantar un servidor Dash/Flask** | Excelente: todo corre en el cliente, sin servidor | Buena (App Designer), pero de pago | Posible, pero mucho código de UI |
| Rendimiento con mallas grandes | Medio (bucles lentos si no se vectoriza) | Medio-alto | Alto (WebGL, GPU) | Alto | Muy alto |
| Facilidad para modificar la simulación | Alta (Python es muy legible) | Alta | Alta (JS moderno, módulos claros) | Media (sintaxis propia) | Baja (compilación, punteros, build system) |
| Facilidad para **ejecutar** el programa | Requiere instalar Python + librerías | Requiere Python + librerías + servidor local corriendo | **Abrir un archivo `.html` en cualquier navegador** | Requiere licencia de MATLAB | Requiere compilar (CMake, toolchain, dependencias gráficas) |
| Costo / accesibilidad | Gratis | Gratis | Gratis | De pago | Gratis, pero con fricción de build |

### Recomendación elegida: **JavaScript + Plotly.js (aplicación web estática)**

Se evaluó explícitamente si Python era la mejor opción, como pedías. La
conclusión es que **no**, por una razón muy concreta: el requisito más
repetido en tu especificación es la **interactividad en vivo** (sliders que
mueven cargas, cambian resolución, activan/desactivan capas, rotan cámaras en
3D) combinada con **máxima facilidad de ejecución** ("quiero un programa
funcional que pueda ejecutar directamente").

- Con **Matplotlib**, la interactividad 3D (rotar, hacer zoom) es limitada y
  los sliders (`ipywidgets`/`matplotlib.widgets`) son toscos comparados con
  un panel HTML real.
- Con **Plotly + Dash en Python** se consigue muy buena interactividad, pero
  a costa de **tener que levantar un servidor local** (`python app.py`,
  puerto, navegador apuntando a `localhost:8050`, gestión de entorno virtual,
  `pip install` de varias librerías). Es un paso adicional que no aporta nada
  a la física del problema.
- Con **JavaScript + Plotly.js**, toda la interactividad de Dash se obtiene
  sin servidor: Plotly.js es la misma tecnología de renderizado (WebGL) que
  usa Plotly para Python, pero corriendo directamente en el navegador. El
  "programa" es un conjunto de archivos estáticos: `index.html` +
  `.js` + `.css`. Se ejecuta con doble clic. No hay instalación de
  dependencias de sistema, ni versiones de Python, ni entornos virtuales.
- **MATLAB** da buena interactividad y 3D decente, pero requiere licencia de
  pago, lo que rompe la "facilidad para ejecutar" para cualquiera que reciba
  el proyecto.
- **C++** (por ejemplo con VTK o Qt) daría el mejor rendimiento posible, pero
  el costo de desarrollo (compilación, gestión de dependencias gráficas,
  UI desde cero) es desproporcionado para una simulación educativa, y
  "ejecutar directamente" se vuelve "compilar primero" en la mayoría de
  computadoras.

En resumen: **Plotly.js** da gráficos 2D/3D de calidad profesional (mismo
motor que Plotly para Python), interactividad de cámara nativa (rotar,
zoom, pan) sin escribir código extra, actualización instantánea de todas las
vistas al mover un slider, y el mayor punto a favor para tus requisitos:
**se ejecuta abriendo un archivo, en cualquier sistema operativo, sin
instalar nada**.

> Si en algún momento prefieres una versión en Python (por ejemplo para
> integrarla en un notebook de clase), la sección **"Posibles mejoras
> futuras"** explica cómo portar la misma arquitectura a
> NumPy + Plotly/Dash reutilizando exactamente la misma separación de
> responsabilidades (`physics.py`, `viz2d.py`, etc.).

---

## 2. Estructura de carpetas

```
dipolo/
├── index.html          # Estructura de la página: panel de control + escenario de la gráfica
├── README.md            # Este documento
├── css/
│   └── style.css         # Todo el estilo visual de la interfaz
└── js/
    ├── physics.js         # Física pura: posiciones de las cargas, V, E, mallas, esfera
    ├── viz2d.js            # Mapa 2D, curvas de nivel, vectores de campo (Plotly "contour"/"scatter")
    ├── viz3d.js            # Superficie 3D V(x,y) (Plotly "surface")
    ├── sphere.js           # Esfera 3D coloreada por potencial (Plotly "surface" con surfacecolor)
    ├── ui.js               # Lectura/escritura del panel de controles, valores por defecto, pestañas
    └── main.js             # Punto de entrada: conecta UI ↔ módulos de visualización
```

Cada archivo tiene una única responsabilidad, tal como pediste: la física no
sabe nada de Plotly, y cada módulo de visualización no sabe nada de los
demás. `main.js` es el único que los conecta.

---

## 3. Instalación de dependencias

**No hay que instalar nada.** El proyecto usa dos librerías cargadas desde
un CDN directamente en `index.html`:

- [Plotly.js](https://plotly.com/javascript/) — gráficos 2D/3D interactivos.
- [KaTeX](https://katex.org/) — para renderizar las ecuaciones en el panel
  de ayuda ("Física & ecuaciones").

La única condición es tener **conexión a internet la primera vez** que se
abre la página (los navegadores modernos cachean estos archivos después).
Si necesitas una versión 100% sin conexión, descarga `plotly-2.32.0.min.js`
y los archivos de KaTeX y reemplaza las etiquetas `<script src="https://...">`
por rutas locales, ej. `js/vendor/plotly.min.js`.

---

## 4. Instrucciones exactas para ejecutar el programa

1. Descarga/descomprime la carpeta `dipolo/` completa (debe conservar la
   subestructura `css/` y `js/`).
2. Haz doble clic sobre `index.html` (o ábrelo con clic derecho →
   "Abrir con" → tu navegador: Chrome, Firefox, Edge o Safari).
3. Eso es todo — la simulación carga inmediatamente con valores por defecto.

Alternativa (recomendada si tu navegador bloquea `file://` para scripts
locales): sirve la carpeta con un servidor estático simple, por ejemplo:

```bash
# Con Python ya instalado (solo para servir archivos, no para la simulación):
cd dipolo
python -m http.server 8000
# Abre http://localhost:8000 en el navegador
```

```bash
# O con Node.js:
npx serve dipolo
```

---

## 5. Cómo funciona cada parte importante

- **`physics.js`**: dado un objeto `params` (carga, separación, orientación,
  centro, límites, resolución), calcula la posición 3D de `+q` y `−q`
  (`chargePositions`), evalúa `V(x,y,z)` en cualquier punto (`potentialAt`),
  genera la malla 2D y su potencial (`computeGrid2D`), deriva el campo
  eléctrico por diferencias finitas centradas (`computeField2D`), y evalúa
  el potencial sobre una esfera en coordenadas esféricas (`computeSphere`).
  Todas las operaciones de malla usan arreglos tipados (`Float64Array`) para
  que la evaluación sea rápida incluso con resoluciones altas.
- **`viz2d.js`**: construye las trazas de Plotly para las tres vistas
  basadas en el plano XY (mapa, curvas de nivel, campo). Reutiliza la misma
  malla y el mismo trace tipo `contour` de Plotly, cambiando solo su modo de
  coloreado (`heatmap` vs `lines`) según la vista activa.
- **`viz3d.js`**: construye la superficie 3D `V(x,y)` con Plotly `surface`,
  proyectando curvas de nivel sobre el plano Z si están activadas.
- **`sphere.js`**: construye la esfera 3D. Usa `surfacecolor` (en vez de
  height-mapping) para que el radio se mantenga constante y toda la
  información física quede codificada en el color, como pide la
  especificación.
- **`ui.js`**: es el único archivo que toca el DOM del panel de control. No
  importa qué gráfico esté activo — simplemente lee todos los valores
  actuales (`getParams`) y notifica cambios.
- **`main.js`**: mantiene el estado de "qué vista está activa" y llama al
  módulo de visualización correspondiente cada vez que algo cambia.

---

## 6. Explicación de las ecuaciones utilizadas

**Potencial de un dipolo (superposición de dos cargas puntuales):**

```
V(x,y,z) = k · ( q₁/r₁ + q₂/r₂ ) = k·q · ( 1/r₁ − 1/r₂ )
```

con `q₁ = +q`, `q₂ = −q`, y `r₁`, `r₂` las distancias desde el punto de
evaluación hasta cada carga.

**Campo eléctrico como gradiente del potencial:**

```
E = −∇V = −( ∂V/∂x, ∂V/∂y, ∂V/∂z )
```

El simulador lo calcula numéricamente con diferencias finitas centradas
sobre la malla, en vez de usar la fórmula analítica del campo dipolar; esto
mantiene el código físico concentrado en una sola función (`potentialAt`) y
evita duplicar la derivación cuando se cambian los parámetros.

**Superficies/curvas equipotenciales**: puntos donde `V` es constante. El
campo eléctrico siempre es perpendicular a ellas.

**Suavizado numérico (evita división por cero):**

```
r = √( Δx² + Δy² + Δz² + ε² ),   ε = max(0.001·d, 1e-6)
```

Todo esto también está explicado, con notación matemática renderizada, en el
botón **"Física & ecuaciones"** dentro de la propia aplicación.

---

## 7. Posibles mejoras futuras

- **Líneas de campo reales (streamlines)** en vez de vectores puntuales,
  integrando la trayectoria del campo paso a paso.
- **Múltiples dipolos o multipolos** (cuadrupolo, octupolo) reutilizando la
  misma arquitectura de `physics.js` con una lista de cargas en vez de dos
  fijas.
- **Corte interactivo de la superficie 3D** (mover un plano `z = c` y ver el
  mapa de potencial en ese corte).
- **Exportar la vista actual** como imagen PNG/SVG (Plotly.js lo soporta de
  fábrica con `Plotly.downloadImage`).
- **Modo comparativo**: dos paneles lado a lado para comparar dos
  configuraciones de dipolo.
- **Versión en Python (NumPy + Dash/PyVista)** para quien prefiera
  integrarlo en un notebook de clase o pipeline de análisis: la misma
  separación de responsabilidades (`physics.py`, `viz2d.py`, `viz3d.py`,
  `sphere.py`, `app.py` con callbacks de Dash) se traduce casi
  directamente, cambiando `Plotly.js` (JavaScript) por `plotly.graph_objects`
  (Python) y los `<input>` de HTML por componentes `dcc.Slider`/`dcc.Checklist`
  de Dash.
- **Unidades físicas reales seleccionables** (SI vs. unidades atómicas) con
  conversión automática de las escalas de los ejes y la barra de color.
