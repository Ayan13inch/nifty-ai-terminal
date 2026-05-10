import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL =
  "https://nifty-ai-terminal.onrender.com";

export default function App() {

  const [amount, setAmount] = useState(10000);

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(false);

  const fetchRecommendations = async () => {

    try {

      setLoading(true);

      const res = await axios.get(
        `${BACKEND_URL}/recommend/${amount}`
      );

      console.log(res.data);

      setData(res.data);

    } catch (err) {

      console.log(err);

      alert("Backend fetch failed");

    } finally {

      setLoading(false);
    }
  };

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
          placeholder="Enter Amount"
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

      {data && (

        <div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3,1fr)",
              gap: 20,
              marginBottom: 30
            }}
          >

            <div
              style={{
                background: "#071226",
                padding: 20,
                borderRadius: 16
              }}
            >
              <div>Total Capital</div>

              <h1>
                ₹{data.capital}
              </h1>
            </div>

            <div
              style={{
                background: "#071226",
                padding: 20,
                borderRadius: 16
              }}
            >
              <div>Total Invested</div>

              <h1
                style={{
                  color: "#22c55e"
                }}
              >
                ₹{data.total_invested}
              </h1>
            </div>

            <div
              style={{
                background: "#071226",
                padding: 20,
                borderRadius: 16
              }}
            >
              <div>Residual Amount</div>

              <h1
                style={{
                  color: "#f59e0b"
                }}
              >
                ₹{data.remaining}
              </h1>
            </div>
          </div>

          {data.recommendations.length === 0 ? (

            <div
              style={{
                fontSize: 24
              }}
            >
              No BUY opportunities right now
            </div>

          ) : (

            data.recommendations.map(
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
                    {stock.confidence}%
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
                      value={`₹${stock.price}`}
                    />

                    <Metric
                      label="Quantity"
                      value={stock.qty}
                    />

                    <Metric
                      label="Invested"
                      value={`₹${stock.invested}`}
                    />

                    <Metric
                      label="Target"
                      value={`₹${stock.target_price}`}
                      color="#22c55e"
                    />

                    <Metric
                      label="Stop Loss"
                      value={`₹${stock.stop_loss}`}
                      color="#ef4444"
                    />

                    <Metric
                      label="Expected Profit"
                      value={`₹${stock.estimated_profit}`}
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