import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from approved_subtitles import load_sources


class ApprovedSourceTests(unittest.TestCase):
    def source(self, **changes):
        return {
            "youtube_video_id": "abcdefghijk", "drama_title": "Drama", "title": "Clip",
            "channel_title": "Rights holder", "rights_reference": "license-123", "embeddable": True,
            "segments": [{"start_time": 1.9, "end_time": 3.5, "kr_text": "Hello", "en_text": "Hello"}],
            **changes,
        }

    def load(self, entry):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sources.json"
            path.write_text(json.dumps([entry]), encoding="utf-8")
            return load_sources(path)

    def test_import_is_offline(self):
        with patch("urllib.request.urlopen", side_effect=AssertionError("Network forbidden")), \
                patch("approved_subtitles.save", return_value=1) as save:
            source = self.load(self.source())["abcdefghijk"]
            result = source.ingest("dsn", "abcdefghijk", "Drama")
        self.assertEqual(result["segments"], 1)
        self.assertEqual(str(save.call_args.args[-1][0]["duration"]), "1.6")

    def test_rejects_unapproved_sources(self):
        for changes in ({"rights_reference": ""}, {"embeddable": False}, {"youtube_video_id": "bad"}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.load(self.source(**changes))

    def test_rejects_bad_timestamps(self):
        for start, end in ((-1, 2), (2, 1), (2, 2), ("NaN", 3), (0, "Infinity")):
            with self.subTest(start=start, end=end), self.assertRaises(ValueError):
                self.load(self.source(segments=[{"start_time": start, "end_time": end, "kr_text": "Hello"}]))


if __name__ == "__main__":
    unittest.main()