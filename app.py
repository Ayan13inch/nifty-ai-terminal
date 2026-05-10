from flask import Flask, jsonify
from flask_cors import CORS
import yfinance as yf
import ta
import pandas as pd
import numpy as np

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────
# NIFTY 50 STOCKS
# ─────────────────────────────────────────────
NIFTY50 = [

    "RELIANCE",
    "TCS",
    "HDFCBANK",
    "INFY",
    "ICICIBANK",
    "HINDUNILVR",
    "ITC",
    "SBIN",
    "BHARTIARTL",
    "KOTAKBANK",
    "LT",
    "AXISBANK",
    "WIPRO",
    "ASIANPAINT",
    "MARUTI",
    "SUNPHARMA",
    "TITAN",
    "NTPC",
    "BAJFINANCE",
    "ULTRACEMCO"
]

# ─────────────────────────────────────────────
# INDICATORS
# ─────────────────────────────────────────────
def add_indicators(df):

    close = df["Close"]

    df["ema9"] = ta.trend.ema_indicator(
        close,
        window=9
    )

    df["ema21"] = ta.trend.ema_indicator(
        close,
        window=21
    )

    df["rsi"] = ta.momentum.rsi(
        close,
        window=14
    )

    macd = ta.trend.MACD(close)

    df["macd"] = macd.macd_diff()

    bb = ta.volatility.BollingerBands(close)

    df["bb"] = bb.bollinger_pband()

    return df

# ─────────────────────────────────────────────
# SCORE ENGINE
# ─────────────────────────────────────────────
def calculate_score(df):

    df = add_indicators(df)

    last = df.iloc[-1]

    score = 0

    reasons = []

    # EMA
    if last["ema9"] > last["ema21"]:

        score += 25

        reasons.append(
            "EMA bullish crossover"
        )

    # RSI
    if 45 <= last["rsi"] <= 70:

        score += 25

        reasons.append(
            f"RSI healthy ({round(last['rsi'],1)})"
        )

    # MACD
    if last["macd"] > 0:

        score += 25

        reasons.append(
            "MACD positive"
        )

    # Bollinger
    if last["bb"] < 0.9:

        score += 25

        reasons.append(
            "Good Bollinger position"
        )

    signal = (

        "BUY"

        if score >= 50

        else "HOLD"
    )

    return {

        "score": score,

        "signal": signal,

        "reasons": reasons,

        "rsi": round(
            float(last["rsi"]),
            1
        )
    }

# ─────────────────────────────────────────────
# LIVE SCAN
# ─────────────────────────────────────────────
def scan_market():

    results = []

    for symbol in NIFTY50:

        try:

            stock = yf.Ticker(
                symbol + ".NS"
            )

            df = stock.history(

                period="5d",

                interval="15m"
            )

            if len(df) < 50:
                continue

            score_data = calculate_score(df)

            current_price = round(
                float(df["Close"].iloc[-1]),
                2
            )

            target = round(
                current_price * 1.05,
                2
            )

            stop_loss = round(
                current_price * 0.97,
                2
            )

            expected_return = round(
                (
                    (
                        target
                        -
                        current_price
                    )
                    /
                    current_price
                ) * 100,
                1
            )

            results.append({

                "stock": symbol,

                "price": current_price,

                "score": score_data["score"],

                "signal": score_data["signal"],

                "rsi": score_data["rsi"],

                "target": target,

                "stop_loss": stop_loss,

                "expected_return": expected_return,

                "reasons": score_data["reasons"]
            })

        except Exception as e:

            print(symbol, e)

    results = sorted(

        results,

        key=lambda x: x["score"],

        reverse=True
    )

    return results

# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────
@app.route("/health")
def health():

    return jsonify({

        "status": "ok"
    })

@app.route("/scan")
def scan():

    return jsonify(
        scan_market()
    )

@app.route("/recommend/<int:budget>")
def recommend(budget):

    stocks = scan_market()[:5]

    if not stocks:

        return jsonify({

            "capital": budget,

            "recommendations": []
        })

    allocation = budget / len(stocks)

    recommendations = []

    total_invested = 0

    for stock in stocks:

        qty = int(
            allocation //
            stock["price"]
        )

        invested = round(
            qty * stock["price"],
            2
        )

        total_invested += invested

        recommendations.append({

            "stock": stock["stock"],

            "price": stock["price"],

            "qty": qty,

            "invested": invested,

            "signal": stock["signal"],

            "score": stock["score"],

            "target": stock["target"],

            "stop_loss": stock["stop_loss"],

            "expected_return": stock["expected_return"],

            "sell_at": (
                f"Sell near ₹{stock['target']} "
                f"or exit below ₹{stock['stop_loss']}"
            ),

            "reasons": stock["reasons"]
        })

    return jsonify({

        "capital": budget,

        "invested": round(
            total_invested,
            2
        ),

        "remaining": round(
            budget - total_invested,
            2
        ),

        "recommendations": recommendations
    })

# ─────────────────────────────────────────────
# START
# ─────────────────────────────────────────────
if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000
    )