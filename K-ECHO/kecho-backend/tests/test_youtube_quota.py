import io
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

import pipeline
from youtube_quota import YouTubeQuotaExceeded, quota_reset_seconds, reserve_quota


class QuotaTests(unittest.TestCase):
    def test_exhausted_budget(self):
        connection = MagicMock()
        connection.execute.return_value.fetchone.return_value = None
        with patch("youtube_quota.psycopg.connect") as connect:
            connect.return_value.__enter__.return_value = connection
            with self.assertRaises(YouTubeQuotaExceeded):
                reserve_quota("dsn", 100, 50)

    def test_reservation_and_reset(self):
        connection = MagicMock()
        connection.execute.return_value.fetchone.return_value = (100,)
        with patch("youtube_quota.psycopg.connect") as connect:
            connect.return_value.__enter__.return_value = connection
            reserve_quota("dsn", 100, 1000)
        self.assertIn("ON CONFLICT", connection.execute.call_args.args[0])
        self.assertTrue(0 < quota_reset_seconds() <= 25 * 3600)

    def test_budget_exhaustion_prevents_external_call(self):
        with patch.dict("os.environ", {"YOUTUBE_API_KEY": "test-key", "DATABASE_URL": "dsn"}), \
                patch("pipeline.reserve_quota", side_effect=YouTubeQuotaExceeded), \
                patch("pipeline.urllib.request.urlopen") as request:
            with self.assertRaises(YouTubeQuotaExceeded):
                pipeline._youtube_api("search", {})
        request.assert_not_called()

    def test_youtube_403_quota_is_classified(self):
        error = HTTPError("https://example.test", 403, "Forbidden", {}, io.BytesIO(
            b'{"error":{"errors":[{"reason":"quotaExceeded"}]}}'
        ))
        with patch.dict("os.environ", {"YOUTUBE_API_KEY": "test-key", "DATABASE_URL": "dsn"}), \
                patch("pipeline.reserve_quota"), \
                patch("pipeline.urllib.request.urlopen", side_effect=error):
            with self.assertRaises(YouTubeQuotaExceeded):
                pipeline._youtube_api("videos", {})


if __name__ == "__main__":
    unittest.main()