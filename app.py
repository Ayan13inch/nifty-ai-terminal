from flask import Flask, jsonify
from flask_cors import CORS
import yfinance as yf
import ta
import requests
import os

# ─────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────
app = Flask(__name__)

CORS(app)

# ─────────────────────────────────────────────
# TELEGRAM
# ─────────────────────────────────────────────
BOT_TOKEN = os.getenv(
    "TELEGRAM_BOT_TOKEN",
    ""
)

CHAT_ID = os.getenv(
    "TELEGRAM_CHAT_ID",
    ""
)

def send_telegram(msg):

    if not BOT_TOKEN or not CHAT_ID:
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

# ─────────────────────────────────────────────
# STOCKS
# ─────────────────────────────────────────────
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

# ─────────────────────────────────────────────
# INDICATORS
# ─────────────────────────────────────────────
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

# ─────────────────────────────────────────────
# SIGNAL LOGIC
# ─────────────────────────────────────────────
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

# ─────────────────────────────────────────────
# SCANNER
# ─────────────────────────────────────────────
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

                "reasons": reasons
            })

        except Exception as e:

            print(
                f"Error scanning {symbol}: {e}"
            )

    return results

# ─────────────────────────────────────────────
# SCAN API
# ─────────────────────────────────────────────
@app.route("/scan")
def scan():

    return jsonify(
        scan_stocks()
    )

# ─────────────────────────────────────────────
# RECOMMENDATION API
# ─────────────────────────────────────────────
@app.route("/recommend/<int:amount>")
def recommend(amount):

    stocks = scan_stocks()

    buy_stocks = [

        s for s in stocks

        if s["signal"] == "BUY"
    ]

    buy_stocks = sorted(

        buy_stocks,

        key=lambda x: x["ai_score"],

        reverse=True
    )[:5]

    if not buy_stocks:

        return jsonify({

            "capital": amount,

            "total_invested": 0,

            "remaining": amount,

            "recommendations": []
        })

    allocation = amount / len(buy_stocks)

    recommendations = []

    total_invested = 0

    for stock in buy_stocks:

        qty = int(
            allocation //
            stock["price"]
        )

        invested = round(
            qty * stock["price"],
            2
        )

        total_invested += invested

        target_price = round(
            stock["price"] * 1.05,
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

        recommendations.append({

            "stock": stock["stock"],

            "price": stock["price"],

            "qty": qty,

            "invested": invested,

            "confidence": stock["confidence"],

            "target_price": target_price,

            "stop_loss": stop_loss,

            "estimated_profit": estimated_profit
        })

    return jsonify({

        "capital": amount,

        "total_invested": round(
            total_invested,
            2
        ),

        "remaining": round(
            amount - total_invested,
            2
        ),

        "recommendations": recommendations
    })

# ─────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────
@app.route("/health")
def health():

    return jsonify({

        "status": "ok"
    })

# ─────────────────────────────────────────────
# START
# ─────────────────────────────────────────────
if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000
    )