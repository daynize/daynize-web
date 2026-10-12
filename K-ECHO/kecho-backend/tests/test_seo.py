import json
import unittest
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path


SITE_ROOT = Path(__file__).resolve().parents[3]
FRONTEND = SITE_ROOT / "K-ECHO" / "kecho-frontend"


class SEOParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.canonical = []
        self.title = ""
        self.schemas = []
        self.capture = None

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        if tag == "meta":
            self.meta[attributes.get("name", attributes.get("property"))] = attributes.get("content")
        if tag == "link" and attributes.get("rel") == "canonical":
            self.canonical.append(attributes["href"])
        if tag == "title":
            self.capture = "title"
        if tag == "script" and attributes.get("type") == "application/ld+json":
            self.capture = "schema"
            self.schemas.append("")

    def handle_data(self, data):
        if self.capture == "title":
            self.title += data
        if self.capture == "schema":
            self.schemas[-1] += data

    def handle_endtag(self, tag):
        if tag in ("title", "script"):
            self.capture = None


class SEOTests(unittest.TestCase):
    def test_brand_schema_and_canonical(self):
        for path, canonical in (
            (SITE_ROOT / "index.html", "https://www.daynize.co.kr/"),
            (FRONTEND / "index.html", "https://www.daynize.co.kr/kecho/"),
        ):
            with self.subTest(path=path):
                parser = SEOParser()
                parser.feed(path.read_text(encoding="utf-8"))
                self.assertTrue(parser.title.startswith("데이나이즈 (Daynize)"))
                self.assertEqual(parser.canonical, [canonical])
                self.assertEqual(parser.meta["og:url"], canonical)
                for name in ("description", "og:title", "og:description", "og:site_name"):
                    self.assertIn("데이나이즈", parser.meta[name])
                    self.assertIn("Daynize", parser.meta[name])
                self.assertEqual(len(parser.schemas), 1)
                self.assertEqual(json.loads(parser.schemas[0]), {
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "name": "데이나이즈",
                    "alternateName": ["Daynize"],
                    "url": "https://www.daynize.co.kr",
                })

    def test_root_and_public_crawler_files(self):
        for folder in (SITE_ROOT, FRONTEND / "public"):
            with self.subTest(folder=folder):
                sitemap = ET.parse(folder / "sitemap.xml")
                locations = sitemap.findall("{http://www.sitemaps.org/schemas/sitemap/0.9}url/{http://www.sitemaps.org/schemas/sitemap/0.9}loc")
                self.assertEqual([location.text for location in locations], [
                    "https://www.daynize.co.kr/", "https://www.daynize.co.kr/kecho/",
                ])
                self.assertIn("Sitemap: https://www.daynize.co.kr/sitemap.xml", (folder / "robots.txt").read_text())
        self.assertEqual((SITE_ROOT / "robots.txt").read_bytes(), (FRONTEND / "public/robots.txt").read_bytes())
        self.assertEqual((SITE_ROOT / "sitemap.xml").read_bytes(), (FRONTEND / "public/sitemap.xml").read_bytes())

    def test_domain_and_image(self):
        self.assertEqual((SITE_ROOT / "CNAME").read_text().strip(), "www.daynize.co.kr")
        self.assertIn("VITE_KECHO_API_BASE=https://www.daynize.co.kr", (FRONTEND / ".env.production").read_text())
        self.assertTrue((SITE_ROOT / "DAYNIZE LOGO ONLY.png").is_file())


if __name__ == "__main__":
    unittest.main()