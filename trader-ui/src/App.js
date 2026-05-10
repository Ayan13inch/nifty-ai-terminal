import React, {
  useEffect,
  useState,
  useMemo
} from "react";

import axios from "axios";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const API_BASE =
  "https://nifty-ai-terminal.onrender.com";

const API_URL =
  `${API_BASE}/scan`;

const RECOMMEND_URL =
  `${API_BASE}/recommend`;

const TOTAL_ROWS = 10;

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const S = {

  page: {
    background: "#080f1e",
    minHeight: "100vh",
    color: "#e2e8f0",
    padding: 24,
    fontFamily: "Inter"
  },

  card: {
    background: "#0f172a",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    border: "1px solid #1e293b"
  },

  button: {
    padding: "10px 16px",
    border: "none",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer"
  },

  input: {
    flex: 1,
    padding: 12,
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#fff",
    fontSize: 15
  }
};

// ─────────────────────────────────────────────
// SIGNAL BADGE
// ─────────────────────────────────────────────
function SignalBadge({ signal }) {

  const cfg = {

    BUY: {
      bg: "#22c55e22",
      color: "#22c55e"
    },

    SELL: {
      bg: "#ef444422",
      color: "#ef4444"
    },

    HOLD: {
      bg: "#f59e0b22",
      color: "#f59e0b"
    }
  };

  const c = cfg[signal] || cfg.HOLD;

  return (

    <span
      style={{
        padding: "4px 10px",
        borderRadius: 6,
        background: c.bg,
        color: c.color,
        fontWeight: 700
      }}
    >
      {signal}
    </span>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App() {

  const [data, setData] = useState([]);

  const [filter, setFilter] = useState("ALL");

  const [investmentAmount,
    setInvestmentAmount] = useState("");

  const [recommendations,
    setRecommendations] = useState([]);

  const [summary,
    setSummary] = useState(null);

  const [loading,
    setLoading] = useState(false);

  // ─────────────────────────────────────────
  // FETCH STOCKS
  // ─────────────────────────────────────────
  const fetchStocks = async () => {

    try {

      const res =
        await axios.get(API_URL);

      setData(
        Array.isArray(res.data)
          ? res.data
          : []
      );

    } catch (err) {

      console.log(err);
    }
  };

  // ─────────────────────────────────────────
  // AUTO REFRESH
  // ─────────────────────────────────────────
  useEffect(() => {

    fetchStocks();

    const interval =
      setInterval(() => {

        fetchStocks();

      }, 15000);

    return () =>
      clearInterval(interval);

  }, []);

  // ─────────────────────────────────────────
  // FETCH RECOMMENDATIONS
  // ─────────────────────────────────────────
  const fetchRecommendations =
    async () => {

    if (!investmentAmount) {

      alert("Enter amount");

      return;
    }

    try {

      setLoading(true);

      const res =
        await axios.get(
          `${RECOMMEND_URL}/${investmentAmount}`
        );

      setRecommendations(
        res.data.recommendations || []
      );

      setSummary({

        invested:
          res.data.total_invested,

        remaining:
          res.data.remaining,

        capital:
          res.data.capital
      });

    } catch (err) {

      console.log(err);

      alert(
        "Recommendation fetch failed"
      );

    } finally {

      setLoading(false);
    }
  };

  // ─────────────────────────────────────────
  // FILTERED DATA
  // ─────────────────────────────────────────
  const displayRows =
    useMemo(() => {

    const filtered =
      filter === "ALL"
      ? data
      : data.filter(
          d => d.signal === filter
        );

    const rows = [...filtered];

    while (
      rows.length < TOTAL_ROWS
    ) {

      rows.push({
        _placeholder: true
      });
    }

    return rows;

  }, [data, filter]);

  // ─────────────────────────────────────────
  // MARKET PULSE
  // ─────────────────────────────────────────
  const buyCount =
    data.filter(
      d => d.signal === "BUY"
    ).length;

  const sellCount =
    data.filter(
      d => d.signal === "SELL"
    ).length;

  const marketBullish =
    buyCount > sellCount;

  // ─────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────
  return (

    <div style={S.page}>

      {/* HEADER */}
      <div style={S.card}>

        <h1>
          NIFTY AI TERMINAL
        </h1>

        <div
          style={{
            color:
              marketBullish
              ? "#22c55e"
              : "#ef4444",

            fontWeight: 700
          }}
        >
          {
            marketBullish
            ? "Bullish Momentum"
            : "Bearish Pressure"
          }
        </div>

      </div>

      {/* INVESTMENT */}
      <div style={S.card}>

        <h2>
          AI Investment Planner
        </h2>

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 16
          }}
        >

          <input
            type="number"
            placeholder="Enter amount in INR"

            value={investmentAmount}

            onChange={(e) =>
              setInvestmentAmount(
                e.target.value
              )
            }

            style={S.input}
          />

          <button

            onClick={
              fetchRecommendations
            }

            style={{
              ...S.button,
              background: "#22c55e",
              color: "#000"
            }}
          >

            {
              loading
              ? "Loading..."
              : "Find Stocks"
            }

          </button>

        </div>

      </div>

      {/* SUMMARY */}
      {
        summary && (

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3,1fr)",

              gap: 16,

              marginBottom: 20
            }}
          >

            <div style={S.card}>

              <div>
                Total Capital
              </div>

              <h2>
                ₹{summary.capital}
              </h2>

            </div>

            <div style={S.card}>

              <div>
                Total Invested
              </div>

              <h2
                style={{
                  color: "#22c55e"
                }}
              >
                ₹{summary.invested}
              </h2>

            </div>

            <div style={S.card}>

              <div>
                Residual Amount
              </div>

              <h2
                style={{
                  color: "#f59e0b"
                }}
              >
                ₹{summary.remaining}
              </h2>

            </div>

          </div>
        )
      }

      {/* RECOMMENDATIONS */}
      {
        recommendations.length > 0 && (

          <div style={S.card}>

            <h2>
              Recommended Stocks
            </h2>

            {
              recommendations.map(
                (r, i) => (

                <div

                  key={i}

                  style={{
                    padding: "18px 0",
                    borderBottom:
                      "1px solid #1e293b"
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between"
                    }}
                  >

                    <div>

                      <h3>
                        {r.stock}
                      </h3>

                      <div>
                        Qty: {r.qty}
                      </div>

                    </div>

                    <div
                      style={{
                        textAlign: "right"
                      }}
                    >

                      <h3
                        style={{
                          color: "#22c55e"
                        }}
                      >
                        ₹{r.invested}
                      </h3>

                      <div>
                        {r.confidence}% confidence
                      </div>

                    </div>

                  </div>

                  {/* TARGETS */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(4,1fr)",

                      gap: 12,

                      marginTop: 18
                    }}
                  >

                    <div style={S.card}>
                      <div>
                        Buy Price
                      </div>
                      <h3>
                        ₹{r.price}
                      </h3>
                    </div>

                    <div style={S.card}>
                      <div>
                        Sell Target
                      </div>
                      <h3
                        style={{
                          color: "#22c55e"
                        }}
                      >
                        ₹{r.target_price}
                      </h3>
                    </div>

                    <div style={S.card}>
                      <div>
                        Stop Loss
                      </div>
                      <h3
                        style={{
                          color: "#ef4444"
                        }}
                      >
                        ₹{r.stop_loss}
                      </h3>
                    </div>

                    <div style={S.card}>
                      <div>
                        Expected Profit
                      </div>
                      <h3
                        style={{
                          color: "#38bdf8"
                        }}
                      >
                        ₹{r.estimated_profit}
                      </h3>
                    </div>

                  </div>

                  {/* HOLD TYPE */}
                  <div
                    style={{
                      marginTop: 16,
                      display: "flex",
                      justifyContent:
                        "space-between"
                    }}
                  >

                    <div
                      style={{
                        background:
                          "#22c55e22",

                        color:
                          "#22c55e",

                        padding:
                          "6px 12px",

                        borderRadius: 20,

                        fontSize: 12,

                        fontWeight: 700
                      }}
                    >
                      {r.holding_type}
                    </div>

                    <div
                      style={{
                        color: "#94a3b8"
                      }}
                    >
                      Sell near +{r.target_pct}%
                    </div>

                  </div>

                </div>
              ))
            }

          </div>
        )
      }

      {/* FILTERS */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20
        }}
      >

        {
          ["ALL", "BUY", "SELL"]
          .map(f => (

            <button

              key={f}

              onClick={() =>
                setFilter(f)
              }

              style={{
                ...S.button,

                background:
                  filter === f
                  ? "#38bdf8"
                  : "#1e293b",

                color: "#fff"
              }}
            >
              {f}
            </button>
          ))
        }

      </div>

      {/* STOCK TABLE */}
      <div style={S.card}>

        <table
          width="100%"
          cellPadding="12"
        >

          <thead>

            <tr
              style={{
                color: "#64748b"
              }}
            >

              <th align="left">
                Stock
              </th>

              <th align="left">
                Price
              </th>

              <th align="left">
                Signal
              </th>

              <th align="left">
                Confidence
              </th>

              <th align="left">
                AI Score
              </th>

            </tr>

          </thead>

          <tbody>

            {
              displayRows.map(
                (item, i) => (

                item._placeholder

                ? (

                  <tr key={i}>
                    <td colSpan={5}>
                      —
                    </td>
                  </tr>

                )

                : (

                  <tr key={item.stock}>

                    <td>
                      {item.stock}
                    </td>

                    <td>
                      ₹{item.price}
                    </td>

                    <td>
                      <SignalBadge
                        signal={item.signal}
                      />
                    </td>

                    <td>
                      {item.confidence}%
                    </td>

                    <td
                      style={{
                        color: "#38bdf8",
                        fontWeight: 700
                      }}
                    >
                      {item.ai_score}
                    </td>

                  </tr>
                )
              ))
            }

          </tbody>

        </table>

      </div>

    </div>
  );
}