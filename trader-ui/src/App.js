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

  const [error, setError] =
    useState("");

  const fetchStocks = async () => {

    try {

      setLoading(true);

      setError("");

      const res = await axios.get(
        `${BACKEND}/recommend/${budget}`
      );

      console.log("API:", res.data);

      setData(res.data || {});

    } catch (e) {

      console.log(e);

      setError(
        "Backend fetch failed"
      );

    } finally {

      setLoading(false);
    }
  };

  const recommendations =
    data?.recommendations || [];

  return (

    <div style={styles.page}>

      <div style={styles.hero}>

        <h1 style={styles.title}>
          🚀 NIFTY AI TERMINAL
        </h1>

        <p style={styles.subtitle}>
          Live Nifty 50 Scanner
        </p>

        <div style={styles.inputRow}>

          <input

            type="number"

            value={budget}

            onChange={(e) =>
              setBudget(e.target.value)
            }

            style={styles.input}
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

      {error && (

        <div style={styles.error}>
          {error}
        </div>
      )}

      {data && (

        <div>

          <div style={styles.summaryGrid}>

            <SummaryCard
              title="Capital"
              value={`₹${data.capital || 0}`}
            />

            <SummaryCard
              title="Invested"
              value={`₹${data.invested || 0}`}
              color="#22c55e"
            />

            <SummaryCard
              title="Remaining"
              value={`₹${data.remaining || 0}`}
              color="#f59e0b"
            />

          </div>

          {recommendations.length === 0 ? (

            <div style={styles.empty}>
              No strong stocks found right now
            </div>

          ) : (

            recommendations.map(
              (stock, i) => (

                <div
                  key={i}
                  style={styles.stockCard}
                >

                  <div style={styles.stockTop}>

                    <div>

                      <h2 style={styles.stockName}>
                        {stock.stock || "-"}
                      </h2>

                      <div style={styles.buyBadge}>
                        {stock.signal || "BUY"}
                      </div>

                    </div>

                    <div style={styles.score}>
                      AI Score {stock.score || 0}
                    </div>

                  </div>

                  <div style={styles.metricGrid}>

                    <Metric
                      label="Price"
                      value={`₹${stock.price || 0}`}
                    />

                    <Metric
                      label="Qty"
                      value={stock.qty || 0}
                    />

                    <Metric
                      label="Invested"
                      value={`₹${stock.invested || 0}`}
                    />

                    <Metric
                      label="Target"
                      value={`₹${stock.target || 0}`}
                      color="#22c55e"
                    />

                    <Metric
                      label="Stop Loss"
                      value={`₹${stock.stop_loss || 0}`}
                      color="#ef4444"
                    />

                    <Metric
                      label="Expected Return"
                      value={`${stock.expected_return || 0}%`}
                      color="#38bdf8"
                    />

                  </div>

                  <div style={styles.sellBox}>
                    📌 {stock.sell_at || "-"}
                  </div>

                  <div style={styles.reasonRow}>

                    {(stock.reasons || []).map(
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

    fontSize: 50,

    fontWeight: 900,

    marginBottom: 10
  },

  subtitle: {

    color: "#94a3b8",

    marginBottom: 30,

    fontSize: 18
  },

  inputRow: {

    display: "flex",

    gap: 20,

    flexWrap: "wrap"
  },

  input: {

    padding: 18,

    width: 300,

    borderRadius: 16,

    border: "1px solid #334155",

    background: "#0f172a",

    color: "white",

    fontSize: 20
  },

  button: {

    padding: "18px 30px",

    border: "none",

    borderRadius: 16,

    background:
      "linear-gradient(to right,#22c55e,#16a34a)",

    color: "white",

    fontWeight: 800,

    fontSize: 18,

    cursor: "pointer"
  },

  error: {

    background: "#450a0a",

    padding: 20,

    borderRadius: 16,

    color: "#fecaca",

    marginBottom: 20
  },

  empty: {

    background: "#0f172a",

    padding: 30,

    borderRadius: 20,

    fontSize: 22
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

    borderRadius: 22,

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

    borderRadius: 24,

    border: "1px solid #1e293b",

    marginBottom: 25
  },

  stockTop: {

    display: "flex",

    justifyContent:
      "space-between",

    alignItems: "center",

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

    borderRadius: 12,

    background: "#22c55e22",

    color: "#22c55e",

    fontWeight: 700
  },

  score: {

    fontSize: 22,

    fontWeight: 900,

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

    fontWeight: 900
  },

  sellBox: {

    background: "#071226",

    padding: 18,

    borderRadius: 14,

    marginBottom: 20
  },

  reasonRow: {

    display: "flex",

    flexWrap: "wrap",

    gap: 10
  },

  reason: {

    background: "#1e293b",

    padding: "10px 14px",

    borderRadius: 12,

    color: "#cbd5e1"
  }
};