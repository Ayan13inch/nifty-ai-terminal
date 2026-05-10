"""
NIFTY 50 LIVE SCANNER - Backend API
Requires: pip install flask flask-cors yfinance pandas numpy
Run: python app.py
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import threading
import time

app = Flask(__name__)
CORS(app)

# ─── Nifty 50 Constituents (Yahoo Finance symbols) ───────────────────────────
NIFTY50_SYMBOLS = {
    "RELIANCE.NS":    "Reliance Industries",
    "TCS.NS":         "Tata Consultancy Services",
    "HDFCBANK.NS":    "HDFC Bank",
    "INFY.NS":        "Infosys",
    "ICICIBANK.NS":   "ICICI Bank",
    "HINDUNILVR.NS":  "Hindustan Unilever",
    "ITC.NS":         "ITC Limited",
    "SBIN.NS":        "State Bank of India",
    "BAJFINANCE.NS":  "Bajaj Finance",
    "BHARTIARTL.NS":  "Bharti Airtel",
    "KOTAKBANK.NS":   "Kotak Mahindra Bank",
    "LT.NS":          "Larsen & Toubro",
    "AXISBANK.NS":    "Axis Bank",
    "ASIANPAINT.NS":  "Asian Paints",
    "MARUTI.NS":      "Maruti Suzuki",
    "WIPRO.NS":       "Wipro",
    "ULTRACEMCO.NS":  "UltraTech Cement",
    "NESTLEIND.NS":   "Nestle India",
    "TITAN.NS":       "Titan Company",
    "POWERGRID.NS":   "Power Grid Corp",
    "NTPC.NS":        "NTPC Limited",
    "TECHM.NS":       "Tech Mahindra",
    "SUNPHARMA.NS":   "Sun Pharmaceutical",
    "HCLTECH.NS":     "HCL Technologies",
    "BAJAJFINSV.NS":  "Bajaj Finserv",
    "TATAMOTORS.NS":  "Tata Motors",
    "TATASTEEL.NS":   "Tata Steel",
    "JSWSTEEL.NS":    "JSW Steel",
    "ADANIENT.NS":    "Adani Enterprises",
    "ADANIPORTS.NS":  "Adani Ports",
    "COALINDIA.NS":   "Coal India",
    "GRASIM.NS":      "Grasim Industries",
    "HEROMOTOCO.NS":  "Hero MotoCorp",
    "DRREDDY.NS":     "Dr Reddy's Labs",
    "DIVISLAB.NS":    "Divi's Laboratories",
    "CIPLA.NS":       "Cipla",
    "EICHERMOT.NS":   "Eicher Motors",
    "HINDALCO.NS":    "Hindalco Industries",
    "M&M.NS":         "Mahindra & Mahindra",
    "BRITANNIA.NS":   "Britannia Industries",
    "UPL.NS":         "UPL Limited",
    "BPCL.NS":        "BPCL",
    "INDUSINDBK.NS":  "IndusInd Bank",
    "SHREECEM.NS":    "Shree Cement",
    "SBILIFE.NS":     "SBI Life Insurance",
    "HDFCLIFE.NS":    "HDFC Life Insurance",
    "BAJAJ-AUTO.NS":  "Bajaj Auto",
    "APOLLOHOSP.NS":  "Apollo Hospitals",
    "TATACONSUM.NS":  "Tata Consumer Products",
    "ONGC.NS":        "ONGC",
}

# ─── In-memory cache ──────────────────────────────────────────────────────────
_cache = {"stocks": {}, "last_updated": None}
_cache_lock = threading.Lock()

# ─── Technical Indicator Helpers ─────────────────────────────────────────────

def compute_rsi(series: pd.Series, period: int = 14) -> float:
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return round(float(rsi.iloc[-1]), 2) if not rsi.empty else 50.0

def compute_macd(series: pd.Series):
    ema12 = series.ewm(span=12, adjust=False).mean()
    ema26 = series.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    signal_line = macd_line.ewm(span=9, adjust=False).mean()
    histogram = macd_line - signal_line
    return (
        round(float(macd_line.iloc[-1]), 4),
        round(float(signal_line.iloc[-1]), 4),
        round(float(histogram.iloc[-1]), 4),
    )

def compute_bollinger(series: pd.Series, window: int = 20):
    sma = series.rolling(window).mean()
    std = series.rolling(window).std()
    upper = sma + 2 * std
    lower = sma - 2 * std
    return (
        round(float(upper.iloc[-1]), 2),
        round(float(sma.iloc[-1]), 2),
        round(float(lower.iloc[-1]), 2),
    )

def volume_signal(vol_series: pd.Series) -> str:
    avg_vol = vol_series.iloc[:-1].mean()
    latest_vol = vol_series.iloc[-1]
    ratio = latest_vol / avg_vol if avg_vol > 0 else 1
    if ratio > 1.5:
        return "HIGH"
    elif ratio < 0.7:
        return "LOW"
    return "NORMAL"

def score_stock(rsi, macd_hist, price, bb_lower, bb_upper, bb_mid, change_pct):
    """Generate a composite buy/sell score (-100 to +100). Positive = bullish."""
    score = 0

    # RSI component
    if rsi < 30:
        score += 30       # Oversold — strong buy
    elif rsi < 45:
        score += 15
    elif rsi > 70:
        score -= 30       # Overbought — strong sell
    elif rsi > 55:
        score -= 10

    # MACD histogram
    if macd_hist > 0:
        score += 20
    else:
        score -= 20

    # Bollinger Band position
    bb_range = bb_upper - bb_lower
    if bb_range > 0:
        position = (price - bb_lower) / bb_range  # 0=lower band, 1=upper band
        if position < 0.2:
            score += 20   # Near lower band — buy signal
        elif position > 0.8:
            score -= 20   # Near upper band — sell signal

    # Price momentum
    if change_pct > 2:
        score += 10
    elif change_pct < -2:
        score -= 10

    return max(-100, min(100, score))

def generate_recommendation(score, rsi, price, bb_lower, bb_upper, change_pct):
    if score >= 40:
        action = "STRONG BUY"
        color = "#00ff88"
        reason = f"RSI {rsi:.1f} (oversold) + bullish MACD crossover"
    elif score >= 15:
        action = "BUY"
        color = "#00cc66"
        reason = f"RSI {rsi:.1f} + momentum building"
    elif score <= -40:
        action = "STRONG SELL"
        color = "#ff3366"
        reason = f"RSI {rsi:.1f} (overbought) + bearish divergence"
    elif score <= -15:
        action = "SELL"
        color = "#ff6688"
        reason = f"RSI {rsi:.1f} + downward pressure"
    else:
        action = "HOLD"
        color = "#f0c040"
        reason = "Mixed signals — wait for clearer direction"

    # Target and stop-loss
    atr_proxy = abs(price * 0.015)  # ~1.5% ATR proxy
    if "BUY" in action:
        target = round(price * 1.06, 2)
        stop_loss = round(max(bb_lower, price - 2 * atr_proxy), 2)
    elif "SELL" in action:
        target = round(price * 0.95, 2)
        stop_loss = round(min(bb_upper, price + 2 * atr_proxy), 2)
    else:
        target = round(price * 1.03, 2)
        stop_loss = round(price * 0.97, 2)

    return {
        "action": action,
        "color": color,
        "reason": reason,
        "target": target,
        "stop_loss": stop_loss,
    }

# ─── Core Data Fetcher ───────────────────────────────────────────────────────

def fetch_stock_data(symbol: str) -> dict | None:
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period="3mo", interval="1d")
        if hist.empty or len(hist) < 30:
            return None

        closes = hist["Close"]
        volumes = hist["Volume"]
        price = round(float(closes.iloc[-1]), 2)
        prev_price = round(float(closes.iloc[-2]), 2)
        change = round(price - prev_price, 2)
        change_pct = round((change / prev_price) * 100, 2)

        rsi = compute_rsi(closes)
        macd, signal, macd_hist = compute_macd(closes)
        bb_upper, bb_mid, bb_lower = compute_bollinger(closes)
        vol_signal = volume_signal(volumes)
        score = score_stock(rsi, macd_hist, price, bb_lower, bb_upper, bb_mid, change_pct)
        rec = generate_recommendation(score, rsi, price, bb_lower, bb_upper, change_pct)

        # 52-week high / low
        hist_1y = ticker.history(period="1y", interval="1d")
        week52_high = round(float(hist_1y["High"].max()), 2) if not hist_1y.empty else price
        week52_low = round(float(hist_1y["Low"].min()), 2) if not hist_1y.empty else price

        # 7-day sparkline
        sparkline = [round(float(v), 2) for v in closes.tail(7).tolist()]

        name = NIFTY50_SYMBOLS.get(symbol, symbol.replace(".NS", ""))
        ticker_code = symbol.replace(".NS", "")

        return {
            "symbol": ticker_code,
            "name": name,
            "price": price,
            "change": change,
            "change_pct": change_pct,
            "rsi": rsi,
            "macd": macd,
            "macd_signal": signal,
            "macd_hist": macd_hist,
            "bb_upper": bb_upper,
            "bb_mid": bb_mid,
            "bb_lower": bb_lower,
            "volume_signal": vol_signal,
            "score": score,
            "week52_high": week52_high,
            "week52_low": week52_low,
            "sparkline": sparkline,
            **rec,
        }
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        return None

def refresh_cache():
    """Refresh all stocks in background."""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Refreshing Nifty 50 cache...")
    new_data = {}
    for symbol in NIFTY50_SYMBOLS:
        data = fetch_stock_data(symbol)
        if data:
            new_data[symbol.replace(".NS", "")] = data
    with _cache_lock:
        _cache["stocks"] = new_data
        _cache["last_updated"] = datetime.now().isoformat()
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Cache updated: {len(new_data)} stocks loaded.")

def background_refresher():
    while True:
        refresh_cache()
        time.sleep(300)  # Refresh every 5 minutes

# ─── API Endpoints ────────────────────────────────────────────────────────────

@app.route("/api/status")
def status():
    with _cache_lock:
        return jsonify({
            "status": "online",
            "stocks_loaded": len(_cache["stocks"]),
            "last_updated": _cache["last_updated"],
        })

@app.route("/api/top5")
def top5():
    """Return top 5 stocks by absolute score magnitude for landing page."""
    with _cache_lock:
        stocks = list(_cache["stocks"].values())

    if not stocks:
        return jsonify({"error": "Data not ready yet. Please wait a moment and retry."}), 503

    # Sort by absolute score descending (most decisive signal)
    stocks_sorted = sorted(stocks, key=lambda x: abs(x["score"]), reverse=True)
    return jsonify({"data": stocks_sorted[:5], "last_updated": _cache["last_updated"]})

@app.route("/api/all")
def all_stocks():
    """Return all Nifty 50 stocks with indicators."""
    with _cache_lock:
        stocks = list(_cache["stocks"].values())

    if not stocks:
        return jsonify({"error": "Data not ready yet. Please wait a moment and retry."}), 503

    sort_by = request.args.get("sort", "score")
    order = request.args.get("order", "desc")

    valid_sorts = {"score", "change_pct", "rsi", "price", "symbol"}
    if sort_by not in valid_sorts:
        sort_by = "score"

    reverse = order == "desc"
    stocks_sorted = sorted(stocks, key=lambda x: abs(x[sort_by]) if sort_by == "score" else x[sort_by], reverse=reverse)
    return jsonify({"data": stocks_sorted, "last_updated": _cache["last_updated"]})

@app.route("/api/recommendations", methods=["POST"])
def recommendations():
    """
    Given a budget (INR), return an optimized portfolio of buy recommendations.
    Body JSON: { "budget": 100000 }
    """
    body = request.get_json(silent=True) or {}
    budget = float(body.get("budget", 50000))

    if budget < 1000:
        return jsonify({"error": "Minimum budget is ₹1,000"}), 400

    with _cache_lock:
        stocks = list(_cache["stocks"].values())

    if not stocks:
        return jsonify({"error": "Data not ready yet."}), 503

    # Filter to buyable stocks
    buy_candidates = [s for s in stocks if "BUY" in s["action"] and s["price"] <= budget]
    buy_candidates.sort(key=lambda x: x["score"], reverse=True)

    portfolio = []
    remaining = budget

    for stock in buy_candidates:
        if remaining < stock["price"]:
            continue
        qty = int(remaining * 0.35 / stock["price"])  # Max 35% per stock
        qty = max(1, min(qty, int(remaining / stock["price"])))
        cost = round(qty * stock["price"], 2)
        if cost > remaining:
            qty = int(remaining / stock["price"])
            cost = round(qty * stock["price"], 2)
        if qty < 1:
            continue
        potential_gain = round((stock["target"] - stock["price"]) * qty, 2)
        risk = round((stock["price"] - stock["stop_loss"]) * qty, 2)
        portfolio.append({
            **stock,
            "qty": qty,
            "cost": cost,
            "potential_gain": potential_gain,
            "risk_amount": risk,
            "allocation_pct": round((cost / budget) * 100, 1),
        })
        remaining = round(remaining - cost, 2)
        if len(portfolio) >= 5:  # Max 5 stocks
            break

    total_invested = round(budget - remaining, 2)
    total_potential = round(sum(p["potential_gain"] for p in portfolio), 2)
    total_risk = round(sum(p["risk_amount"] for p in portfolio), 2)

    return jsonify({
        "budget": budget,
        "total_invested": total_invested,
        "remaining_cash": remaining,
        "total_potential_gain": total_potential,
        "total_risk": total_risk,
        "portfolio": portfolio,
        "last_updated": _cache["last_updated"],
    })

@app.route("/api/stock/<symbol>")
def single_stock(symbol):
    """Return detailed data for a single stock."""
    key = symbol.upper()
    with _cache_lock:
        data = _cache["stocks"].get(key)
    if not data:
        # Try live fetch
        data = fetch_stock_data(f"{key}.NS")
        if not data:
            return jsonify({"error": f"Stock {symbol} not found"}), 404
    return jsonify(data)

# ─── Entry Point ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  NIFTY 50 LIVE SCANNER  — Starting up")
    print("=" * 60)
    print("Pre-loading stock data (this may take ~60 seconds)...")

    # Initial load in main thread so API is ready when server starts
    refresh_cache()

    # Background refresh every 5 minutes
    t = threading.Thread(target=background_refresher, daemon=True)
    t.start()

    print("Server running on http://localhost:5000")
    app.run(debug=False, port=5000, threaded=True)