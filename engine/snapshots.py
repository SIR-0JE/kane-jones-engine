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
    if "audit_title" in data:
        meta["audit_title"] = data["audit_title"]
    elif "audit_title" not in meta:
        meta["audit_title"] = f"{period_label} Audit"

    product_ranking = data.get("product_revenue_ranking", data.get("product_ranking", []))
    customer_detail = data.get("customer_margin_detail", [])

    snapshot_payload = {
        "client_id": client_id,
        "period_label": period_label,
        "audit_title": meta.get("audit_title", f"{period_label} Audit"),
        "meta": meta,
        "daily_summary": data.get("daily_summary", []),
        "weekly_summary": data.get("weekly_summary", []),
        "product_ranking": product_ranking,
        "product_revenue_ranking": product_ranking,
        "customer_margin_detail": customer_detail,
        "below_floor_pricing": data.get("below_floor_pricing", []),
        "volume_tier_audit": data.get("volume_tier_audit", []),
        "reconciliation_discrepancies": data.get("reconciliation_discrepancies", []),
        "anomalies": data.get("anomalies", []),
        "loss_making_invoices": data.get("loss_making_invoices", []),
        "loss_making_customers": data.get("loss_making_customers", []),
        "match_quality": data.get("match_quality", {}),
        "concentration_metrics": data.get("concentration_metrics", {}),
        "dominant_products": data.get("dominant_products", []),
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
    files = sorted(sn_dir.glob("*.json"), reverse=True)
    return [f.stem for f in files]


def list_snapshots_summary(
    client_id: str,
    base_dir: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Lists summary cards for all available snapshots, sorted newest first."""
    sn_dir = get_snapshots_dir(client_id, base_dir=base_dir)
    files = sorted(sn_dir.glob("*.json"), reverse=True)
    summaries = []
    for f in files:
        try:
            with open(f, "r", encoding="utf-8") as fp:
                data = json.load(fp)
            meta = data.get("meta", {})
            summaries.append({
                "period_label": data.get("period_label", f.stem),
                "audit_title": data.get("audit_title", meta.get("audit_title", f"{f.stem} Audit")),
                "total_revenue": meta.get("total_revenue", 0.0),
                "total_gross_profit": meta.get("total_gross_profit", 0.0),
                "overall_margin_pct": meta.get("overall_margin_pct", 0.0),
                "total_invoices": meta.get("total_invoices", 0),
                "total_recoverable_leakage": meta.get("total_recoverable_leakage", 0.0),
                "below_floor_items_count": meta.get("below_floor_items_count", len(data.get("below_floor_pricing", []))),
                "loss_making_customers_count": meta.get("loss_making_customers_count", len(data.get("loss_making_customers", []))),
                "currency_symbol": meta.get("currency_symbol", "₦"),
                "date_range": meta.get("date_range", {}),
                "created_at": data.get("created_at"),
            })
        except Exception:
            continue
    return summaries

