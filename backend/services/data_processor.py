# AgriPredict AI - Agricultural Market Data Processor
"""
Phase C: Data Normalization, Cleaning, and Historical Dataset Management.
Converts raw API response records into clean pandas DataFrames, normalizes dates and
numeric price fields, deduplicates, and manages local persistent CSV storage in backend/data/market_history.csv.
"""

import os
import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone

import pandas as pd
import numpy as np

logger = logging.getLogger("data_processor")

# Path setup for local dataset persistence
_services_dir = os.path.dirname(os.path.abspath(__file__))
_backend_dir = os.path.abspath(os.path.join(_services_dir, ".."))
DATA_DIR = os.path.join(_backend_dir, "data")
HISTORY_CSV_PATH = os.path.join(DATA_DIR, "market_history.csv")

# Standardized columns schema
REQUIRED_COLUMNS = [
    "State",
    "District",
    "Market",
    "Commodity",
    "Variety",
    "Grade",
    "Arrival_Date",
    "Min_Price",
    "Max_Price",
    "Modal_Price"
]

# Field mapping dictionary to handle various case conventions from government APIs
FIELD_NAME_MAPPINGS = {
    "state": "State",
    "state_name": "State",
    "district": "District",
    "district_name": "District",
    "market": "Market",
    "market_name": "Market",
    "mandi": "Market",
    "apmc": "Market",
    "commodity": "Commodity",
    "commodity_name": "Commodity",
    "crop": "Commodity",
    "variety": "Variety",
    "variety_name": "Variety",
    "grade": "Grade",
    "arrival_date": "Arrival_Date",
    "date": "Arrival_Date",
    "arrivaldate": "Arrival_Date",
    "min_price": "Min_Price",
    "minimum_price": "Min_Price",
    "minprice": "Min_Price",
    "max_price": "Max_Price",
    "maximum_price": "Max_Price",
    "maxprice": "Max_Price",
    "modal_price": "Modal_Price",
    "modalprice": "Modal_Price",
    "price": "Modal_Price"
}


def ensure_data_directory() -> str:
    """Ensure that the backend/data directory exists."""
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)
    return DATA_DIR


def clean_price_value(val: Any) -> Optional[float]:
    """
    Safely convert strings or numbers (e.g., '2,900', '₹ 3200.50', 2900) into clean float.
    Returns None for invalid, non-positive, or missing prices.
    """
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val) if val > 0 else None

    str_val = str(val).strip()
    # Check for negative numbers
    if str_val.startswith("-") or "-" in str_val:
        return None

    # Strip currency symbols, commas, whitespace
    cleaned = re.sub(r'[^\d.]', '', str_val)
    if not cleaned:
        return None
    try:
        f = float(cleaned)
        return f if f > 0 else None
    except ValueError:
        return None


def parse_arrival_date(val: Any) -> Optional[datetime]:
    """
    Parse multiple date formats into standard datetime.
    Supports formats: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD/MM/YY, YYYY/MM/DD, etc.
    """
    if pd.isna(val) or val is None:
        return None
    if isinstance(val, (datetime, pd.Timestamp)):
        return val.to_pydatetime() if isinstance(val, pd.Timestamp) else val

    str_val = str(val).strip()
    if not str_val:
        return None

    date_formats = [
        "%d/%m/%Y",
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%y",
        "%Y/%m/%d",
        "%d-%b-%Y",
        "%d-%B-%Y",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S"
    ]

    for fmt in date_formats:
        try:
            return datetime.strptime(str_val, fmt)
        except ValueError:
            continue

    # Fallback to pandas automatic date parser
    try:
        dt = pd.to_datetime(str_val, errors='coerce')
        if not pd.isna(dt):
            return dt.to_pydatetime()
    except Exception:
        pass

    return None


def normalize_market_records(raw_records: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Convert raw API records into a clean, normalized pandas DataFrame.
    """
    if not raw_records:
        return pd.DataFrame(columns=REQUIRED_COLUMNS)

    # 1. Create initial DataFrame from separate copy of raw records
    df = pd.DataFrame(list(raw_records))

    # 2. Rename columns based on mapping dictionary
    rename_dict = {}
    for col in df.columns:
        normalized_col_name = str(col).strip().lower().replace(" ", "_").replace("-", "_")
        if normalized_col_name in FIELD_NAME_MAPPINGS:
            rename_dict[col] = FIELD_NAME_MAPPINGS[normalized_col_name]
        else:
            # Check if title case matches standard columns
            for req in REQUIRED_COLUMNS:
                if normalized_col_name == req.lower():
                    rename_dict[col] = req
                    break

    df = df.rename(columns=rename_dict)

    # 3. Ensure all required columns exist
    for req_col in REQUIRED_COLUMNS:
        if req_col not in df.columns:
            df[req_col] = None

    # Keep only required columns
    df = df[REQUIRED_COLUMNS].copy()

    # 4. Clean text fields (Title case & strip whitespace)
    text_columns = ["State", "District", "Market", "Commodity", "Variety", "Grade"]
    for col in text_columns:
        df[col] = df[col].astype(str).str.strip()
        # Replace 'None', 'nan', 'null' with empty/default
        df[col] = df[col].replace(["None", "nan", "NULL", "null", "<NA>", "NoneType"], "")
        df[col] = df[col].apply(lambda x: str(x).title() if (x and str(x).lower() not in ("nan", "none", "")) else "Standard")

    # Set Grade default if blank
    df["Grade"] = df["Grade"].replace(["", "Standard"], "FAQ")
    df["Variety"] = df["Variety"].replace(["", "Standard"], "Other")

    # 5. Clean and parse Arrival_Date
    df["Arrival_Date_Parsed"] = df["Arrival_Date"].apply(parse_arrival_date)
    # Drop records where Arrival_Date cannot be parsed
    df = df.dropna(subset=["Arrival_Date_Parsed"]).copy()

    if df.empty:
        return pd.DataFrame(columns=REQUIRED_COLUMNS)

    # Format standard ISO date string (YYYY-MM-DD)
    df["Arrival_Date"] = df["Arrival_Date_Parsed"].dt.strftime("%Y-%m-%d")

    # 6. Clean and convert price columns to numeric
    for price_col in ["Min_Price", "Max_Price", "Modal_Price"]:
        df[price_col] = df[price_col].apply(clean_price_value)

    # If Modal_Price is missing but Min/Max exists, take average
    missing_modal = df["Modal_Price"].isna()
    df.loc[missing_modal & df["Min_Price"].notna() & df["Max_Price"].notna(), "Modal_Price"] = (
        df.loc[missing_modal, "Min_Price"] + df.loc[missing_modal, "Max_Price"]
    ) / 2.0

    # If Min_Price is missing, fill from Modal_Price
    df["Min_Price"] = df["Min_Price"].fillna(df["Modal_Price"])
    # If Max_Price is missing, fill from Modal_Price
    df["Max_Price"] = df["Max_Price"].fillna(df["Modal_Price"])

    # Drop records where all price columns are missing or <= 0
    df = df.dropna(subset=["Modal_Price"]).copy()
    df = df[df["Modal_Price"] > 0].copy()

    # Remove rows where Commodity or Market is empty
    df = df[(df["Commodity"] != "") & (df["Market"] != "")].copy()

    if df.empty:
        return pd.DataFrame(columns=REQUIRED_COLUMNS)

    # 7. Sort records by Commodity, Market, Arrival_Date_Parsed
    df = df.sort_values(by=["Commodity", "Market", "Arrival_Date_Parsed"], ascending=[True, True, True])

    # 8. Remove duplicates
    dedup_subset = ["State", "District", "Market", "Commodity", "Variety", "Arrival_Date"]
    df = df.drop_duplicates(subset=dedup_subset, keep="last")

    # Drop temporary parsing column and return
    df = df[REQUIRED_COLUMNS].reset_index(drop=True)
    return df


def load_market_history(
    state: Optional[str] = None,
    district: Optional[str] = None,
    commodity: Optional[str] = None,
    arrival_date: Optional[str] = None,
    limit: Optional[int] = None
) -> pd.DataFrame:
    """
    Load stored market history from backend/data/market_history.csv with optional filters.
    """
    if not os.path.exists(HISTORY_CSV_PATH):
        return pd.DataFrame(columns=REQUIRED_COLUMNS)

    try:
        df = pd.read_csv(HISTORY_CSV_PATH)
        if df.empty:
            return df

        # Apply filters if provided
        if state and state.strip():
            df = df[df["State"].astype(str).str.lower() == state.strip().lower()]

        if district and district.strip():
            df = df[df["District"].astype(str).str.lower() == district.strip().lower()]

        if commodity and commodity.strip():
            com_query = commodity.strip().lower()
            df = df[df["Commodity"].astype(str).str.lower().str.contains(com_query)]

        if arrival_date and arrival_date.strip():
            parsed_query_date = parse_arrival_date(arrival_date)
            if parsed_query_date:
                iso_query = parsed_query_date.strftime("%Y-%m-%d")
                df = df[df["Arrival_Date"] == iso_query]

        if limit and limit > 0:
            df = df.head(limit)

        return df.reset_index(drop=True)
    except Exception as e:
        logger.error(f"Error loading historical market dataset from {HISTORY_CSV_PATH}: {e}")
        return pd.DataFrame(columns=REQUIRED_COLUMNS)


def update_market_history(raw_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Normalize raw records and merge/append into backend/data/market_history.csv
    without duplicating existing entries.
    """
    ensure_data_directory()

    if not raw_records:
        current_df = load_market_history()
        return {
            "status": "no_records",
            "records_fetched": 0,
            "records_added": 0,
            "duplicates_skipped": 0,
            "total_records": len(current_df),
            "date_range": "N/A",
            "message": "No new records provided to update."
        }

    # Normalize incoming raw records
    new_df = normalize_market_records(raw_records)
    records_fetched = len(raw_records)
    records_valid = len(new_df)

    if records_valid == 0:
        current_df = load_market_history()
        return {
            "status": "no_valid_records",
            "records_fetched": records_fetched,
            "records_added": 0,
            "duplicates_skipped": 0,
            "total_records": len(current_df),
            "date_range": "N/A",
            "message": "No valid records after data cleaning and normalization."
        }

    # Load existing CSV dataset if present
    if os.path.exists(HISTORY_CSV_PATH):
        try:
            existing_df = pd.read_csv(HISTORY_CSV_PATH)
        except Exception as e:
            logger.warning(f"Could not read existing history CSV, recreating: {e}")
            existing_df = pd.DataFrame(columns=REQUIRED_COLUMNS)
    else:
        existing_df = pd.DataFrame(columns=REQUIRED_COLUMNS)

    initial_count = len(existing_df)

    # Combine existing + new records
    combined_df = pd.concat([existing_df, new_df], ignore_index=True)

    # Deduplicate based on unique mandi observation identity
    dedup_subset = ["State", "District", "Market", "Commodity", "Variety", "Arrival_Date"]
    combined_df = combined_df.drop_duplicates(subset=dedup_subset, keep="last")

    # Sort
    combined_df = combined_df.sort_values(
        by=["Commodity", "Market", "Arrival_Date"],
        ascending=[True, True, True]
    ).reset_index(drop=True)

    # Save to CSV
    combined_df.to_csv(HISTORY_CSV_PATH, index=False)

    final_count = len(combined_df)
    records_added = final_count - initial_count
    duplicates_skipped = records_valid - records_added

    # Calculate date range
    min_date = combined_df["Arrival_Date"].min() if not combined_df.empty else "N/A"
    max_date = combined_df["Arrival_Date"].max() if not combined_df.empty else "N/A"
    date_range = f"{min_date} to {max_date}" if min_date != "N/A" else "N/A"

    logger.info(
        f"Historical CSV updated: {records_added} new records added, "
        f"{duplicates_skipped} duplicates skipped, Total: {final_count} records."
    )

    return {
        "status": "success",
        "records_fetched": records_fetched,
        "records_added": records_added,
        "duplicates_skipped": max(0, duplicates_skipped),
        "total_records": final_count,
        "date_range": date_range,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "message": f"Successfully updated market history. Added {records_added} new records."
    }
