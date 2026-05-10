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
# NIFTY STOCKS
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
        "MARUTI",
        "SUNPHARMA",
        "TITAN",
        "ULTRACEMCO",
        "BAJFINANCE",
        "NTPC"
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
# SIGNAL ENGINE
# ─────────────────────────────────────────────
def generate_signal(df):

    df = compute_indicators(df)

    last = df.iloc[-1]

    score = 0

    reasons = []

    # EMA
    if last["ema9"] > last["ema21"]:

        score += 1

        reasons.append(
            "EMA Bullish"
        )

    # RSI
    if 40 < last["rsi"] < 75:

        score += 1

        reasons.append(
            f"RSI Healthy ({last['rsi']:.1f})"
        )

    # MACD
    if last["macd_hist"] > 0:

        score += 1

        reasons.append(
            "MACD Positive"
        )

    # BB
    if last["bb_pct"] < 0.9:

        score += 1

        reasons.append(
            "Good Bollinger Position"
        )

    # FINAL SIGNAL
    signal = (

        "BUY"

        if score >= 2

        else "SELL"
    )

    confidence = round(
        (score / 4) * 100
    )

    return (

        signal,

        confidence,

        {
            "rsi": round(
                float(last["rsi"]),
                1
            ),

            "bb_pct": round(
                float(last["bb_pct"]) * 100,
                1
            )
        },

        reasons
    )

# ─────────────────────────────────────────────
# STOCK SCANNER
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

                "price": round(
                    price,
                    2
                ),

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
# HEALTH
# ─────────────────────────────────────────────
@app.route("/health")
def health():

    return jsonify({

        "status": "ok"
    })

# ─────────────────────────────────────────────
# LIVE SCAN
# ─────────────────────────────────────────────
@app.route("/scan")
def scan():

    results = scan_stocks()

    return jsonify(results)

# ─────────────────────────────────────────────
# AI RECOMMENDATIONS
# ─────────────────────────────────────────────
@app.route("/recommend/<int:amount>")
def recommend(amount):

    stocks = scan_stocks()

    if not stocks:

        return jsonify({

            "capital": amount,

            "total_invested": 0,

            "remaining": amount,

            "recommendations": []
        })

    # ALWAYS TAKE TOP STOCKS
    top_stocks = sorted(

        stocks,

        key=lambda x: x["ai_score"],

        reverse=True

    )[:5]

    allocation_per_stock = (
        amount / len(top_stocks)
    )

    recommendations = []

    total_invested = 0

    for stock in top_stocks:

        qty = int(

            allocation_per_stock
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

        sell_reason = (

            f"Sell near ₹{target_price} "
            f"or below ₹{stop_loss}"
        )

        recommendations.append({

            "stock": stock["stock"],

            "signal": stock["signal"],

            "price": stock["price"],

            "qty": qty,

            "invested": invested,

            "confidence": stock["confidence"],

            "ai_score": stock["ai_score"],

            "target_price": target_price,

            "stop_loss": stop_loss,

            "estimated_profit": estimated_profit,

            "sell_reason": sell_reason,

            "reasons": stock["reasons"]
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
# START
# ─────────────────────────────────────────────
if __name__ == "__main__":

    app.run(

        host="0.0.0.0",

        port=5000
    )