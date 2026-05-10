import React, { useState } from "react";
import axios from "axios";

const BACKEND =
  "https://nifty-ai-terminal.onrender.com";

export default function App() {

  const [budget, setBudget] =
    useState(100000);

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const fetchStocks = async () => {

    try {

      setLoading(true);

      const res = await axios.get(

        `${BACKEND}/recommend/${budget}`
      );

      setData(res.data);

    } catch (e) {

      console.log(e);

      alert("Backend Error");

    } finally {

      setLoading(false);
    }
  };

  return (

    <div style={styles.page}>

      <div style={styles.hero}>

        <h1 style={styles.title}>
          🚀 NIFTY AI TERMINAL
        </h1>

        <p style={styles.subtitle}>
          Live Nifty 50 AI Scanner
        </p>

        <div style={styles.inputRow}>

          <input

            type="number"

            value={budget}

            onChange={(e) =>
              setBudget(e.target.value)
            }

            style={styles.input}

            placeholder="Enter INR Budget"
          />

          <button

            onClick={fetchStocks}

            style={styles.button}
          >
            {loading
              ? "Scanning..."
              : "Find Stocks"}
          </button>

        </div>
      </div>

      {data && (

        <div>

          <div style={styles.summaryGrid}>

            <SummaryCard
              title="Capital"
              value={`₹${data.capital}`}
            />

            <SummaryCard
              title="Invested"
              value={`₹${data.invested}`}
              color="#22c55e"
            />

            <SummaryCard
              title="Remaining"
              value={`₹${data.remaining}`}
              color="#f59e0b"
            />

          </div>

          {data.recommendations.map(
            (stock, i) => (

              <div
                key={i}
                style={styles.stockCard}
              >

                <div style={styles.stockTop}>

                  <div>

                    <h2 style={styles.stockName}>
                      {stock.stock}
                    </h2>

                    <div style={styles.buyBadge}>
                      {stock.signal}
                    </div>

                  </div>

                  <div style={styles.score}>
                    AI Score {stock.score}
                  </div>

                </div>

                <div style={styles.metricGrid}>

                  <Metric
                    label="Price"
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
                    value={`₹${stock.target}`}
                    color="#22c55e"
                  />

                  <Metric
                    label="Stop Loss"
                    value={`₹${stock.stop_loss}`}
                    color="#ef4444"
                  />

                  <Metric
                    label="Expected Return"
                    value={`${stock.expected_return}%`}
                    color="#38bdf8"
                  />

                </div>

                <div style={styles.sellBox}>
                  📌 {stock.sell_at}
                </div>

                <div style={styles.reasonRow}>

                  {stock.reasons.map(
                    (r, idx) => (

                      <div
                        key={idx}
                        style={styles.reason}
                      >
                        {r}
                      </div>
                    )
                  )}

                </div>
              </div>
            )
          )}

        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  color = "white"
}) {

  return (

    <div style={styles.summaryCard}>

      <div style={styles.summaryTitle}>
        {title}
      </div>

      <div
        style={{
          ...styles.summaryValue,
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

      <div style={styles.metricLabel}>
        {label}
      </div>

      <div
        style={{
          ...styles.metricValue,
          color
        }}
      >
        {value}
      </div>

    </div>
  );
}

const styles = {

  page: {

    background:
      "linear-gradient(to bottom,#020617,#0f172a)",

    minHeight: "100vh",

    color: "white",

    padding: 30,

    fontFamily: "Inter"
  },

  hero: {

    marginBottom: 40
  },

  title: {

    fontSize: 48,

    fontWeight: 900,

    marginBottom: 10
  },

  subtitle: {

    color: "#94a3b8",

    marginBottom: 30
  },

  inputRow: {

    display: "flex",

    gap: 20
  },

  input: {

    padding: 18,

    width: 300,

    borderRadius: 14,

    border: "1px solid #334155",

    background: "#0f172a",

    color: "white",

    fontSize: 20
  },

  button: {

    padding: "18px 30px",

    border: "none",

    borderRadius: 14,

    background:
      "linear-gradient(to right,#22c55e,#16a34a)",

    color: "white",

    fontWeight: 700,

    fontSize: 18,

    cursor: "pointer"
  },

  summaryGrid: {

    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit,minmax(250px,1fr))",

    gap: 20,

    marginBottom: 30
  },

  summaryCard: {

    background: "#0f172a",

    padding: 25,

    borderRadius: 20,

    border: "1px solid #1e293b"
  },

  summaryTitle: {

    color: "#94a3b8",

    marginBottom: 10
  },

  summaryValue: {

    fontSize: 38,

    fontWeight: 900
  },

  stockCard: {

    background: "#0f172a",

    padding: 30,

    borderRadius: 22,

    border: "1px solid #1e293b",

    marginBottom: 25
  },

  stockTop: {

    display: "flex",

    justifyContent:
      "space-between",

    marginBottom: 25
  },

  stockName: {

    fontSize: 34,

    fontWeight: 900
  },

  buyBadge: {

    marginTop: 10,

    display: "inline-block",

    padding: "8px 16px",

    borderRadius: 10,

    background: "#22c55e22",

    color: "#22c55e",

    fontWeight: 700
  },

  score: {

    fontSize: 22,

    fontWeight: 800,

    color: "#38bdf8"
  },

  metricGrid: {

    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",

    gap: 25,

    marginBottom: 25
  },

  metricLabel: {

    color: "#94a3b8",

    marginBottom: 8
  },

  metricValue: {

    fontSize: 28,

    fontWeight: 800
  },

  sellBox: {

    background: "#071226",

    padding: 18,

    borderRadius: 14,

    marginBottom: 20,

    color: "#f8fafc"
  },

  reasonRow: {

    display: "flex",

    flexWrap: "wrap",

    gap: 10
  },

  reason: {

    background: "#1e293b",

    padding: "10px 14px",

    borderRadius: 10,

    color: "#cbd5e1"
  }
};