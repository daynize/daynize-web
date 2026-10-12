import subprocess
import sys
import unittest
from contextlib import contextmanager
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient

import api


class SearchTests(unittest.TestCase):
    def setUp(self):
        self.connection = Mock()
        self.connection.execute.return_value.fetchone.return_value = {"total": 1}
        self.connection.execute.return_value.fetchall.return_value = [{
            "subtitle_id": 1, "video_id": "abcdefghijk", "youtube_video_id": "abcdefghijk",
            "start_time": 1.9, "end_time": 3.8, "kr_text": "hello", "en_text": "hello", "drama_title": "Drama",
        }]

        @contextmanager
        def connection():
            yield self.connection

        self.db = patch.object(api.pool, "connection", connection)
        self.db.start()
        self.addCleanup(self.db.stop)
        self.network = patch("urllib.request.urlopen", side_effect=AssertionError("External HTTP forbidden"))
        self.network.start()
        self.addCleanup(self.network.stop)
        self.client = TestClient(api.app)
        self.addCleanup(self.client.close)

    def test_search_and_legacy_alias(self):
        for path in ("/api/search", "/api/kecho/search"):
            response = self.client.get(path, params={"q": "hello"})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["results"][0]["video_id"], "abcdefghijk")
        for call in self.connection.execute.call_args_list:
            self.assertIn("JOIN episodes", call.args[0])

    def test_empty_search_does_not_touch_db(self):
        self.assertEqual(self.client.get("/api/search").json()["results"], [])
        self.connection.execute.assert_not_called()

    def test_no_results_does_not_ingest(self):
        self.connection.execute.return_value.fetchone.return_value = {"total": 0}
        result = self.client.get("/api/search", params={"q": "hello"}).json()
        self.assertEqual(result["results"], [])
        self.assertEqual(result["total"], 0)

    def test_removed_routes_and_input_limits(self):
        for path in ("/api/kecho/ingest", "/api/kecho/discover"):
            self.assertEqual(self.client.post(path, json={"url": "abcdefghijk"}).status_code, 404)
        for params in ({"q": "x" * 101}, {"video": "invalid"}, {"page": 0}, {"limit": 101}):
            self.assertEqual(self.client.get("/api/search", params=params).status_code, 422)

    def test_search_escapes_wildcards(self):
        params, count = api.query_params("100%_\\")
        self.assertEqual(count, 1)
        self.assertEqual(params["p"], "%100\\%\\_\\\\%")

    def test_api_import_without_ingestion_modules(self):
        completed = subprocess.run([
            sys.executable, "-c",
            "import sys; sys.modules['pipeline'] = None; sys.modules['ingest'] = None; "
            "sys.modules['youtube_transcript_api'] = None; import api; "
            "assert 'read_only=on' in api.pool.kwargs['options']",
        ], capture_output=True, text=True)
        self.assertEqual(completed.returncode, 0, completed.stderr)


if __name__ == "__main__":
    unittest.main()