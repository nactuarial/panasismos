import importlib.util
import unittest
from pathlib import Path
from datetime import datetime, timezone
spec = importlib.util.spec_from_file_location('igc',Path(__file__).resolve().parents[1]/'scripts/update_igc.py')
igc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(igc)
class BulletinTests(unittest.TestCase):
    def test_real_href_and_local_midnight(self):
        link='<a href="ultimosismo.html?z=8&lt=7.5&ln=-80.7&p=10km&e=REVISADO&h=12:15:44AM&f=2026-10-15&m=3.7&r=Panam%C3%A1">Ver</a>'
        events=igc.parse(link+link)
        self.assertEqual(len(events),1)
        f=events[0]
        self.assertEqual(f['geometry']['coordinates'],[-80.7,7.5,10])
        self.assertEqual(f['properties']['time'],int(datetime(2026,10,15,5,15,44,tzinfo=timezone.utc).timestamp()*1000))
        self.assertEqual(f['properties']['status'],'REVISADO')
    def test_empty_or_broken_bulletin_is_not_published(self):
        for text in ['<h1>Mantenimiento</h1>','<a href="ultimosismo.html?lt=NaN">Ver</a>']:
            with self.assertRaises(ValueError): igc.parse(text)
if __name__ == '__main__': unittest.main()
