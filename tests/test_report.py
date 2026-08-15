"""
Unit and functional tests for ReportLab PDF Executive Report generator.
"""

import pytest
from engine.report import generate_report_pdf


class TestReportPdfGenerator:
    """Validates PDF report generation and ReportLab story assembly."""

    def test_pdf_generation_from_snapshot(self, stored_snapshot):
        pdf_bytes = generate_report_pdf(stored_snapshot)

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 50000, "Generated PDF should be greater than 50KB"
        assert pdf_bytes.startswith(b"%PDF-"), "Output must have standard PDF magic header"
