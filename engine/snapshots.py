"""
Snapshot persistence module for depot sales analysis.

Backed by Supabase Postgres (`depots` and `audits` tables) and Supabase Storage (`audit-uploads` bucket),
with local filesystem caching fallback.

Schema:
- depots: id (UUID), client_id (TEXT, unique), display_name (TEXT), config (JSONB), created_at (TIMESTAMPTZ)
- audits: id (UUID), depot_id (UUID FK), period_label (TEXT), audit_title (TEXT), storage_path (TEXT), payload (JSONB), uploaded_at (TIMESTAMPTZ)
"""

import json
import os
import urllib.parse
from pathlib import Path
from typing import Any, Dict, List, Optional
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://bsytjouvkjlkroqljxae.supabase.co")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzeXRqb3V2a2psa3JvcWxqeGFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjQ0NTUzNCwiZXhwIjoyMTAyMDIxNTM0fQ.PrIex3J3zeaUPgyYt7v1m2g1pir2Mott-Wl9TdeR-q8"
)
STORAGE_BUCKET = "audit-uploads"


def _get_headers() -> Dict[str, str]:
    return {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }


def get_snapshots_dir(client_id: str, base_dir: Optional[str] = None) -> Path:
    """Returns local Path object for clients/<client_id>/snapshots/ directory (cache)."""
    if base_dir:
        root = Path(base_dir)
    else:
        root = Path(os.getcwd())
    sn_dir = root / "clients" / client_id / "snapshots"
    try:
        sn_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    return sn_dir


def get_or_create_depot(client_id: str, display_name: Optional[str] = None, config: Optional[dict] = None) -> Optional[str]:
    """Retrieves or creates the depot row in Supabase 'depots' table, returning its UUID."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None

    try:
        headers = _get_headers()
        # 1. Query existing depot by client_id
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/depots?client_id=eq.{urllib.parse.quote(client_id)}&select=id",
            headers=headers,
            timeout=5,
        )
        if r.status_code == 200:
            rows = r.json()
            if rows and len(rows) > 0:
                return rows[0]["id"]

        # 2. Insert new depot row if not found
        payload = {
            "client_id": client_id,
            "display_name": display_name or f"{client_id.title()} Depot",
            "config": config or {},
        }
        r_post = requests.post(
            f"{SUPABASE_URL}/rest/v1/depots?on_conflict=client_id",
            headers=headers,
            json=payload,
            timeout=5,
        )
        if r_post.status_code in (200, 201):
            created = r_post.json()
            if created and len(created) > 0:
                return created[0]["id"]
    except Exception:
        pass
    return None


def check_depot_exists(client_id: str) -> dict:
    """Queries whether a depot row exists in Supabase 'depots' table without auto-creating."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return {"exists": True, "id": None, "client_id": client_id, "display_name": client_id}

    try:
        headers = _get_headers()
        r = requests.get(
            f"{SUPABASE_URL}/rest/v1/depots?client_id=eq.{urllib.parse.quote(client_id)}&select=id,client_id,display_name,created_at",
            headers=headers,
            timeout=5,
        )
        if r.status_code == 200:
            rows = r.json()
            if rows and len(rows) > 0:
                return {
                    "exists": True,
                    "id": rows[0]["id"],
                    "client_id": rows[0]["client_id"],
                    "display_name": rows[0].get("display_name"),
                }
    except Exception:
        pass
    return {"exists": False, "id": None, "client_id": client_id, "display_name": None}


def update_depot(client_id: str, display_name: str) -> bool:
    """Updates display_name of depot row in Supabase 'depots' table, upserting if missing."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return False
    try:
        headers = _get_headers()
        # 1. Try patch
        url = f"{SUPABASE_URL}/rest/v1/depots?client_id=eq.{urllib.parse.quote(client_id)}"
        r = requests.patch(url, headers=headers, json={"display_name": display_name}, timeout=5)
        if r.status_code in (200, 204):
            # Check if row was actually updated
            check = requests.get(f"{SUPABASE_URL}/rest/v1/depots?client_id=eq.{urllib.parse.quote(client_id)}&select=id", headers=headers, timeout=5)
            if check.status_code == 200 and len(check.json()) > 0:
                return True
        
        # 2. If row was missing, upsert it
        payload = {"client_id": client_id, "display_name": display_name, "config": {}}
        r_post = requests.post(f"{SUPABASE_URL}/rest/v1/depots?on_conflict=client_id", headers=headers, json=payload, timeout=5)
        return r_post.status_code in (200, 201)
    except Exception:
        return False



def upload_to_storage(client_id: str, period_label: str, file_bytes: bytes, filename: str) -> Optional[str]:
    """Uploads a raw Excel workbook file to Supabase Storage bucket 'audit-uploads'."""
    if not file_bytes or not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None

    try:
        clean_period = period_label.strip().replace(" ", "_")
        clean_name = filename.strip().replace(" ", "_")
        storage_path = f"{client_id}/{clean_period}/{clean_name}"
        url = f"{SUPABASE_URL}/storage/v1/object/{STORAGE_BUCKET}/{storage_path}"

        headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "x-upsert": "true",
        }
        r = requests.post(url, headers=headers, data=file_bytes, timeout=15)
        if r.status_code in (200, 201):
            return storage_path
    except Exception:
        pass
    return None


def save_snapshot(
    client_id: str,
    period_label: str,
    data: Dict[str, Any],
    base_dir: Optional[str] = None,
    file_bytes: Optional[bytes] = None,
    filename: Optional[str] = None,
) -> str:
    """Persists analysis payload to Supabase Postgres 'audits' table and Storage bucket,
    with local disk cache.
    """
    meta = data.get("meta", {}).copy()
    audit_title = data.get("audit_title", meta.get("audit_title", f"{period_label} Full Audit"))
    meta["audit_title"] = audit_title

    product_ranking = data.get("product_revenue_ranking", data.get("product_ranking", []))
    customer_detail = data.get("customer_margin_detail", [])

    snapshot_payload = {
        "client_id": client_id,
        "period_label": period_label,
        "audit_title": audit_title,
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
        "true_cost_products": data.get("true_cost_products", []),
        "true_cost_marketers": data.get("true_cost_marketers", []),
        "returns_analysis": data.get("returns_analysis", {}),
        "net_profit_bridge": data.get("net_profit_bridge", {}),
    }

    storage_path = None
    if file_bytes and filename:
        storage_path = upload_to_storage(client_id, period_label, file_bytes, filename)

    # 1. Save to Supabase Postgres if available
    try:
        depot_id = get_or_create_depot(client_id)
        if depot_id:
            audit_record = {
                "depot_id": depot_id,
                "period_label": period_label,
                "audit_title": audit_title,
                "storage_path": storage_path,
                "payload": snapshot_payload,
            }
            headers = _get_headers()
            headers["Prefer"] = "resolution=merge-duplicates"
            requests.post(
                f"{SUPABASE_URL}/rest/v1/audits?on_conflict=depot_id,period_label",
                headers=headers,
                json=audit_record,
                timeout=10,
            )
    except Exception:
        pass

    # 2. Local filesystem cache backup
    clean_label = period_label.strip().replace(" ", "_")
    sn_dir = get_snapshots_dir(client_id, base_dir=base_dir)
    file_path = sn_dir / f"{clean_label}.json"
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(snapshot_payload, f, indent=2, default=str)
    except Exception:
        pass

    return str(file_path)


def load_snapshot(
    client_id: str,
    period_label: str,
    base_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """Loads a snapshot from Supabase Postgres 'audits' table, falling back to local cache."""
    clean_label = period_label.strip().replace(" ", "_")

    # 1. Try Supabase PostgREST
    try:
        depot_id = get_or_create_depot(client_id)
        if depot_id:
            headers = _get_headers()
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/audits?depot_id=eq.{depot_id}&period_label=eq.{urllib.parse.quote(period_label)}&select=payload,storage_path",
                headers=headers,
                timeout=5,
            )
            if r.status_code == 200:
                rows = r.json()
                if rows and len(rows) > 0 and rows[0].get("payload"):
                    payload = rows[0]["payload"]
                    payload["storage_path"] = rows[0].get("storage_path")
                    return payload
    except Exception:
        pass

    # 2. Fallback to local cache
    sn_dir = get_snapshots_dir(client_id, base_dir=base_dir)
    file_path = sn_dir / f"{clean_label}.json"
    if file_path.exists():
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    raise FileNotFoundError(
        f"Snapshot '{period_label}' for client '{client_id}' not found in Supabase or local cache."
    )


def list_snapshots(
    client_id: str,
    base_dir: Optional[str] = None,
) -> List[str]:
    """Lists all available period_labels for a given client from Supabase, falling back to local files."""
    # 1. Try Supabase
    try:
        depot_id = get_or_create_depot(client_id)
        if depot_id:
            headers = _get_headers()
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/audits?depot_id=eq.{depot_id}&select=period_label&order=uploaded_at.desc",
                headers=headers,
                timeout=5,
            )
            if r.status_code == 200:
                rows = r.json()
                if rows is not None:
                    return [row["period_label"] for row in rows if "period_label" in row]
    except Exception:
        pass

    # 2. Fallback to local files
    sn_dir = get_snapshots_dir(client_id, base_dir=base_dir)
    files = sorted(sn_dir.glob("*.json"), reverse=True)
    return [f.stem for f in files]


def list_snapshots_summary(
    client_id: str,
    base_dir: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Lists summary cards for all available snapshots from Supabase, sorted newest first."""
    # 1. Try Supabase
    try:
        depot_id = get_or_create_depot(client_id)
        if depot_id:
            headers = _get_headers()
            r = requests.get(
                f"{SUPABASE_URL}/rest/v1/audits?depot_id=eq.{depot_id}&select=period_label,audit_title,payload,storage_path,uploaded_at&order=uploaded_at.desc",
                headers=headers,
                timeout=5,
            )
            if r.status_code == 200:
                rows = r.json()
                if rows and len(rows) > 0:
                    summaries = []
                    for row in rows:
                        payload = row.get("payload", {})
                        meta = payload.get("meta", {})
                        summaries.append({
                            "period_label": row.get("period_label"),
                            "audit_title": row.get("audit_title") or meta.get("audit_title", f"{row.get('period_label')} Audit"),
                            "total_revenue": meta.get("total_revenue", 0.0),
                            "total_gross_profit": meta.get("total_gross_profit", 0.0),
                            "overall_margin_pct": meta.get("overall_margin_pct", 0.0),
                            "total_invoices": meta.get("total_invoices", 0),
                            "total_recoverable_leakage": meta.get("total_recoverable_leakage", 0.0),
                            "below_floor_items_count": meta.get("below_floor_items_count", len(payload.get("below_floor_pricing", []))),
                            "loss_making_customers_count": meta.get("loss_making_customers_count", len(payload.get("loss_making_customers", []))),
                            "currency_symbol": meta.get("currency_symbol", "₦"),
                            "date_range": meta.get("date_range", {}),
                            "created_at": row.get("uploaded_at"),
                            "storage_path": row.get("storage_path"),
                        })
                    return summaries
    except Exception:
        pass

    # 2. Fallback to local files
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


def clear_all_audits(client_id: str = "kane-jones") -> bool:
    """Deletes all audits for a client from Supabase and local cache for clean-slate testing."""
    # 1. Clear Supabase audits
    try:
        depot_id = get_or_create_depot(client_id)
        if depot_id:
            headers = _get_headers()
            requests.delete(
                f"{SUPABASE_URL}/rest/v1/audits?depot_id=eq.{depot_id}",
                headers=headers,
                timeout=5,
            )
    except Exception:
        pass

    # 2. Clear local cache
    try:
        sn_dir = get_snapshots_dir(client_id)
        for f in sn_dir.glob("*.json"):
            try:
                f.unlink()
            except Exception:
                pass
    except Exception:
        pass

    return True
