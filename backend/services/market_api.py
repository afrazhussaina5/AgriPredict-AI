# AgriPredict AI - Government Mandi API Client
"""
Phase A & B: Reusable, secure API client for fetching agricultural market data from
Government Mandi API (Data.gov.in / Agmarknet) with pagination, filter generation,
and secure credential handling.
"""

import os
import re
import time
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

import requests
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("market_api")

# Load environment variables from .env in project root or current working dir
_current_dir = os.path.dirname(os.path.abspath(__file__))
_project_root = os.path.abspath(os.path.join(_current_dir, "..", ".."))
_dotenv_path = os.path.join(_project_root, ".env")

if os.path.exists(_dotenv_path):
    load_dotenv(dotenv_path=_dotenv_path)
else:
    load_dotenv()  # Fallback to default search


def sanitize_message(msg: str, api_key: Optional[str] = None) -> str:
    """
    Remove or mask API keys from log messages or URLs to prevent credential leakage.
    """
    if not msg:
        return ""
    
    # Redact known API key if provided or found in environment
    active_key = api_key or os.getenv("MARKET_API_KEY")
    if active_key and active_key not in ("PASTE_MY_API_KEY_HERE", "", None):
        msg = msg.replace(active_key, "REDACTED_API_KEY")
    
    # Redact query params matching api-key or api_key
    msg = re.sub(r'(api-?key=)[^&\s]+', r'\1REDACTED', msg, flags=re.IGNORECASE)
    return msg


def get_api_config() -> Tuple[Optional[str], Optional[str]]:
    """
    Load and validate API URL and API Key from environment variables.
    """
    api_url = os.getenv("MARKET_API_URL", "").strip()
    api_key = os.getenv("MARKET_API_KEY", "").strip()

    # Check if placeholder is present
    is_placeholder_key = api_key in ("PASTE_MY_API_KEY_HERE", "YOUR_API_KEY_HERE", "")
    is_placeholder_url = api_url in ("PASTE_MY_API_URL_HERE", "YOUR_API_URL_HERE", "")

    return (
        None if is_placeholder_url else api_url,
        None if is_placeholder_key else api_key
    )


def build_query_params(
    api_key: Optional[str],
    state: Optional[str] = None,
    district: Optional[str] = None,
    commodity: Optional[str] = None,
    arrival_date: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    format_type: str = "json"
) -> Dict[str, Any]:
    """
    Construct query parameters for the government mandi API.
    Dynamically adds filter keys only when non-empty values are provided.
    """
    params: Dict[str, Any] = {
        "format": format_type,
        "offset": max(0, int(offset)),
        "limit": max(1, min(int(limit), 10000))
    }

    if api_key:
        params["api-key"] = api_key

    # Dynamic filter parameters matching government API conventions
    if state and state.strip():
        params["filters[State]"] = state.strip()

    if district and district.strip():
        params["filters[District]"] = district.strip()

    if commodity and commodity.strip():
        params["filters[Commodity]"] = commodity.strip()

    if arrival_date and arrival_date.strip():
        params["filters[Arrival_Date]"] = arrival_date.strip()

    return params


def extract_records_from_response(json_data: Any) -> Tuple[List[Dict[str, Any]], int]:
    """
    Extract record list and total record count from various government API response formats.
    """
    if isinstance(json_data, list):
        return json_data, len(json_data)

    if isinstance(json_data, dict):
        # Format 1: data.gov.in standard format {"records": [...], "total": 1500, "count": 100}
        records = json_data.get("records") or json_data.get("data") or json_data.get("results")
        total = json_data.get("total") or json_data.get("total_records") or json_data.get("count")

        if isinstance(records, list):
            total_count = int(total) if total is not None and str(total).isdigit() else len(records)
            return records, total_count

        # Format 2: dict with rows key
        if "rows" in json_data and isinstance(json_data["rows"], list):
            return json_data["rows"], len(json_data["rows"])

    return [], 0


def fetch_market_data(
    state: Optional[str] = None,
    district: Optional[str] = None,
    commodity: Optional[str] = None,
    arrival_date: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    timeout: float = 10.0
) -> Dict[str, Any]:
    """
    Fetch a single page of agricultural market data from the external government API.

    Returns a standardized dictionary:
    {
        "status": "success" | "error" | "unconfigured",
        "data_source": "live_api" | "error",
        "records": [...],
        "total": int,
        "offset": int,
        "limit": int,
        "last_updated": ISO timestamp,
        "message": str
    }
    """
    api_url, api_key = get_api_config()
    current_time = datetime.now(timezone.utc).isoformat()

    if not api_url or not api_key:
        msg = "Market API URL or API Key is not configured. Using cached or fallback data."
        logger.info(msg)
        return {
            "status": "unconfigured",
            "data_source": "unconfigured",
            "records": [],
            "total": 0,
            "offset": offset,
            "limit": limit,
            "last_updated": current_time,
            "message": msg
        }

    params = build_query_params(
        api_key=api_key,
        state=state,
        district=district,
        commodity=commodity,
        arrival_date=arrival_date,
        limit=limit,
        offset=offset,
        format_type="json"
    )

    try:
        logger.info(
            f"Fetching market data: offset={offset}, limit={limit}, "
            f"commodity={commodity or 'ALL'}, state={state or 'ALL'}"
        )
        response = requests.get(
            api_url,
            params=params,
            timeout=timeout,
            headers={"User-Agent": "AgriPredictAI-Client/1.0", "Accept": "application/json"}
        )

        response.raise_for_status()

        try:
            json_data = response.json()
        except ValueError as json_err:
            sanitized_err = sanitize_message(str(json_err), api_key)
            logger.error(f"Invalid JSON received from market API: {sanitized_err}")
            return {
                "status": "error",
                "data_source": "error",
                "records": [],
                "total": 0,
                "offset": offset,
                "limit": limit,
                "last_updated": current_time,
                "message": "Invalid JSON response from external Government Mandi API."
            }

        records, total_count = extract_records_from_response(json_data)
        logger.info(f"Successfully received {len(records)} records (Total available: {total_count})")

        return {
            "status": "success",
            "data_source": "live_api",
            "records": records,
            "total": total_count,
            "offset": offset,
            "limit": limit,
            "last_updated": current_time,
            "message": "Live market data successfully fetched from external API."
        }

    except requests.exceptions.Timeout as t_err:
        sanitized_err = sanitize_message(str(t_err), api_key)
        logger.warning(f"Government Mandi API timed out after {timeout}s: {sanitized_err}")
        return {
            "status": "error",
            "data_source": "error",
            "records": [],
            "total": 0,
            "offset": offset,
            "limit": limit,
            "last_updated": current_time,
            "message": f"External Government API request timed out after {timeout} seconds."
        }

    except requests.exceptions.HTTPError as h_err:
        sanitized_err = sanitize_message(str(h_err), api_key)
        status_code = getattr(h_err.response, "status_code", "Unknown")
        logger.error(f"Government Mandi API HTTP Error {status_code}: {sanitized_err}")
        return {
            "status": "error",
            "data_source": "error",
            "records": [],
            "total": 0,
            "offset": offset,
            "limit": limit,
            "last_updated": current_time,
            "message": f"External API returned HTTP Error status code {status_code}."
        }

    except requests.exceptions.RequestException as req_err:
        sanitized_err = sanitize_message(str(req_err), api_key)
        logger.error(f"Network error while connecting to Government Mandi API: {sanitized_err}")
        return {
            "status": "error",
            "data_source": "error",
            "records": [],
            "total": 0,
            "offset": offset,
            "limit": limit,
            "last_updated": current_time,
            "message": "Network connection error while reaching Government Mandi API."
        }
    except Exception as gen_err:
        sanitized_err = sanitize_message(str(gen_err), api_key)
        logger.error(f"Unexpected error while fetching market data: {sanitized_err}")
        return {
            "status": "error",
            "data_source": "error",
            "records": [],
            "total": 0,
            "offset": offset,
            "limit": limit,
            "last_updated": current_time,
            "message": "Unexpected error while reaching Government Mandi API."
        }


def fetch_all_market_data(
    state: Optional[str] = None,
    district: Optional[str] = None,
    commodity: Optional[str] = None,
    arrival_date: Optional[str] = None,
    limit: int = 100,
    max_pages: int = 20,
    max_records: int = 5000,
    timeout: float = 10.0,
    retry_attempts: int = 2
) -> Dict[str, Any]:
    """
    Phase B: Automatically paginate through the Government API records.
    Features:
    - Page offset progression (offset += limit)
    - Safety guards: max_pages limit, max_records limit to avoid infinite loops
    - Retry mechanism for transient network errors
    """
    all_records: List[Dict[str, Any]] = []
    current_offset = 0
    page_count = 0
    total_available = 0
    consecutive_failures = 0
    current_time = datetime.now(timezone.utc).isoformat()

    api_url, api_key = get_api_config()
    if not api_url or not api_key:
        return {
            "status": "unconfigured",
            "data_source": "unconfigured",
            "records": [],
            "total_fetched": 0,
            "pages_fetched": 0,
            "last_updated": current_time,
            "message": "Market API URL or API Key is not configured."
        }

    logger.info(f"Starting paginated fetch: max_pages={max_pages}, max_records={max_records}, limit={limit}")

    while page_count < max_pages and len(all_records) < max_records:
        page_count += 1
        page_success = False

        for attempt in range(1, retry_attempts + 1):
            page_data = fetch_market_data(
                state=state,
                district=district,
                commodity=commodity,
                arrival_date=arrival_date,
                limit=limit,
                offset=current_offset,
                timeout=timeout
            )

            if page_data["status"] == "success":
                records = page_data["records"]
                total_available = page_data["total"]
                all_records.extend(records)
                consecutive_failures = 0
                page_success = True

                # If returned records is 0 or fewer than limit, or we reached total, stop pagination
                if len(records) == 0 or len(records) < limit or (total_available > 0 and len(all_records) >= total_available):
                    logger.info(f"Pagination completed: Reached end of records ({len(all_records)} records total).")
                    return {
                        "status": "success",
                        "data_source": "live_api",
                        "records": all_records,
                        "total_fetched": len(all_records),
                        "total_available": total_available,
                        "pages_fetched": page_count,
                        "last_updated": datetime.now(timezone.utc).isoformat(),
                        "message": f"Successfully fetched {len(all_records)} records across {page_count} pages."
                    }

                current_offset += limit
                break
            else:
                logger.warning(
                    f"Page {page_count} attempt {attempt}/{retry_attempts} failed: {page_data.get('message')}"
                )
                if attempt < retry_attempts:
                    time.sleep(1.0)  # brief backoff before retry

        if not page_success:
            consecutive_failures += 1
            if consecutive_failures >= 2:
                logger.error(f"Stopping pagination after {consecutive_failures} consecutive page failures.")
                break

    return {
        "status": "success" if len(all_records) > 0 else "error",
        "data_source": "live_api" if len(all_records) > 0 else "error",
        "records": all_records,
        "total_fetched": len(all_records),
        "total_available": total_available,
        "pages_fetched": page_count,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "message": f"Fetched {len(all_records)} records across {page_count} pages."
    }
