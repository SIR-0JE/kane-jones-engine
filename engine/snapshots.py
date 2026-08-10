"""
Snapshot persistence module for depot sales analysis.

Stores compact JSON snapshots of a period's key aggregates:
  - meta totals (total_revenue, total_gross_profit, overall_margin_pct, date_range, total_invoices, etc.)
  - daily_summary
  - weekly_summary
  - product_ranking
  - customer_margin_detail
  - match_quality & concentration_metrics

File structure: clients/<client_id>/snapshots/<period_label>.json
Clean save_snapshot / load_snapshot / list_snapshots interface for future database migration.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional


def get_snapshots_dir(client_id: str, base_dir: Optional[str] = None) -> Path:
    """Returns Path object for clients/<client_id>/snapshots/ directory, creating it if needed."""
    if base_dir:
        root = Path(base_dir)
    else:
        root = Path(os.getcwd())
    sn_dir = root / "clients" / client_id / "snapshots"
    sn_dir.mkdir(parents=True, exist_ok=True)
    return sn_dir


def save_snapshot(
    client_id: str,
    period_label: str,
    data: Dict[str, Any],
    base_dir: Optional[str] = None,
) -> str:
    """Saves a compact JSON snapshot to clients/<client_id>/snapshots/<period_label>.json.
    Returns the absolute path to the saved file.
    """
    sn_dir = get_snapshots_dir(client_id, base_dir=base_dir)
    clean_label = period_label.strip().replace(" ", "_")
    if not clean_label.endswith(".json"):
        file_path = sn_dir / f"{clean_label}.json"
    else:
        file_path = sn_dir / clean_label

    meta = data.get("meta", {}).copy()
    product_ranking = data.get("product_revenue_ranking", data.get("product_ranking", []))
    customer_detail = data.get("customer_margin_detail", [])

    snapshot_payload = {
        "client_id": client_id,
        "period_label": period_label,
        "meta": meta,
        "daily_summary": data.get("daily_summary", []),
        "weekly_summary": data.get("weekly_summary", []),
        "product_ranking": product_ranking,
        "customer_margin_detail": customer_detail,
        "match_quality": data.get("match_quality", {}),
        "concentration_metrics": data.get("concentration_metrics", {}),
        "dominant_products": data.get("dominant_products", []),
        "loss_making_customers": data.get("loss_making_customers", []),
        "loss_making_invoices_count": meta.get(
            "loss_making_invoices_count", len(data.get("loss_making_invoices", []))
        ),
        "anomalies_count": meta.get(
            "total_anomalies", len(data.get("anomalies", []))
        ),
    }

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(snapshot_payload, f, indent=2, default=str)

    return str(file_path)


def load_snapshot(
    client_id: str,
    period_label: str,
    base_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """Loads a snapshot JSON for the given client and period_label.
    Raises FileNotFoundError if the snapshot does not exist.
    """
    sn_dir = get_snapshots_dir(client_id, base_dir=base_dir)
    clean_label = period_label.strip().replace(" ", "_")
    if not clean_label.endswith(".json"):
        file_path = sn_dir / f"{clean_label}.json"
    else:
        file_path = sn_dir / clean_label

    if not file_path.exists():
        raise FileNotFoundError(
            f"Snapshot '{period_label}' for client '{client_id}' not found at '{file_path}'"
        )

    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def list_snapshots(
    client_id: str,
    base_dir: Optional[str] = None,
) -> List[str]:
    """Lists all available period_labels for a given client."""
    sn_dir = get_snapshots_dir(client_id, base_dir=base_dir)
    files = sorted(sn_dir.glob("*.json"))
    return [f.stem for f in files]
