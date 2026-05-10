# app.py

from flask import Flask, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import requests
import yfinance as yf
import ta
import pandas as pd
import os

# ────────────────────────────────────────────────────────────
# FLASK SETUP
# ────────────────────────────────────────────────────────────
app = Flask(__name__)

CORS(app)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    ping_timeout=10,
    ping_interval=5,
    async_mode='eventlet'
)

SECRET_TOKEN = "my-secret-token-12345"

# ────────────────────────────────────────────────────────────
# SOCKET AUTH
# ────────────────────────────────────────────────────────────
@socketio.on('connect')
def handle_connect(auth):

    if auth and auth.get('token') == SECRET_TOKEN:

        print("✅ Client authenticated")

        emit(
            'status',
            {'status': 'authenticated'}
        )

    else:

        print("❌ Authentication failed")

        return False


@socketio.on('disconnect')
def handle_disconnect():

    print("Client disconnected")


# ────────────────────────────────────────────────────────────
# TELEGRAM ALERTS
# ────────────────────────────────────────────────────────────
BOT_TOKEN = os.getenv(
    "TELEGRAM_BOT_TOKEN",
    "YOUR_BOT_TOKEN"
)

CHAT_ID = os.getenv(
    "TELEGRAM_CHAT_ID",
    "YOUR_CHAT_ID"
)


def send_telegram(msg):

    if BOT_TOKEN == "YOUR_BOT_TOKEN":
        return

    try:

        url = (
            f"https://api.telegram.org/bot"
            f"{BOT_TOKEN}/sendMessage"
        )

        requests.post(
            url,
            data={
                "chat_id": CHAT_ID,
                "text": msg
            },
            timeout=5
        )

    except:
        pass


# ────────────────────────────────────────────────────────────
# NIFTY STOCKS
# ────────────────────────────────────────────────────────────
def get_nifty50_stocks():

    return [

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
        "MARUTI"
    ]


# ────────────────────────────────────────────────────────────
# INDICATORS
# ────────────────────────────────────────────────────────────
def compute_indicators(df):

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

    df["macd_hist"] = macd.macd_diff()

    bb = ta.volatility.BollingerBands(close)

    df["bb_pct"] = bb.bollinger_pband()

    return df


# ────────────────────────────────────────────────────────────
# SIGNAL GENERATION
# ────────────────────────────────────────────────────────────
def generate_signal(df):

    df = compute_indicators(df)

    last = df.iloc[-1]

    score = 0

    reasons = []

    if last["ema9"] > last["ema21"]:

        score += 1

        reasons.append("EMA Bullish")

    if 40 < last["rsi"] < 70:

        score += 1

        reasons.append(
            f"RSI Healthy ({last['rsi']:.1f})"
        )

    if last["macd_hist"] > 0:

        score += 1

        reasons.append("MACD Positive")

    if last["bb_pct"] < 0.8:

        score += 1

        reasons.append("Below BB Upper Band")

    signal = (
        "BUY"
        if score >= 3
        else "SELL"
    )

    confidence = min(
        100,
        round((score / 4) * 100)
    )

    return (

        signal,

        confidence,

        {
            "rsi": round(float(last["rsi"]), 1),
            "bb_pct": round(
                float(last["bb_pct"]) * 100,
                1
            )
        },

        reasons
    )


# ────────────────────────────────────────────────────────────
# STOCK SCANNER
# ────────────────────────────────────────────────────────────
def scan_stocks():

    symbols = get_nifty50_stocks()

    results = []

    for symbol in symbols:

        try:

            stock = yf.Ticker(
                symbol + ".NS"
            )

            df = stock.history(
                period="5d",
                interval="5m"
            )

            if df.empty or len(df) < 30:
                continue

            (
                signal,
                confidence,
                indicators,
                reasons
            ) = generate_signal(df)

            price = float(
                df["Close"].iloc[-1]
            )

            ai_score = round(
                (
                    confidence
                    +
                    indicators["rsi"]
                ) / 2,
                1
            )

            results.append({

                "stock": symbol,

                "price": round(price, 2),

                "signal": signal,

                "confidence": confidence,

                "ai_score": ai_score,

                "indicators": indicators,

                "reasons": reasons,

                "empty": False
            })

        except Exception as e:

            print(
                f"Error scanning {symbol}: {e}"
            )

            continue

    while len(results) < 10:

        results.append({

            "stock": "—",

            "price": 0,

            "signal": "HOLD",

            "confidence": 0,

            "ai_score": 0,

            "indicators": {},

            "reasons": [],

            "empty": True
        })

    return results[:10]


# ────────────────────────────────────────────────────────────
# RECOMMENDATION ENGINE
# ────────────────────────────────────────────────────────────
@app.route("/recommend/<int:amount>")
def recommend(amount):

    stocks = scan_stocks()

    buy_stocks = [

        s for s in stocks

        if s["signal"] == "BUY"

        and not s["empty"]
    ]

    buy_stocks = sorted(

        buy_stocks,

        key=lambda x: x["ai_score"],

        reverse=True
    )

    if not buy_stocks:

        return jsonify({

            "capital": amount,

            "total_invested": 0,

            "remaining": amount,

            "recommendations": []
        })

    total_score = sum(
        s["ai_score"]
        for s in buy_stocks
    )

    recommendations = []

    total_invested = 0

    remaining = amount

    for stock in buy_stocks[:5]:

        allocation = (
            stock["ai_score"]
            /
            total_score
        )

        allocated_capital = (
            amount * allocation
        )

        qty = int(
            allocated_capital
            //
            stock["price"]
        )

        if qty <= 0:
            continue

        invested = round(
            qty * stock["price"],
            2
        )

        total_invested += invested

        remaining -= invested

        target_pct = round(
            4 + (
                stock["confidence"] / 50
            ),
            1
        )

        target_price = round(
            stock["price"]
            *
            (1 + target_pct / 100),
            2
        )

        stop_loss = round(
            stock["price"] * 0.97,
            2
        )

        estimated_profit = round(
            (
                target_price
                -
                stock["price"]
            ) * qty,
            2
        )

        holding_type = (

            "Swing Trade"

            if stock["confidence"] >= 75

            else "Quick Momentum"
        )

        recommendations.append({

            "stock": stock["stock"],

            "price": stock["price"],

            "qty": qty,

            "invested": invested,

            "confidence": stock["confidence"],

            "ai_score": stock["ai_score"],

            "target_price": target_price,

            "stop_loss": stop_loss,

            "estimated_profit": estimated_profit,

            "target_pct": target_pct,

            "holding_type": holding_type
        })

    return jsonify({

        "capital": amount,

        "total_invested": round(
            total_invested,
            2
        ),

        "remaining": round(
            remaining,
            2
        ),

        "recommendations": recommendations
    })


# ────────────────────────────────────────────────────────────
# SOCKET EVENT
# ────────────────────────────────────────────────────────────
@socketio.on('manual_scan')
def handle_scan():

    results = scan_stocks()

    emit(
        'scan_update',
        results,
        broadcast=True
    )


# ────────────────────────────────────────────────────────────
# ROUTES
# ────────────────────────────────────────────────────────────
@app.route("/scan")
def scan():

    return jsonify(
        scan_stocks()
    )


@app.route("/health")
def health():

    return jsonify({

        "status": "ok",

        "socket": "active"
    })


# ────────────────────────────────────────────────────────────
# START SERVER
# ────────────────────────────────────────────────────────────
if __name__ == "__main__":

    print(
        "🚀 Starting Flask + Socket.IO Server..."
    )

    socketio.run(

        app,

        host='0.0.0.0',

        port=5000,

        debug=True,

        allow_unsafe_werkzeug=True
    )