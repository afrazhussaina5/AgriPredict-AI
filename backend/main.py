# AgriPredict AI - Python FastAPI Backend Server
"""
FastAPI Server for AgriPredict AI
Smart Market Intelligence & Price Discovery Platform (SIH 26132)
Integrates real Government Mandi API client, dynamic commodity discovery,
historical dataset management, transparent prototype buyer scoring, and fallback mechanisms.
"""

import os
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel

from .mock_data import COMMODITIES_PY, MANDIS_PY, BUYERS_PY
from .services.market_api import fetch_market_data, fetch_all_market_data, get_api_config
from .services.data_processor import (
    normalize_market_records,
    load_market_history,
    update_market_history,
    HISTORY_CSV_PATH
)

app = FastAPI(
    title="AgriPredict AI API",
    description="Backend service providing live Government Mandi price data integration, historical dataset management, dynamic commodity directory, and market intelligence for farmers (SIH 26132).",
    version="1.2.0"
)

# Enable CORS for local and cross-origin frontend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, "static")

# Request Models
class AnalyzeRequest(BaseModel):
    commodityId: str = "onion"
    quantity: float = 50.0
    grade: str = "A"
    state: Optional[str] = "Andhra Pradesh"
    district: Optional[str] = "Kurnool"
    preferredMarket: Optional[str] = "Kurnool Agricultural Market Yard"
    location: Optional[str] = "Kurnool, Andhra Pradesh"
    hasStorage: bool = True

class SimulateRequest(BaseModel):
    commodityId: str = "onion"
    quantity: float = 50.0
    grade: str = "A"
    storageDays: int = 5
    transportRateMultiplier: float = 1.0
    storageRateMultiplier: float = 1.0

class UpdateHistoryRequest(BaseModel):
    state: Optional[str] = None
    district: Optional[str] = None
    commodity: Optional[str] = None
    arrival_date: Optional[str] = None
    limit: int = 100
    max_pages: int = 10

class LotMember(BaseModel):
    name: str = "Member"
    quantity: float = 0.0

class LotCreateRequest(BaseModel):
    commodityId: str = "onion"
    commodityName: Optional[str] = "Onion"
    quantity: float = 50.0
    unit: str = "Quintal (100 kg)"
    qualityGrade: str = "A"
    location: str = "Kurnool, Andhra Pradesh"
    expectedMinimumPrice: float = 3000.0
    availableUntil: Optional[str] = None
    sellerType: str = "Individual Farmer"  # "Individual Farmer" or "FPO / Producer Group"
    fpoName: Optional[str] = None
    fpoMembers: Optional[List[LotMember]] = None
    notes: Optional[str] = None

class LotInterestRequest(BaseModel):
    buyerId: str
    buyerName: Optional[str] = None
    contactName: Optional[str] = "Farmer / FPO Lead"
    contactPhone: Optional[str] = "+91 98765 43210"
    offeredPrice: Optional[float] = None
    message: Optional[str] = "Interested in supplying produce according to verified lot specifications."


# ============================================================================
# In-Memory Prototype Lot Storage
# ============================================================================
LOTS_STORE: Dict[str, Any] = {}
LOT_COUNTER = 1001

# Seed an initial demo lot so buyer matching is immediately testable
INITIAL_DEMO_LOT_ID = "AGRI-2026-1001"
LOTS_STORE[INITIAL_DEMO_LOT_ID] = {
    "lotId": INITIAL_DEMO_LOT_ID,
    "commodityId": "onion",
    "commodityName": "Onion (Nashik Red / Kurnool)",
    "quantity": 50.0,
    "unit": "Quintal (100 kg)",
    "qualityGrade": "A",
    "location": "Kurnool, Andhra Pradesh",
    "expectedMinimumPrice": 3000.0,
    "availableUntil": (datetime.now(timezone.utc)).strftime("%Y-%m-%d"),
    "sellerType": "Individual Farmer",
    "fpoName": None,
    "fpoMembers": [],
    "status": "OPEN",
    "createdAt": datetime.now(timezone.utc).isoformat(),
    "interests": {}
}


# ============================================================================
# Core Health & Metadata Endpoints
# ============================================================================

@app.get("/api/health")
def health_check():
    api_url, api_key = get_api_config()
    is_api_configured = bool(api_url and api_key)
    has_cached_history = os.path.exists(HISTORY_CSV_PATH)

    return {
        "status": "healthy",
        "service": "AgriPredict AI Engine",
        "sihStatement": "26132 - Market Linkages & Price Discovery",
        "version": "1.2.0",
        "external_api_configured": is_api_configured,
        "historical_cache_available": has_cached_history,
        "total_commodities": len(get_all_dynamic_commodities()),
        "last_checked": datetime.now(timezone.utc).isoformat()
    }


def get_all_dynamic_commodities() -> List[Dict[str, Any]]:
    """
    Dynamically discover commodities from:
    1. Cached historical market CSV data (if present)
    2. Master agricultural catalog (COMMODITIES_PY)
    """
    discovered_dict = {c["id"]: dict(c) for c in COMMODITIES_PY}

    # Check local historical CSV
    try:
        cached_df = load_market_history(limit=500)
        if not cached_df.empty and "Commodity" in cached_df.columns:
            unique_crops = cached_df["Commodity"].dropna().unique()
            for crop_raw in unique_crops:
                crop_name = str(crop_raw).strip()
                crop_id = crop_name.lower().replace(" ", "_").replace("-", "_")
                if crop_id not in discovered_dict and len(crop_id) > 1:
                    # Calculate mean modal price from cached data
                    crop_df = cached_df[cached_df["Commodity"] == crop_raw]
                    mean_price = round(float(crop_df["Modal_Price"].mean())) if not crop_df.empty else 2500
                    discovered_dict[crop_id] = {
                        "id": crop_id,
                        "name": f"{crop_name} (Mandi Harvest)",
                        "variety": "Standard Mandi Grade",
                        "category": "Agricultural Produce",
                        "icon": "🌾",
                        "basePrice": mean_price,
                        "predictedPrice": round(mean_price * 1.05),
                        "priceChangePct": 5.0,
                        "trend": "up",
                        "unit": "Quintal (100 kg)",
                        "defaultQty": 50,
                        "shelfLifeDays": 30,
                        "storageCostPerDayPerQtl": 3.0,
                        "baseTransportRatePerKmPerQtl": 1.8,
                        "hasMLModel": False,
                        "forecastType": "Estimated Demo Forecast",
                        "forecastStatus": "Live market data available; ML model in training",
                        "dataSource": "Cached Historical CSV",
                        "gradeMultipliers": {"A": 1.05, "B": 1.0, "C": 0.90},
                        "historical30d": [round(mean_price * 0.96), round(mean_price * 0.98), mean_price],
                        "predicted7d": [
                            {"day": "Day 1", "price": round(mean_price * 1.01), "lower": round(mean_price * 0.98), "upper": round(mean_price * 1.04)},
                            {"day": "Day 5 (Optimal)", "price": round(mean_price * 1.05), "lower": round(mean_price * 1.01), "upper": round(mean_price * 1.09)}
                        ],
                        "recommendation": {
                            "action": "SELL AT BEST APMC MANDI",
                            "type": "SELL_BEST_MARKET",
                            "headline": f"Direct Mandi Delivery for {crop_name}",
                            "optimalDays": 0,
                            "expectedGain": 5000,
                            "confidence": 85,
                            "explanation": f"Delivering {crop_name} to the highest-paying regional APMC mandi offers optimum net realization.",
                            "factors": []
                        }
                    }
    except Exception:
        pass

    return list(discovered_dict.values())


# ============================================================================
# Dynamic Commodity & Market Discovery Endpoints
# ============================================================================

@app.get("/api/commodities")
def get_commodities():
    """
    Returns the dynamic list of all supported commodities with category,
    price indicators, and ML forecasting capability status.
    """
    return get_all_dynamic_commodities()


@app.get("/api/mandis")
def get_mandis():
    return MANDIS_PY


@app.get("/api/buyers")
def get_buyers(commodity: Optional[str] = None):
    """
    Returns prototype buyer matching data with transparent score breakdown and disclaimers.
    """
    buyers_list = []
    target_crop = (commodity or "").lower()

    for b in BUYERS_PY:
        if target_crop and target_crop != "all":
            # Match if crop in buyer's supported commodities list or buyer accepts all
            if not any(target_crop in c.lower() or c.lower() in target_crop for c in b["commodities"]):
                continue

        buyers_list.append({
            **b,
            "isPrototype": True,
            "prototypeDisclaimer": "Prototype Buyer Matching Data for demonstration and evaluation only. Not a live exchange contract."
        })

    return buyers_list if buyers_list else BUYERS_PY


# ============================================================================
# Live Government Mandi API Endpoints
# ============================================================================

@app.get("/api/live-market-data")
def get_live_market_data(
    state: Optional[str] = Query(None, description="Filter by State name"),
    district: Optional[str] = Query(None, description="Filter by District name"),
    commodity: Optional[str] = Query(None, description="Filter by Commodity"),
    arrival_date: Optional[str] = Query(None, description="Filter by Arrival Date"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to fetch"),
    offset: int = Query(0, ge=0, description="Offset for pagination")
):
    current_time = datetime.now(timezone.utc).isoformat()

    # 1. Live Government API
    live_res = fetch_market_data(
        state=state,
        district=district,
        commodity=commodity,
        arrival_date=arrival_date,
        limit=limit,
        offset=offset
    )

    if live_res["status"] == "success" and live_res["records"]:
        df_clean = normalize_market_records(live_res["records"])
        records_list = df_clean.to_dict(orient="records")
        return {
            "status": "success",
            "data_source": "live_api",
            "total_records": len(records_list),
            "total_available": live_res.get("total", len(records_list)),
            "offset": offset,
            "limit": limit,
            "last_updated": live_res.get("last_updated", current_time),
            "records": records_list,
            "message": "Live market data successfully fetched from external Government API."
        }

    # 2. Cached Historical CSV
    cached_df = load_market_history(
        state=state,
        district=district,
        commodity=commodity,
        arrival_date=arrival_date,
        limit=limit
    )

    if not cached_df.empty:
        cached_records = cached_df.to_dict(orient="records")
        return {
            "status": "success",
            "data_source": "cached_data",
            "total_records": len(cached_records),
            "total_available": len(cached_records),
            "offset": offset,
            "limit": limit,
            "last_updated": current_time,
            "records": cached_records,
            "message": "Returned from local persistent market history dataset."
        }

    # 3. Structured Fallback
    mock_records = []
    target_crop = commodity.lower() if commodity else "all"
    all_commodities = get_all_dynamic_commodities()

    for com in all_commodities:
        if target_crop != "all" and target_crop not in com["name"].lower() and target_crop not in com["id"]:
            continue
        for mandi in MANDIS_PY:
            if state and state.lower() not in mandi["state"].lower():
                continue
            if district and district.lower() not in mandi["district"].lower():
                continue

            spot_rate = round(com["basePrice"] * mandi["priceOffsetMultiplier"])
            mock_records.append({
                "State": mandi["state"],
                "District": mandi["district"],
                "Market": mandi["name"],
                "Commodity": com["name"].split()[0],
                "Variety": com["variety"],
                "Grade": "FAQ",
                "Arrival_Date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "Min_Price": round(spot_rate * 0.95),
                "Max_Price": round(spot_rate * 1.05),
                "Modal_Price": spot_rate
            })

    return {
        "status": "success",
        "data_source": "mock_fallback",
        "total_records": len(mock_records),
        "total_available": len(mock_records),
        "offset": offset,
        "limit": limit,
        "last_updated": current_time,
        "records": mock_records,
        "message": "Fallback prototype dataset (External API not configured or offline)."
    }


@app.post("/api/update-market-history")
def update_market_history_endpoint(payload: Optional[UpdateHistoryRequest] = None):
    p = payload or UpdateHistoryRequest()
    api_url, api_key = get_api_config()
    current_time = datetime.now(timezone.utc).isoformat()

    if not api_url or not api_key:
        return {
            "status": "unconfigured",
            "data_source": "unconfigured",
            "records_fetched": 0,
            "records_added": 0,
            "duplicates_skipped": 0,
            "total_records": len(load_market_history()),
            "date_range": "N/A",
            "last_updated": current_time,
            "message": "Government Mandi API URL or Key is not configured in .env."
        }

    fetch_result = fetch_all_market_data(
        state=p.state,
        district=p.district,
        commodity=p.commodity,
        arrival_date=p.arrival_date,
        limit=p.limit,
        max_pages=p.max_pages
    )

    if fetch_result["status"] != "success" or not fetch_result["records"]:
        return {
            "status": "error",
            "data_source": "live_api",
            "records_fetched": 0,
            "records_added": 0,
            "duplicates_skipped": 0,
            "total_records": len(load_market_history()),
            "date_range": "N/A",
            "last_updated": current_time,
            "message": fetch_result.get("message", "Failed to fetch records from Government Mandi API.")
        }

    update_res = update_market_history(fetch_result["records"])
    update_res["data_source"] = "live_api"
    return update_res


# ============================================================================
# Produce Lot Creation & Buyer Matching Engine (SIH 26132)
# ============================================================================

def calculate_buyer_matches_for_lot(lot: Dict[str, Any]) -> List[Dict[str, Any]]:
    cid = str(lot.get("commodityId", "onion")).lower()
    cname = str(lot.get("commodityName", "")).lower()
    qty = max(1.0, float(lot.get("quantity", 50.0)))
    grade = str(lot.get("qualityGrade", "A")).upper()
    loc = str(lot.get("location", "")).lower()
    min_price = float(lot.get("expectedMinimumPrice", 2500.0))

    matches = []
    for b in BUYERS_PY:
        # 1. Commodity Match (40 pts)
        is_matched_crop = any(cid in c or c in cid or c in cname for c in b["commodities"])
        comm_score = 40 if is_matched_crop else 0

        # 2. Quantity Compatibility (25 pts)
        min_q = b.get("minQuantityQtl", 10)
        max_q = b.get("maxQuantityQtl", 1000)
        if qty >= min_q and qty <= max_q:
            qty_score = 25
            qty_reason = f"Your lot of {qty} Qtl fits their procurement batch ({min_q}–{max_q} Qtl)"
        elif qty < min_q:
            qty_score = max(5, round((qty / min_q) * 20))
            qty_reason = f"Lot ({qty} Qtl) is below minimum batch ({min_q} Qtl), partial pickup possible"
        else:
            qty_score = 22
            qty_reason = f"Lot ({qty} Qtl) exceeds single batch ({max_q} Qtl), split procurement available"

        # 3. Quality Grade Compatibility (20 pts)
        accepted_grades = b.get("acceptedGrades", ["A", "B", "C"])
        if grade in accepted_grades:
            if grade == "A":
                grade_score = 20
                grade_reason = "Grade A premium export/retail quality accepted"
            elif grade == "B":
                grade_score = 17
                grade_reason = "Grade B standard commercial grade accepted"
            else:
                grade_score = 14
                grade_reason = "Grade C fair average quality accepted"
        else:
            grade_score = 6
            grade_reason = f"Grade {grade} is outside primary requirements"

        # 4. Location / Distance Compatibility (15 pts)
        b_dist = b.get("distanceKm", 25)
        if "nashik" in loc and "nashik" in b.get("location", "").lower():
            b_dist = 14
        elif "kurnool" in loc and "kurnool" in b.get("location", "").lower():
            b_dist = 12
        elif "guntur" in loc and "guntur" in b.get("location", "").lower():
            b_dist = 15

        if b_dist <= 25:
            loc_score = 15
            loc_reason = f"Hyper-local ({b_dist} km)"
        elif b_dist <= 75:
            loc_score = 13
            loc_reason = f"Regional hub ({b_dist} km)"
        elif b_dist <= 200:
            loc_score = 10
            loc_reason = f"Inter-district transport ({b_dist} km)"
        else:
            loc_score = 7
            loc_reason = f"Long haul freight ({b_dist} km)"

        total_score = min(100, max(10, comm_score + qty_score + grade_score + loc_score))

        # Dynamic Offer Calculation based on expected price or base multiplier
        base_offer = round(min_price * b.get("baseOfferMultiplier", 1.05))
        b_transport = round(b_dist * 1.8 * qty)
        b_gross = base_offer * qty
        b_net = b_gross - b_transport

        crop_snippet = (lot.get("commodityName") or cid).split()[0]
        crop_desc = f"accepts {crop_snippet}" if is_matched_crop else "does not directly procure this crop"
        match_explanation = f"Strong match: Buyer {crop_desc} ({comm_score}/40 pts), {qty_reason.lower()} ({qty_score}/25 pts), {grade_reason.lower()} ({grade_score}/20 pts), and {loc_reason.lower()} ({loc_score}/15 pts)."

        interests = lot.get("interests", {})
        interest_sent = b["id"] in interests

        matches.append({
            **b,
            "offerPricePerQtl": base_offer,
            "grossContractValue": b_gross,
            "transportCostTotal": b_transport,
            "netReturn": b_net,
            "matchScore": total_score,
            "matchExplanation": match_explanation,
            "interestSent": interest_sent,
            "interestDetails": interests.get(b["id"]),
            "scoreBreakdown": {
                "commodityScore": comm_score,
                "commodityMax": 40,
                "quantityScore": qty_score,
                "quantityMax": 25,
                "gradeScore": grade_score,
                "gradeMax": 20,
                "locationScore": loc_score,
                "locationMax": 15,
                "total": total_score,
                "max": 100
            },
            "isPrototype": True,
            "prototypeDisclaimer": "Demo Buyer Profile — Hackathon Prototype. Data provided for algorithmic evaluation."
        })

    matches.sort(key=lambda x: x["matchScore"], reverse=True)
    return matches


@app.post("/api/lots")
def create_produce_lot(payload: LotCreateRequest):
    global LOT_COUNTER
    lot_id = f"AGRI-2026-{LOT_COUNTER}"
    LOT_COUNTER += 1

    # Calculate aggregated quantity if FPO
    qty = payload.quantity
    if payload.sellerType == "FPO / Producer Group" and payload.fpoMembers and len(payload.fpoMembers) > 0:
        member_total = sum(m.quantity for m in payload.fpoMembers if m.quantity > 0)
        if member_total > 0:
            qty = member_total

    lot = {
        "lotId": lot_id,
        "commodityId": payload.commodityId,
        "commodityName": payload.commodityName or payload.commodityId.capitalize(),
        "quantity": qty,
        "unit": payload.unit,
        "qualityGrade": payload.qualityGrade,
        "location": payload.location,
        "expectedMinimumPrice": payload.expectedMinimumPrice,
        "availableUntil": payload.availableUntil or (datetime.now(timezone.utc)).strftime("%Y-%m-%d"),
        "sellerType": payload.sellerType,
        "fpoName": payload.fpoName,
        "fpoMembers": [m.model_dump() for m in payload.fpoMembers] if payload.fpoMembers else [],
        "notes": payload.notes,
        "status": "OPEN",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "interests": {}
    }
    LOTS_STORE[lot_id] = lot
    return {
        "status": "success",
        "message": "Produce lot created successfully",
        "lot": lot
    }


@app.get("/api/lots")
def list_produce_lots():
    return {
        "status": "success",
        "total": len(LOTS_STORE),
        "lots": list(LOTS_STORE.values())
    }


@app.get("/api/lots/{lot_id}")
def get_produce_lot(lot_id: str):
    if lot_id not in LOTS_STORE:
        raise HTTPException(status_code=404, detail="Produce lot not found")
    return {
        "status": "success",
        "lot": LOTS_STORE[lot_id]
    }


@app.get("/api/lots/{lot_id}/buyers")
def get_matched_buyers(lot_id: str):
    lot = LOTS_STORE.get(lot_id)
    if not lot:
        lot = LOTS_STORE.get(INITIAL_DEMO_LOT_ID)
    buyers = calculate_buyer_matches_for_lot(lot)
    return {
        "status": "success",
        "lot": lot,
        "total_matches": len(buyers),
        "buyers": buyers
    }


@app.post("/api/lots/{lot_id}/interest")
def send_buyer_interest(lot_id: str, payload: LotInterestRequest):
    lot = LOTS_STORE.get(lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Produce lot not found")
    
    interest_record = {
        "buyerId": payload.buyerId,
        "buyerName": payload.buyerName or payload.buyerId,
        "contactName": payload.contactName,
        "contactPhone": payload.contactPhone,
        "offeredPrice": payload.offeredPrice or lot.get("expectedMinimumPrice"),
        "message": payload.message,
        "sentAt": datetime.now(timezone.utc).isoformat(),
        "status": "INTEREST SENT",
        "timeline": [
            {"step": "LOT CREATED", "completed": True, "time": lot.get("createdAt")},
            {"step": "BUYER MATCHED", "completed": True, "time": datetime.now(timezone.utc).isoformat()},
            {"step": "INTEREST SENT", "completed": True, "time": datetime.now(timezone.utc).isoformat()},
            {"step": "BUYER RESPONSE", "completed": False, "status": "Pending (Est. within 4 hours)"}
        ]
    }
    lot["interests"][payload.buyerId] = interest_record
    return {
        "status": "success",
        "message": "Interest sent successfully to buyer",
        "interest": interest_record,
        "lotId": lot_id
    }


# ============================================================================
# Main Produce Analysis & Market Intelligence Engine
# ============================================================================

@app.post("/api/analyze")
def analyze_produce(payload: AnalyzeRequest):
    """
    Main market intelligence engine.
    Computes spot prices, logistics deductions, net returns, selling recommendations,
    mandi rankings, and prototype buyer match scores based on real inputs.
    """
    all_commodities = get_all_dynamic_commodities()
    commodity = next(
        (c for c in all_commodities if c["id"] == payload.commodityId or payload.commodityId in c["id"] or c["id"] in payload.commodityId),
        all_commodities[0]
    )

    grade_multiplier = commodity["gradeMultipliers"].get(payload.grade, 1.0)
    qty = max(1.0, payload.quantity)
    loc = (payload.location or f"{payload.district or ''}, {payload.state or ''}").lower()

    current_price = round(commodity["basePrice"] * grade_multiplier)
    predicted_price = round(commodity["predictedPrice"] * grade_multiplier)
    price_diff = predicted_price - current_price
    price_change_pct = round((price_diff / current_price) * 100, 1) if current_price > 0 else 0.0
    price_trend = "up" if price_diff > 20 else ("down" if price_diff < -20 else "stable")

    # Multi-Mandi Logistics Analysis
    mandi_analysis = []
    for mandi in MANDIS_PY:
        effective_dist = mandi["distanceKm"]
        if "nashik" in loc or "lasalgaon" in loc:
            effective_dist = 12 if "nashik" in mandi["id"] else (mandi["distanceKm"] + 350)
        elif "guntur" in loc or "vijayawada" in loc:
            effective_dist = 15 if "guntur" in mandi["id"] else (mandi["distanceKm"] + 120)
        elif "warangal" in loc or "karimnagar" in loc:
            effective_dist = 14 if "warangal" in mandi["id"] else (mandi["distanceKm"] + 80)
        elif "hyderabad" in loc or "secunderabad" in loc:
            effective_dist = 10 if "hyderabad" in mandi["id"] else (mandi["distanceKm"] + 50)
        elif "kurnool" in loc or "andhra" in loc:
            if "kurnool" in mandi["id"]:
                effective_dist = 18
            elif "hyderabad" in mandi["id"]:
                effective_dist = 65
            elif "local" in mandi["id"]:
                effective_dist = 8
            elif "guntur" in mandi["id"]:
                effective_dist = 290
            elif "warangal" in mandi["id"]:
                effective_dist = 320
            else:
                effective_dist = mandi["distanceKm"] + 550

        mandi_spot = round(current_price * mandi["priceOffsetMultiplier"])
        mandi_pred = round(predicted_price * mandi["priceOffsetMultiplier"])
        
        transport_per_qtl = round(effective_dist * mandi["transportCostPerKmQtl"])
        transport_cost = round(transport_per_qtl * qty)

        optimal_days = commodity.get("recommendation", {}).get("optimalDays", 5)
        storage_rate = mandi["storageCostPerDayQtl"] if payload.hasStorage else (mandi["storageCostPerDayQtl"] + 3.0)
        storage_cost = round(optimal_days * storage_rate * qty) if optimal_days > 0 else 0
        storage_per_qtl = round(optimal_days * storage_rate) if optimal_days > 0 else 0

        gross_today = mandi_spot * qty
        net_today = gross_today - transport_cost

        gross_future = mandi_pred * qty
        net_future = gross_future - transport_cost - storage_cost

        mandi_analysis.append({
            **mandi,
            "distanceKm": effective_dist,
            "spotPricePerQtl": mandi_spot,
            "predPricePerQtl": mandi_pred,
            "transportCostTotal": transport_cost,
            "transportCostPerQtl": transport_per_qtl,
            "storageCostTotal": storage_cost,
            "storageCostPerQtl": storage_per_qtl,
            "grossToday": gross_today,
            "netReturnToday": net_today,
            "grossFuture": gross_future,
            "netReturnFuture": net_future
        })

    is_perishable = commodity.get("shelfLifeDays", 30) <= 10
    top_future = sorted(mandi_analysis, key=lambda m: m["netReturnFuture"], reverse=True)[0]
    top_today = sorted(mandi_analysis, key=lambda m: m["netReturnToday"], reverse=True)[0]
    local_mandi = sorted(mandi_analysis, key=lambda m: m["distanceKm"])[0]

    # Dynamic Selling Recommendation Verdict
    opt_days_rec = commodity.get("recommendation", {}).get("optimalDays", 5)

    if is_perishable and not payload.hasStorage:
        dec_type = "SELL_NOW"
        dec_action = "SELL IMMEDIATELY (TODAY)"
        opt_days = 0
        conf = 96
        headline = f"High perishability risk: Sell {commodity['name'].split()[0]} today"
        expl = f"Without cold storage, holding {commodity['name'].split()[0]} risks spoilage. Selling today locks in ₹{current_price}/Qtl."
    elif price_trend == "down":
        dec_type = "SELL_NOW"
        dec_action = "SELL IMMEDIATELY (TODAY)"
        opt_days = 0
        conf = 93
        headline = f"Arrival surge: Prices expected to drop by {abs(price_change_pct)}%"
        expl = f"Heavy supplies entering wholesale mandis. Selling today at ₹{current_price}/Qtl secures optimal net return."
    elif opt_days_rec > 0 and price_trend == "up" and (top_future["netReturnFuture"] > top_today["netReturnToday"] + 500):
        dec_type = "WAIT"
        dec_action = f"WAIT FOR {opt_days_rec} DAYS"
        opt_days = opt_days_rec
        conf = 94
        headline = f"Prices surging (+{price_change_pct}%): Holding produce yields high net profit"
        gain = top_future["netReturnFuture"] - top_today["netReturnToday"]
        expl = f"Expected price hike (+₹{price_diff}/Qtl) far exceeds storage rent. Waiting {opt_days} days yields approximately ₹{gain:,.0f} additional net profit."
    else:
        dec_type = "SELL_BEST_MARKET"
        dec_action = "SELL AT BEST APMC MANDI (TODAY)"
        opt_days = 0
        conf = 90
        headline = f"Stable price: Deliver to {top_today['name']}"
        expl = f"Delivering today to {top_today['name']} gives highest net return without extended storage deductions."

    is_wait = dec_type == "WAIT"
    mandi_analysis.sort(key=lambda m: m["netReturnFuture"] if is_wait else m["netReturnToday"], reverse=True)
    best_mandi = mandi_analysis[0]
    estimated_net = best_mandi["netReturnFuture"] if is_wait else best_mandi["netReturnToday"]
    additional_profit = max(0, estimated_net - local_mandi["netReturnToday"])

    # Transparent Prototype Buyer Matching & Scoring
    buyer_matches = []
    for b in BUYERS_PY:
        # Check commodity match
        is_matched_crop = any(commodity["id"] in c or c in commodity["id"] for c in b["commodities"])
        
        offer_rate = round(current_price * b["baseOfferMultiplier"])
        b_dist = b["distanceKm"]
        b_transport = round(b_dist * 1.8 * qty)
        b_gross = offer_rate * qty
        b_net = b_gross - b_transport

        # Calculate Prototype Match Score (out of 100)
        # Factor 1: Price Score (Max 40 pts)
        price_ratio = offer_rate / current_price if current_price > 0 else 1.0
        price_score = min(40, round(35 * price_ratio))

        # Factor 2: Distance Score (Max 25 pts)
        distance_score = max(10, round(25 - (b_dist * 0.25)))

        # Factor 3: Quantity Match Score (Max 20 pts)
        quantity_score = 20 if qty >= b["minQuantityQtl"] else round((qty / b["minQuantityQtl"]) * 20)

        # Factor 4: Quality Grade Alignment (Max 15 pts)
        grade_score = 15 if payload.grade == "A" else (13 if payload.grade == "B" else 10)

        total_match = min(99, price_score + distance_score + quantity_score + (5 if is_matched_crop else -15))

        buyer_matches.append({
            **b,
            "offerPricePerQtl": offer_rate,
            "grossContractValue": b_gross,
            "transportCostTotal": b_transport,
            "netReturn": b_net,
            "matchScore": total_match,
            "scoreBreakdown": {
                "priceScore": price_score,
                "distanceScore": distance_score,
                "quantityScore": quantity_score,
                "gradeScore": grade_score,
                "total": total_match,
                "max": 100
            },
            "isPrototype": True,
            "prototypeDisclaimer": "Prototype Buyer Matching Data for demonstration and evaluation only. Not a live exchange contract."
        })

    buyer_matches.sort(key=lambda b: b["matchScore"], reverse=True)

    has_ml = bool(commodity.get("hasMLModel", False))
    forecast_label = "Actual ML Forecast" if has_ml else "Estimated Demo Forecast"

    return {
        "status": "success",
        "data_source": commodity.get("dataSource", "mock_fallback"),
        "forecast_source": "actual_ml_model" if has_ml else "estimated_demo_forecast",
        "forecast_notice": forecast_label,
        "commodityInfo": commodity,
        "input": payload.model_dump(),
        "pricing": {
            "currentPrice": current_price,
            "predictedPrice": predicted_price,
            "priceChangePct": price_change_pct,
            "priceTrend": price_trend,
            "isPositive": price_diff >= 0,
            "priceDiff": price_diff,
            "optimalDays": opt_days,
            "bestMarketName": best_mandi["name"],
            "bestMarketDistance": best_mandi["distanceKm"],
            "bestMarketPricePerQtl": best_mandi["predPricePerQtl"] if is_wait else best_mandi["spotPricePerQtl"],
            "transportCostTotal": best_mandi["transportCostTotal"],
            "transportCostPerQtl": best_mandi["transportCostPerQtl"],
            "storageCostTotal": best_mandi["storageCostTotal"] if is_wait else 0,
            "storageCostPerQtl": best_mandi["storageCostPerQtl"] if is_wait else 0,
            "grossReturn": best_mandi["grossFuture"] if is_wait else best_mandi["grossToday"],
            "estimatedNetReturn": estimated_net,
            "additionalProfit": additional_profit,
            "historical30d": commodity.get("historical30d", []),
            "predicted7d": commodity.get("predicted7d", [])
        },
        "recommendation": {
            "action": dec_action,
            "type": dec_type,
            "headline": headline,
            "explanation": expl,
            "optimalDays": opt_days,
            "expectedGain": additional_profit,
            "confidence": conf,
            "factors": commodity.get("recommendation", {}).get("factors", [])
        },
        "mandis": mandi_analysis,
        "buyers": buyer_matches
    }


# ============================================================================
# Static Files & SPA Route Servicing
# ============================================================================

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
@app.get("/analyze")
@app.get("/analysis")
@app.get("/dashboard")
@app.get("/recommendation")
@app.get("/buyers")
def serve_spa_pages():
    """Serve the single page application HTML shell for all frontend routes."""
    index_path = os.path.join(BASE_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("<h1>AgriPredict AI Backend Running</h1>")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
