import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://nifty-ai-terminal.onrender.com/scan";

const styles = {
  page: {
    background: "#020817",
    minHeight: "100vh",
    color: "white",
    padding: 20,
    fontFamily: "Inter, sans-serif"
  },

  title: {
    fontSize: 34,
    fontWeight: 800,
    marginBottom: 20
  },

  cardRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 20,
    marginTop: 20,
    marginBottom: 30
  },

  card: {
    background: "#071226",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 24
  },

  label: {
    color: "#94a3b8",
    fontSize: 14,
    marginBottom: 8
  },

  value: {
    fontSize: 32,
    fontWeight: 800
  },

  inputRow: {
    display: "flex",
    gap: 16,
    marginBottom: 30
  },

  input: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "white",
    fontSize: 18
  },

  button: {
    padding: "18px 28px",
    borderRadius: 12,
    border: "none",
    background: "#22c55e",
    color: "black",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 16
  },

  stockCard: {
    background: "#071226",
    border: "1px solid #1e293b",
    borderRadius: 18,
    padding: 24,
    marginBottom: 20
  },

  stockTitle: {
    fontSize: 26,
    fontWeight: 800,
    marginBottom: 10
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 20,
    marginTop: 20
  },

  metricLabel: {
    color: "#94a3b8",
    fontSize: 13
  },

  metricValue: {
    fontSize: 24,
    fontWeight: 700,
    marginTop: 6
  }
};

export default function App() {
  const [stocks, setStocks] = useState([]);
  const [amount, setAmount] = useState(10000);

  const [invested, setInvested] = useState(0);
  const [residual, setResidual] = useState(0);

  const fetchStocks = async () => {
    try {
      const res = await axios.get(API_URL);

      const data = Array.isArray(res.data) ? res.data : [];

      const buyStocks = data
        .filter(
          (s) =>
            s &&
            s.signal === "BUY" &&
            s.price &&
            s.confidence >= 50
        )
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      if (buyStocks.length === 0) {
        setStocks([]);
        return;
      }

      const perStock = amount / buyStocks.length;

      let totalInvested = 0;

      const finalStocks = buyStocks.map((s) => {
        const qty = Math.floor(perStock / s.price);

        const investedAmount = qty * s.price;

        totalInvested += investedAmount;

        return {
          ...s,
          qty,
          investedAmount,
          target: (s.price * 1.05).toFixed(2),
          stoploss: (s.price * 0.97).toFixed(2),
          expectedProfit: (investedAmount * 0.05).toFixed(2)
        };
      });

      setInvested(totalInvested.toFixed(2));
      setResidual((amount - totalInvested).toFixed(2));

      setStocks(finalStocks);
    } catch (err) {
      console.log(err);
      alert("Backend not reachable");
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.title}>🚀 AI Investment Planner</div>

      <div style={styles.inputRow}>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          style={styles.input}
          placeholder="Enter Amount"
        />

        <button style={styles.button} onClick={fetchStocks}>
          Find Stocks
        </button>
      </div>

      <div style={styles.cardRow}>
        <div style={styles.card}>
          <div style={styles.label}>Total Capital</div>
          <div style={styles.value}>₹{amount}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Total Invested</div>
          <div style={{ ...styles.value, color: "#22c55e" }}>
            ₹{invested}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.label}>Residual Amount</div>
          <div style={{ ...styles.value, color: "#f59e0b" }}>
            ₹{residual}
          </div>
        </div>
      </div>

      {stocks.length === 0 ? (
        <div>No BUY opportunities found.</div>
      ) : (
        stocks.map((stock, index) => (
          <div key={index} style={styles.stockCard}>
            <div style={styles.stockTitle}>
              {stock.stock}
            </div>

            <div style={{ color: "#22c55e", fontWeight: 700 }}>
              {stock.signal} • {stock.confidence}% Confidence
            </div>

            <div style={styles.grid}>
              <div>
                <div style={styles.metricLabel}>Buy Price</div>
                <div style={styles.metricValue}>
                  ₹{stock.price}
                </div>
              </div>

              <div>
                <div style={styles.metricLabel}>Quantity</div>
                <div style={styles.metricValue}>
                  {stock.qty}
                </div>
              </div>

              <div>
                <div style={styles.metricLabel}>Invested</div>
                <div style={styles.metricValue}>
                  ₹{stock.investedAmount.toFixed(2)}
                </div>
              </div>

              <div>
                <div style={styles.metricLabel}>Sell Target</div>
                <div
                  style={{
                    ...styles.metricValue,
                    color: "#22c55e"
                  }}
                >
                  ₹{stock.target}
                </div>
              </div>

              <div>
                <div style={styles.metricLabel}>Stop Loss</div>
                <div
                  style={{
                    ...styles.metricValue,
                    color: "#ef4444"
                  }}
                >
                  ₹{stock.stoploss}
                </div>
              </div>

              <div>
                <div style={styles.metricLabel}>
                  Expected Profit
                </div>
                <div
                  style={{
                    ...styles.metricValue,
                    color: "#38bdf8"
                  }}
                >
                  ₹{stock.expectedProfit}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}