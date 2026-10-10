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
