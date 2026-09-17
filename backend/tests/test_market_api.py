# AgriPredict AI - Comprehensive Market API & Data Processing Test Suite
"""
Phase F: Automated Tests covering:
1. API client configuration & .env handling
2. API response parsing
3. Filter parameter generation (filters[State], etc.)
4. Automatic Pagination & safety limits
5. Invalid API responses & error handling
6. Timeout & network error resilience
7. Data normalization, price conversion, and deduplication
8. FastAPI endpoints (GET /api/live-market-data, POST /api/update-market-history, POST /api/analyze)
9. Credential sanitization (No API key leaks)
"""

import os
import tempfile
import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime

import pandas as pd
from fastapi.testclient import TestClient

from backend.services.market_api import (
    get_api_config,
    build_query_params,
    extract_records_from_response,
    fetch_market_data,
    fetch_all_market_data,
    sanitize_message
)
from backend.services.data_processor import (
    clean_price_value,
    parse_arrival_date,
    normalize_market_records,
    update_market_history,
    load_market_history
)
from backend.main import app


class TestMarketAPIClient(unittest.TestCase):
    
    # -------------------------------------------------------------
    # 1. API Client Configuration
    # -------------------------------------------------------------
    def test_api_config_placeholder(self):
        """Test that placeholder values are safely treated as unconfigured."""
        with patch.dict(os.environ, {"MARKET_API_KEY": "PASTE_MY_API_KEY_HERE", "MARKET_API_URL": "PASTE_MY_API_URL_HERE"}):
            url, key = get_api_config()
            self.assertIsNone(url)
            self.assertIsNone(key)

    def test_api_config_custom(self):
        """Test loading valid custom credentials."""
        with patch.dict(os.environ, {"MARKET_API_KEY": "secret_test_key_123", "MARKET_API_URL": "https://api.data.gov.in/test"}):
            url, key = get_api_config()
            self.assertEqual(url, "https://api.data.gov.in/test")
            self.assertEqual(key, "secret_test_key_123")

    # -------------------------------------------------------------
    # 2. Filter Parameter Generation
    # -------------------------------------------------------------
    def test_build_query_params_dynamic_filters(self):
        """Test dynamic generation of filters only when values are provided."""
        # Case A: Only State & Commodity provided
        params = build_query_params(
            api_key="mock_key_xyz",
            state="Andhra Pradesh",
            commodity="Onion",
            limit=50,
            offset=100
        )
        self.assertEqual(params["api-key"], "mock_key_xyz")
        self.assertEqual(params["format"], "json")
        self.assertEqual(params["limit"], 50)
        self.assertEqual(params["offset"], 100)
        self.assertEqual(params["filters[State]"], "Andhra Pradesh")
        self.assertEqual(params["filters[Commodity]"], "Onion")
        self.assertNotIn("filters[District]", params)
        self.assertNotIn("filters[Arrival_Date]", params)

        # Case B: All filters provided
        params_all = build_query_params(
            api_key="mock_key_xyz",
            state="Maharashtra",
            district="Nashik",
            commodity="Tomato",
            arrival_date="2026-08-28"
        )
        self.assertEqual(params_all["filters[State]"], "Maharashtra")
        self.assertEqual(params_all["filters[District]"], "Nashik")
        self.assertEqual(params_all["filters[Commodity]"], "Tomato")
        self.assertEqual(params_all["filters[Arrival_Date]"], "2026-08-28")

    # -------------------------------------------------------------
    # 3. Response Extraction
    # -------------------------------------------------------------
    def test_extract_records_formats(self):
        """Test extracting records from data.gov.in formats."""
        # Dict format with records key
        data1 = {"records": [{"Market": "Kurnool", "Modal_Price": 2900}], "total": 150}
        rec1, total1 = extract_records_from_response(data1)
        self.assertEqual(len(rec1), 1)
        self.assertEqual(total1, 150)

        # Direct List format
        data2 = [{"Market": "Hyderabad", "Modal_Price": 3200}]
        rec2, total2 = extract_records_from_response(data2)
        self.assertEqual(len(rec2), 1)
        self.assertEqual(total2, 1)

    # -------------------------------------------------------------
    # 4. Pagination Logic
    # -------------------------------------------------------------
    @patch("backend.services.market_api.fetch_market_data")
    @patch("backend.services.market_api.get_api_config")
    def test_fetch_all_market_data_pagination(self, mock_config, mock_fetch):
        """Test automatic multi-page pagination."""
        mock_config.return_value = ("https://api.data.gov.in/test", "mock_key")

        # Mock 2 pages of data: Page 1 returns 2 records (total 3), Page 2 returns 1 record
        mock_fetch.side_effect = [
            {
                "status": "success",
                "records": [{"Market": "M1", "Modal_Price": 100}, {"Market": "M2", "Modal_Price": 200}],
                "total": 3,
                "offset": 0,
                "limit": 2
            },
            {
                "status": "success",
                "records": [{"Market": "M3", "Modal_Price": 300}],
                "total": 3,
                "offset": 2,
                "limit": 2
            }
        ]

        result = fetch_all_market_data(commodity="Onion", limit=2, max_pages=5)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["total_fetched"], 3)
        self.assertEqual(len(result["records"]), 3)
        self.assertEqual(result["pages_fetched"], 2)

    # -------------------------------------------------------------
    # 5. Invalid Response & Error Handling
    # -------------------------------------------------------------
    @patch("backend.services.market_api.requests.get")
    @patch("backend.services.market_api.get_api_config")
    def test_fetch_market_data_http_error(self, mock_config, mock_get):
        """Test HTTP 500 or 401 error handling."""
        mock_config.return_value = ("https://api.data.gov.in/test", "mock_key")
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = Exception("HTTP 500 Internal Server Error")
        mock_get.return_value = mock_response

        res = fetch_market_data(commodity="Onion")
        self.assertEqual(res["status"], "error")
        self.assertEqual(res["data_source"], "error")
        self.assertEqual(len(res["records"]), 0)

    # -------------------------------------------------------------
    # 6. Timeout Error Handling
    # -------------------------------------------------------------
    @patch("backend.services.market_api.requests.get")
    @patch("backend.services.market_api.get_api_config")
    def test_fetch_market_data_timeout(self, mock_config, mock_get):
        """Test request timeout handling."""
        mock_config.return_value = ("https://api.data.gov.in/test", "mock_key")
        import requests
        mock_get.side_effect = requests.exceptions.Timeout("Connection timed out after 10s")

        res = fetch_market_data(commodity="Onion")
        self.assertEqual(res["status"], "error")
        self.assertIn("timed out", res["message"].lower())

    # -------------------------------------------------------------
    # 7. Credential Sanitization
    # -------------------------------------------------------------
    def test_credential_sanitization(self):
        """Test that API keys are masked in log messages and URLs."""
        test_key = "super_secret_gov_api_key_999"
        log_msg = f"Failed request to https://api.data.gov.in/resource?api-key={test_key}&format=json"
        sanitized = sanitize_message(log_msg, api_key=test_key)
        self.assertNotIn(test_key, sanitized)
        self.assertIn("REDACTED", sanitized)


class TestDataProcessor(unittest.TestCase):

    def test_clean_price_value(self):
        """Test cleaning varied currency/number formats."""
        self.assertEqual(clean_price_value("2,900"), 2900.0)
        self.assertEqual(clean_price_value("₹ 3,450.50"), 3450.5)
        self.assertEqual(clean_price_value(2800), 2800.0)
        self.assertIsNone(clean_price_value("0"))
        self.assertIsNone(clean_price_value("-500"))
        self.assertIsNone(clean_price_value(None))

    def test_parse_arrival_date(self):
        """Test parsing varied date formats into standard datetime."""
        d1 = parse_arrival_date("28/08/2026")
        self.assertEqual(d1.strftime("%Y-%m-%d"), "2026-08-28")

        d2 = parse_arrival_date("2026-08-28")
        self.assertEqual(d2.strftime("%Y-%m-%d"), "2026-08-28")

        d3 = parse_arrival_date("28-08-2026")
        self.assertEqual(d3.strftime("%Y-%m-%d"), "2026-08-28")

    def test_normalize_market_records(self):
        """Test complete DataFrame cleaning, sorting, and deduplication."""
        raw_samples = [
            {
                "state": "andhra pradesh",
                "district": "kurnool",
                "market": "kurnool apmc",
                "commodity": "onion",
                "variety": "red",
                "grade": "faq",
                "arrival_date": "28/08/2026",
                "min_price": "2,700",
                "max_price": "3,100",
                "modal_price": "2,900"
            },
            # Duplicate entry with updated price
            {
                "state": "Andhra Pradesh",
                "district": "Kurnool",
                "market": "Kurnool APMC",
                "commodity": "Onion",
                "variety": "Red",
                "grade": "FAQ",
                "arrival_date": "2026-08-28",
                "min_price": "2,800",
                "max_price": "3,200",
                "modal_price": "3,000"
            },
            # Invalid entry (no price)
            {
                "state": "Telangana",
                "district": "Warangal",
                "market": "Warangal",
                "commodity": "Cotton",
                "arrival_date": "invalid_date",
                "modal_price": "0"
            }
        ]

        df = normalize_market_records(raw_samples)
        # Should have exactly 1 record after deduplication and dropping invalid
        self.assertEqual(len(df), 1)
        row = df.iloc[0]
        self.assertEqual(row["State"], "Andhra Pradesh")
        self.assertEqual(row["Commodity"], "Onion")
        self.assertEqual(row["Modal_Price"], 3000.0)
        self.assertEqual(row["Arrival_Date"], "2026-08-28")


class TestFastAPIEndpoints(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_endpoint(self):
        """Test GET /api/health."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertIn("external_api_configured", data)

    @patch("backend.main.fetch_market_data")
    def test_live_market_data_fallback(self, mock_fetch):
        """Test GET /api/live-market-data with mock/cached fallback."""
        mock_fetch.return_value = {
            "status": "success",
            "data_source": "live_api",
            "records": [
                {
                    "State": "Andhra Pradesh",
                    "District": "Kurnool",
                    "Market": "Kurnool APMC",
                    "Commodity": "Onion",
                    "Variety": "Red",
                    "Grade": "FAQ",
                    "Arrival_Date": "2026-08-28",
                    "Min_Price": 2800,
                    "Max_Price": 3200,
                    "Modal_Price": 3000
                }
            ],
            "total": 1,
            "offset": 0,
            "limit": 100,
            "last_updated": "2026-08-28T21:00:00Z"
        }
        res = self.client.get("/api/live-market-data?commodity=Onion")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn(data["data_source"], ["live_api", "cached_data", "mock_fallback"])
        self.assertGreaterEqual(len(data["records"]), 1)
        self.assertIn("last_updated", data)

    @patch("backend.main.fetch_all_market_data")
    def test_update_market_history_endpoint(self, mock_fetch_all):
        """Test POST /api/update-market-history response format."""
        mock_fetch_all.return_value = {
            "status": "success",
            "data_source": "live_api",
            "records": [
                {
                    "State": "Andhra Pradesh",
                    "District": "Kurnool",
                    "Market": "Kurnool APMC",
                    "Commodity": "Onion",
                    "Variety": "Red",
                    "Grade": "FAQ",
                    "Arrival_Date": "2026-08-28",
                    "Min_Price": 2800,
                    "Max_Price": 3200,
                    "Modal_Price": 3000
                }
            ],
            "total_fetched": 1,
            "pages_fetched": 1,
            "last_updated": "2026-08-28T21:00:00Z"
        }
        res = self.client.post("/api/update-market-history", json={"commodity": "Onion", "limit": 10})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("status", data)
        self.assertIn("records_fetched", data)
        self.assertIn("records_added", data)

    def test_existing_analyze_endpoint_unbroken(self):
        """Verify POST /api/analyze remains 100% functional."""
        payload = {
            "commodityId": "onion",
            "quantity": 50.0,
            "grade": "A",
            "location": "Kurnool, Andhra Pradesh",
            "hasStorage": True
        }
        res = self.client.post("/api/analyze", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["pricing"]["currentPrice"], 3045)
        self.assertIn("Hyderabad", data["pricing"]["bestMarketName"])
        self.assertEqual(data["recommendation"]["action"], "WAIT FOR 5 DAYS")

    def test_dynamic_commodities_expansion(self):
        """Verify GET /api/commodities returns 15+ dynamic commodities with full metadata."""
        res = self.client.get("/api/commodities")
        self.assertEqual(res.status_code, 200)
        commodities = res.json()
        self.assertGreaterEqual(len(commodities), 15, "Expected at least 15 dynamic commodities")
        
        # Verify required fields
        sample = commodities[0]
        self.assertIn("id", sample)
        self.assertIn("name", sample)
        self.assertIn("category", sample)
        self.assertIn("basePrice", sample)
        self.assertIn("hasMLModel", sample)
        self.assertIn("forecastType", sample)

    def test_analyze_onion_maharashtra_scenario(self):
        """End-to-End Test: Commodity: Onion, Quantity: 50, Grade: A, State: Maharashtra."""
        payload = {
            "commodityId": "onion",
            "quantity": 50.0,
            "grade": "A",
            "state": "Maharashtra",
            "district": "Nashik",
            "location": "Nashik, Maharashtra",
            "hasStorage": True
        }
        res = self.client.post("/api/analyze", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        # 1. Correct inputs echoed
        self.assertEqual(data["input"]["commodityId"], "onion")
        self.assertEqual(data["input"]["quantity"], 50.0)
        self.assertEqual(data["input"]["grade"], "A")
        
        # 2. Pricing & returns calculated
        self.assertGreater(data["pricing"]["currentPrice"], 0)
        self.assertGreater(data["pricing"]["estimatedNetReturn"], 0)
        self.assertIn("bestMarketName", data["pricing"])
        
        # 3. Transparent prototype buyer matching
        self.assertGreaterEqual(len(data["buyers"]), 1)
        buyer = data["buyers"][0]
        self.assertTrue(buyer["isPrototype"])
        self.assertIn("scoreBreakdown", buyer)
        self.assertIn("priceScore", buyer["scoreBreakdown"])

    def test_analyze_wheat_scenario(self):
        """End-to-End Test: Commodity: Wheat, Quantity: 60, Grade: B, State: Madhya Pradesh."""
        payload = {
            "commodityId": "wheat",
            "quantity": 60.0,
            "grade": "B",
            "state": "Madhya Pradesh",
            "district": "Indore",
            "location": "Indore, Madhya Pradesh",
            "hasStorage": False
        }
        res = self.client.post("/api/analyze", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["input"]["commodityId"], "wheat")
        self.assertEqual(data["pricing"]["currentPrice"], 2450)
        self.assertIn("SELL", data["recommendation"]["action"])

    def test_sequential_commodity_switching(self):
        """Verify selecting and changing commodities sequentially (Onion -> Potato -> Tomato -> Onion)."""
        crops = [
            ("onion", 2900, "Onion"),
            ("potato", 1450, "Potato"),
            ("tomato", 1850, "Tomato"),
            ("onion", 2900, "Onion"),
            ("cotton", 7400, "Cotton")
        ]
        for crop_id, exp_base_price, name_snippet in crops:
            payload = {
                "commodityId": crop_id,
                "quantity": 50.0,
                "grade": "B",
                "state": "Andhra Pradesh",
                "district": "Kurnool",
                "hasStorage": True
            }
            res = self.client.post("/api/analyze", json=payload)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data["input"]["commodityId"], crop_id)
            self.assertEqual(data["pricing"]["currentPrice"], exp_base_price)
            self.assertIn(name_snippet, data["commodityInfo"]["name"])

    def test_all_six_spa_routes(self):
        """Verify that all 6 application page routes return 200 OK with HTML shell."""
        routes = ["/", "/analyze", "/analysis", "/dashboard", "/recommendation", "/buyers"]
        for r in routes:
            res = self.client.get(r)
            self.assertEqual(res.status_code, 200, f"Route {r} failed with status {res.status_code}")
            self.assertIn("AgriPredict", res.text, f"Route {r} did not return expected HTML")
            self.assertIn("appMainContent", res.text)

    def test_create_individual_farmer_lot(self):
        """Verify Individual Farmer Produce Lot creation (POST /api/lots)."""
        payload = {
            "commodityId": "onion",
            "commodityName": "Onion (Nashik Red)",
            "quantity": 75.0,
            "unit": "Quintal (100 kg)",
            "qualityGrade": "A",
            "location": "Kurnool, Andhra Pradesh",
            "expectedMinimumPrice": 3200.0,
            "sellerType": "Individual Farmer"
        }
        res = self.client.post("/api/lots", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        lot = data["lot"]
        self.assertTrue(lot["lotId"].startswith("AGRI-2026-"))
        self.assertEqual(lot["quantity"], 75.0)
        self.assertEqual(lot["sellerType"], "Individual Farmer")
        self.assertEqual(lot["status"], "OPEN")

    def test_create_fpo_member_aggregated_lot(self):
        """Verify FPO Multi-Member Harvest Aggregation sum calculation."""
        payload = {
            "commodityId": "tomato",
            "commodityName": "Tomato (Hybrid Red)",
            "quantity": 10.0,  # Base fallback
            "unit": "Quintal (100 kg)",
            "qualityGrade": "B",
            "location": "Madanapalle, Andhra Pradesh",
            "expectedMinimumPrice": 1800.0,
            "sellerType": "FPO / Producer Group",
            "fpoName": "Rayalaseema Farmer Producer Co",
            "fpoMembers": [
                {"name": "Farmer 1", "quantity": 40.0},
                {"name": "Farmer 2", "quantity": 35.0},
                {"name": "Farmer 3", "quantity": 25.0}
            ]
        }
        res = self.client.post("/api/lots", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        lot = data["lot"]
        # Aggregated quantity should be 40 + 35 + 25 = 100.0
        self.assertEqual(lot["quantity"], 100.0)
        self.assertEqual(len(lot["fpoMembers"]), 3)

    def test_matched_buyers_deterministic_scoring(self):
        """Verify deterministic 100-point buyer compatibility match calculation."""
        # Create a test lot
        payload = {
            "commodityId": "onion",
            "commodityName": "Onion (Nashik Red)",
            "quantity": 50.0,
            "qualityGrade": "A",
            "location": "Kurnool, Andhra Pradesh",
            "expectedMinimumPrice": 3100.0,
            "sellerType": "Individual Farmer"
        }
        create_res = self.client.post("/api/lots", json=payload)
        lot_id = create_res.json()["lot"]["lotId"]

        # Fetch buyers for lot
        res = self.client.get(f"/api/lots/{lot_id}/buyers")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreater(data["total_matches"], 0)
        
        buyers = data["buyers"]
        # Verify descending order of match scores
        scores = [b["matchScore"] for b in buyers]
        self.assertEqual(scores, sorted(scores, reverse=True))

        top_buyer = buyers[0]
        self.assertIn("scoreBreakdown", top_buyer)
        self.assertEqual(top_buyer["scoreBreakdown"]["commodityScore"], 40)
        self.assertGreater(top_buyer["scoreBreakdown"]["quantityScore"], 0)
        self.assertGreater(top_buyer["scoreBreakdown"]["gradeScore"], 0)
        self.assertGreater(top_buyer["scoreBreakdown"]["locationScore"], 0)
        self.assertIn("Strong match", top_buyer["matchExplanation"])

    def test_send_buyer_interest_workflow(self):
        """Verify sending interest to a matched buyer and generating 4-step timeline."""
        # Create lot
        lot_res = self.client.post("/api/lots", json={
            "commodityId": "cotton",
            "quantity": 40.0,
            "qualityGrade": "A",
            "location": "Warangal, Telangana",
            "expectedMinimumPrice": 7500.0,
            "sellerType": "Individual Farmer"
        })
        lot_id = lot_res.json()["lot"]["lotId"]

        # Send interest to buyer
        interest_payload = {
            "buyerId": "buyer-itc-03",
            "buyerName": "ITC Agri Business Division (e-Choupal)",
            "contactName": "Farmer Lead",
            "contactPhone": "+91 94401 22334",
            "offeredPrice": 7600.0,
            "message": "Lot ready for dispatch with certified moisture grade."
        }
        res = self.client.post(f"/api/lots/{lot_id}/interest", json=interest_payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertEqual(data["interest"]["status"], "INTEREST SENT")
        
        # Verify 4 timeline stages
        timeline = data["interest"]["timeline"]
        self.assertEqual(len(timeline), 4)
        self.assertTrue(timeline[0]["completed"])
        self.assertTrue(timeline[1]["completed"])
        self.assertTrue(timeline[2]["completed"])
        self.assertFalse(timeline[3]["completed"])
        self.assertIn("Pending", timeline[3]["status"])


if __name__ == "__main__":
    unittest.main()
