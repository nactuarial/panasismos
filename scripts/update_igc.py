"""Download the public IGC-UP seven-day bulletin; retain source time and status."""
import hashlib
import json
import math
import os
import re
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse
from urllib.request import Request, urlopen

SOURCE = 'https://sismosgeociencias.up.ac.pa/'

class Bulletin(HTMLParser):
    def __init__(self):
        super().__init__()
        self.events = {}

    def handle_starttag(self, tag, attrs):
        if tag != 'a':
            return
        # Bulletin hrefs contain an unescaped &lt= latitude parameter.
        # HTMLParser decodes that as '<=', so read the original attribute.
        match = re.search(r'''href=["']([^"']+)["']''', self.get_starttag_text(), re.I)
        href = match.group(1).replace('&amp;', '&') if match else ''
        if urlparse(href).path != 'ultimosismo.html':
            return
        q = {k: v[0].strip() for k, v in parse_qs(urlparse(href).query).items()}
        try:
            local = datetime.strptime(q['f'] + ' ' + q['h'], '%Y-%m-%d %I:%M:%S%p').replace(tzinfo=timezone(timedelta(hours=-5)))
            lat, lon, depth, mag = float(q['lt']), float(q['ln']), float(q['p'].replace('km', '').strip()), float(q['m'])
            if not all(map(math.isfinite, [lat, lon, depth, mag])) or not (-90 <= lat <= 90 and -180 <= lon <= 180 and -10 <= depth <= 1000 and -2 <= mag <= 10):
                return
            stamp = local.isoformat()
            key = hashlib.sha256(f'{stamp}|{lat}|{lon}'.encode()).hexdigest()[:20]
            self.events[key] = {'type': 'Feature', 'id': 'igc-' + key, 'geometry': {'type': 'Point', 'coordinates': [lon, lat, depth]}, 'properties': {'time': int(local.timestamp()*1000), 'mag': mag, 'place': q.get('r', 'Panamá'), 'status': q.get('e', 'Sin estado'), 'source': 'IGC–UP', 'url': urljoin(SOURCE, href), 'localTime': stamp}}
        except (KeyError, ValueError):
            return

def parse(text):
    parser = Bulletin()
    parser.feed(text)
    if not parser.events:
        raise ValueError('El boletín no contiene eventos válidos; se conserva la copia anterior.')
    return sorted(parser.events.values(), key=lambda f: f['properties']['time'], reverse=True)

def main():
    request = Request(SOURCE, headers={'User-Agent': 'PanaSismos/1.0 (public seismic bulletin reader)'})
    with urlopen(request, timeout=60) as response:
        features = parse(response.read().decode('utf-8'))
    data = {'type': 'FeatureCollection', 'metadata': {'source': SOURCE, 'generated': datetime.now(timezone.utc).isoformat(), 'coverage': 'Últimos 7 días publicados por IGC-UP', 'timezone': 'America/Panama', 'count': len(features)}, 'features': features}
    path = Path(__file__).resolve().parents[1] / 'data' / 'igc-up.json'
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    os.replace(temp, path)
    print(f'IGC-UP: {len(features)} eventos guardados')

if __name__ == '__main__':
    main()
