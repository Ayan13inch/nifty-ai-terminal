import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL =
  "https://nifty-ai-terminal.onrender.com";

export default function App() {

  const [amount, setAmount] = useState(10000);

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const fetchRecommendations = async () => {

    try {

      setLoading(true);

      setError("");

      const res = await axios.get(
        `${BACKEND_URL}/recommend/${amount}`
      );

      console.log("API RESPONSE:", res.data);

      setData(res.data || {});

    } catch (err) {

      console.log(err);

      setError("Backend fetch failed");

    } finally {

      setLoading(false);
    }
  };

  const recommendations =
    data?.recommendations || [];

  return (

    <div
      style={{
        background: "#020817",
        minHeight: "100vh",
        color: "white",
        padding: 30,
        fontFamily: "Arial"
      }}
    >

      <h1
        style={{
          fontSize: 40,
          marginBottom: 30
        }}
      >
        🚀 NIFTY AI INVESTMENT PLANNER
      </h1>

      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 30
        }}
      >

        <input
          type="number"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
          style={{
            padding: 18,
            fontSize: 20,
            borderRadius: 10,
            border: "1px solid #334155",
            background: "#0f172a",
            color: "white",
            width: 300
          }}
        />

        <button
          onClick={fetchRecommendations}
          style={{
            padding: "18px 28px",
            background: "#22c55e",
            border: "none",
            borderRadius: 10,
            fontWeight: "bold",
            fontSize: 18,
            cursor: "pointer"
          }}
        >
          {loading
            ? "Finding..."
            : "Find Stocks"}
        </button>
      </div>

      {error && (

        <div
          style={{
            background: "#450a0a",
            padding: 20,
            borderRadius: 12,
            marginBottom: 20,
            color: "#fca5a5"
          }}
        >
          {error}
        </div>
      )}

      {data && (

        <div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(250px,1fr))",
              gap: 20,
              marginBottom: 30
            }}
          >

            <Card
              title="Total Capital"
              value={`₹${data.capital || 0}`}
            />

            <Card
              title="Total Invested"
              value={`₹${data.total_invested || 0}`}
              color="#22c55e"
            />

            <Card
              title="Residual Amount"
              value={`₹${data.remaining || 0}`}
              color="#f59e0b"
            />

          </div>

          {recommendations.length === 0 ? (

            <div
              style={{
                background: "#071226",
                padding: 30,
                borderRadius: 16,
                fontSize: 22
              }}
            >
              No BUY opportunities found currently.
            </div>

          ) : (

            recommendations.map(
              (stock, index) => (

                <div
                  key={index}
                  style={{
                    background: "#071226",
                    padding: 25,
                    borderRadius: 18,
                    marginBottom: 20,
                    border:
                      "1px solid #1e293b"
                  }}
                >

                  <h2
                    style={{
                      fontSize: 32,
                      marginBottom: 10
                    }}
                  >
                    {stock.stock}
                  </h2>

                  <div
                    style={{
                      color: "#22c55e",
                      fontWeight: "bold",
                      marginBottom: 20
                    }}
                  >
                    BUY • Confidence{" "}
                    {stock.confidence || 0}%
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit,minmax(180px,1fr))",
                      gap: 20
                    }}
                  >

                    <Metric
                      label="Current Price"
                      value={`₹${stock.price || 0}`}
                    />

                    <Metric
                      label="Quantity"
                      value={stock.qty || 0}
                    />

                    <Metric
                      label="Invested"
                      value={`₹${stock.invested || 0}`}
                    />

                    <Metric
                      label="Target"
                      value={`₹${stock.target_price || 0}`}
                      color="#22c55e"
                    />

                    <Metric
                      label="Stop Loss"
                      value={`₹${stock.stop_loss || 0}`}
                      color="#ef4444"
                    />

                    <Metric
                      label="Expected Profit"
                      value={`₹${stock.estimated_profit || 0}`}
                      color="#38bdf8"
                    />

                  </div>
                </div>
              )
            )
          )}
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  color = "white"
}) {

  return (

    <div
      style={{
        background: "#071226",
        padding: 20,
        borderRadius: 16
      }}
    >

      <div
        style={{
          color: "#94a3b8",
          marginBottom: 10
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 34,
          fontWeight: "bold",
          color
        }}
      >
        {value}
      </div>

    </div>
  );
}

function Metric({
  label,
  value,
  color = "white"
}) {

  return (

    <div>

      <div
        style={{
          color: "#94a3b8",
          marginBottom: 8
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: "bold",
          color
        }}
      >
        {value}
      </div>

    </div>
  );
}