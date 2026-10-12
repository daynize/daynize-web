import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import auto_ingest


class BatchTests(unittest.TestCase):
    def test_approved_default_does_not_discover(self):
        args = SimpleNamespace(source_mode="approved", approved_sources=None, max_ingest=5, delay=0)
        with patch("auto_ingest.load_sources", return_value={}), \
                patch("auto_ingest.psycopg.connect"), \
                patch("auto_ingest.pipeline.requeue_stale"), \
                patch("auto_ingest.queue_new_work", side_effect=AssertionError("Discovery forbidden")), \
                patch("auto_ingest.drain_queue", return_value={}) as drain, \
                patch("auto_ingest.print_db_report"):
            auto_ingest.run_batch(args, "dsn")
        self.assertEqual(drain.call_args.args[-1], {})

    def test_approved_job_skips_network_checks(self):
        source = MagicMock()
        with patch("auto_ingest.psycopg.connect"), \
                patch("auto_ingest.pipeline.queued_ids", return_value=["abcdefghijk"]) as queued, \
                patch("auto_ingest.pipeline.run_job", return_value="done") as run:
            counts = auto_ingest.drain_queue("dsn", 5, 0, [], {"abcdefghijk": source})
        self.assertEqual(queued.call_args.args[-1], ["abcdefghijk"])
        self.assertFalse(run.call_args.kwargs["check_embedding"])
        self.assertEqual(run.call_args.kwargs["ingest_fn"], source.ingest)
        self.assertEqual(counts["done"], 1)

    def test_overlapping_batch_skipped(self):
        connection = MagicMock()
        connection.execute.return_value.fetchone.return_value = (False,)
        with patch("auto_ingest.psycopg.connect") as connect, patch("auto_ingest.run_batch") as batch:
            connect.return_value.__enter__.return_value = connection
            auto_ingest.run_once(SimpleNamespace(), "dsn")
        batch.assert_not_called()

    def test_approved_execution_never_checks_youtube(self):
        importer = MagicMock(return_value={"segments": 3})
        with patch("pipeline.psycopg.connect"), \
                patch("pipeline.claim_job", return_value={"drama_title": "Drama"}), \
                patch("pipeline._finish") as finish, \
                patch("pipeline.is_embeddable", side_effect=AssertionError("External check forbidden")):
            status = auto_ingest.pipeline.run_job("dsn", "abcdefghijk", ingest_fn=importer, check_embedding=False)
        self.assertEqual(status, "done")
        importer.assert_called_once_with("dsn", "abcdefghijk", "Drama")
        self.assertEqual(finish.call_args.args[2], "done")


if __name__ == "__main__":
    unittest.main()