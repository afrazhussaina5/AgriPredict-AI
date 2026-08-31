# AgriPredict AI - Automated Endpoint Test Suite
import sys
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_endpoints():
    print("Testing AgriPredict AI API Endpoints...")
    
    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    print("[PASS] GET /api/health:", res.json())

    # 2. Commodities
    res = client.get("/api/commodities")
    assert res.status_code == 200
    commodities = res.json()
    assert len(commodities) > 0
    print(f"[PASS] GET /api/commodities: Loaded {len(commodities)} commodities.")

    # 3. Mandis
    res = client.get("/api/mandis")
    assert res.status_code == 200
    mandis = res.json()
    assert len(mandis) > 0
    print(f"[PASS] GET /api/mandis: Loaded {len(mandis)} APMC mandis.")

    # 4. Analyze Produce
    payload = {
        "commodityId": "onion",
        "quantity": 50.0,
        "grade": "A",
        "location": "Kurnool, Andhra Pradesh",
        "hasStorage": True
    }
    res = client.post("/api/analyze", json=payload)
    assert res.status_code == 200
    analysis = res.json()
    print("[PASS] POST /api/analyze:")
    print("  -> Current Price:", analysis["pricing"]["currentPrice"])
    print("  -> Predicted Price:", analysis["pricing"]["predictedPrice"])
    print("  -> AI Decision:", analysis["recommendation"]["action"])
    print("  -> Estimated Net Return:", analysis["pricing"]["estimatedNetReturn"])
    print("  -> Best Market:", analysis["pricing"]["bestMarketName"])

    # 5. Buyers
    res = client.get("/api/buyers?commodity=onion")
    assert res.status_code == 200
    buyers = res.json()
    print(f"[PASS] GET /api/buyers: Found {len(buyers)} buyers for Onion.")

    print("\nAll Backend Tests PASSED Successfully!")

if __name__ == "__main__":
    test_endpoints()
