# Panasismos · Sismos Panamá
Mapa interactivo del catálogo USGS para Panamá y alrededores. Aplicación estática compatible con GitHub Pages, sin claves ni dependencias de compilación.

## Funciones
- Consulta USGS al abrir y cada 5 minutos mientras la pestaña esté visible, conservando filtros y posición del mapa.
- Mapa Leaflet con colores por profundidad y tamaño por magnitud.
- Filtros de fecha, magnitud, profundidad y localidad.
- Consultas directas al servicio público USGS; carga de CSV/GeoJSON y exportación de los eventos filtrados.
- Horas mostradas en America/Panama; CSV exportado en UTC.
- Copia inicial real del catálogo USGS: 1816 eventos, magnitud >= 4, desde 2000, corte 2026-10-10 11:54 UTC. Región: latitud 5 a 11, longitud -85 a -76.

## Publicar
En Settings > Pages > Build and deployment, seleccionar Deploy from a branch, rama main y carpeta / (root), y guardar.

## Ejecutar localmente
Desde la raíz ejecutar `python3 -m http.server 8000` y abrir http://localhost:8000. Se necesita un servidor local para cargar catalog.json; no basta abrir index.html como archivo.

## Interpretación
Los puntos representan epicentros estimados, no fallas. Este visualizador no calcula probabilidades ni predice terremotos. El tamaño de los círculos es visual y no representa energía ni área de ruptura. El umbral de completitud requiere evaluación independiente. Los catálogos se revisan y pueden omitir eventos pequeños, especialmente tras un terremoto grande.

Las consultas de rango sustituyen el catálogo en memoria. Los filtros actúan sobre el catálogo cargado; los botones de períodos también consultan USGS. La copia inicial permite usar el mapa sin una consulta en vivo. El mapa base requiere acceso a OpenStreetMap; los datos requieren acceso a earthquake.usgs.gov.

## Créditos
Datos: USGS https://earthquake.usgs.gov/fdsnws/event/1/ (la descarga no implica respaldo de USGS).
Mapa: OpenStreetMap. Leaflet 1.9.4, licencia BSD-2-Clause.

## Catálogo local y filtro ShakeMap

El selector de fuente alterna USGS e Instituto de Geociencias de la Universidad de Panamá (IGC–UP, https://sismosgeociencias.up.ac.pa/). El boletín local solo publica los últimos siete días; no se presenta como catálogo histórico completo. Se conservan su magnitud, epicentro, profundidad, hora y estado preliminar/revisado, sin reemplazarlos con parámetros USGS. No se presupone el tipo de magnitud local.

`scripts/update_igc.py` descarga y valida el boletín HTML sin dependencias externas. `.github/workflows/update-igc.yml` programa una actualización cada 15 minutos (sujeta a las demoras de GitHub Actions). Una descarga sin eventos válidos falla sin reemplazar el último archivo. El explorador consulta la copia de `main` mediante raw.githubusercontent.com, con respaldo en la copia desplegada; muestra la hora de descarga y advierte cuando supera una hora. La página vuelve a consultar cada cinco minutos si está visible. Para comprobar o renovar la copia manualmente: `python scripts/update_igc.py`.

El filtro «Solo eventos con ShakeMap» está desactivado inicialmente. En USGS usa `producttype=shakemap`, respetando período y magnitud. Región: 5–11° N, 85–76° O, incluidos epicentros mar adentro y países vecinos. El período histórico empieza en 2000; esto no implica que todos los sismos tengan ShakeMap. Referencia del servicio: https://earthquake.usgs.gov/fdsnws/event/1/.

En IGC–UP se buscan asociaciones automáticas conservadoras con los eventos USGS que tienen ShakeMap: diferencia temporal ≤90 segundos, distancia epicentral ≤30 km y diferencia de magnitud ≤1. Se exige un único candidato en ambas direcciones. Son criterios operativos pendientes de calibración, no una validación manual ni identificación oficial compartida. Las coincidencias ambiguas quedan sin asociación. Ausencia de asociación no demuestra ausencia de ShakeMap. Se informa la procedencia USGS de la capa y sus parámetros, junto con los criterios y diferencias de la asociación.

Al seleccionar un evento con ShakeMap, se obtiene el producto preferido vigente de USGS (excluyendo productos eliminados), su imagen `intensity_overlay.png` y su archivo de georreferencia. La capa se dibuja sobre el mapa del catálogo, con versión, fecha y enlace al original. Si no se puede descargar, se conserva el enlace oficial y no se muestra la capa de otro evento. La reconstrucción del 9 de octubre que figura más abajo sigue siendo una sección independiente y fija, como indica su leyenda.

Validación: `node tests/catalog-sources.test.cjs`, `node tests/app.test.cjs`, `node tests/shakemap-viewer.test.cjs` y `python -m unittest discover -s tests -p 'test_*.py'`.
