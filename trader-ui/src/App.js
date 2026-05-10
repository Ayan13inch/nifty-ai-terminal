// App.js

import React, {
  useEffect,
  useState,
  useRef,
  useMemo
} from "react";

import axios from "axios";
import io from "socket.io-client";

// ─── CONFIG ────────────────────────────────────────────────
const API_URL = "http://127.0.0.1:5000/scan";
const RECOMMEND_URL = "http://127.0.0.1:5000/recommend";
const AUTH_TOKEN = "my-secret-token-12345";
const TOTAL_ROWS = 10;

const socket = io(
  "http://127.0.0.1:5000",
  {
    auth: {
      token: AUTH_TOKEN
    }
  }
);

// ─── STYLES ────────────────────────────────────────────────
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

// ─── SIGNAL BADGE ──────────────────────────────────────────
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

// ─── MAIN APP ──────────────────────────────────────────────
export default function App() {

  const [data, setData] = useState([]);

  const [filter, setFilter] = useState("ALL");

  const [isConnected, setIsConnected] = useState(false);

  const [investmentAmount, setInvestmentAmount] = useState("");

  const [recommendations, setRecommendations] = useState([]);

  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(false);

  const [flashStocks, setFlashStocks] = useState({});

  const prevDataRef = useRef([]);

  // ─── SOCKET CONNECTION ──────────────────────────────────
  useEffect(() => {

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("scan_update", (newData) => {

      newData.forEach((item) => {

        const old = prevDataRef.current.find(
          p => p.stock === item.stock
        );

        if (
          old &&
          old.signal !== item.signal
        ) {

          setFlashStocks(prev => ({
            ...prev,
            [item.stock]: true
          }));

          setTimeout(() => {

            setFlashStocks(prev => ({
              ...prev,
              [item.stock]: false
            }));

          }, 1200);
        }
      });

      prevDataRef.current = newData;

      setData(newData);
    });

    axios.get(API_URL)
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        console.log(err);
      });

    return () => {

      socket.off("connect");
      socket.off("disconnect");
      socket.off("scan_update");
    };

  }, []);

  // ─── FETCH RECOMMENDATIONS ──────────────────────────────
  const fetchRecommendations = async () => {

    if (!investmentAmount) {
      alert("Enter amount");
      return;
    }

    try {

      setLoading(true);

      const res = await axios.get(
        `${RECOMMEND_URL}/${investmentAmount}`
      );

      setRecommendations(
        res.data.recommendations || []
      );

      setSummary({
        invested: res.data.total_invested,
        remaining: res.data.remaining,
        capital: res.data.capital
      });

    } catch (err) {

      console.log(err);

      alert(
        "Recommendation API failed.\nCheck backend terminal."
      );

    } finally {

      setLoading(false);
    }
  };

  // ─── FILTERED DATA ──────────────────────────────────────
  const displayRows = useMemo(() => {

    const filtered = (
      filter === "ALL"
        ? data
        : data.filter(
            d => d.signal === filter
          )
    );

    const rows = [...filtered];

    while (rows.length < TOTAL_ROWS) {

      rows.push({
        _placeholder: true
      });
    }

    return rows;

  }, [data, filter]);

  // ─── MARKET PULSE ───────────────────────────────────────
  const buyCount = data.filter(
    d => d.signal === "BUY"
  ).length;

  const sellCount = data.filter(
    d => d.signal === "SELL"
  ).length;

  const marketBullish =
    buyCount > sellCount;

  // ─── UI ─────────────────────────────────────────────────
  return (

    <div style={S.page}>

      <h1>
        NIFTY 50 AI TERMINAL
        {" "}
        <span style={{
          color: isConnected
            ? "#22c55e"
            : "#ef4444"
        }}>
          ●
        </span>
      </h1>

      {/* MARKET PULSE */}
      <div style={S.card}>

        <h3>
          Market Pulse
        </h3>

        <div style={{
          color: marketBullish
            ? "#22c55e"
            : "#ef4444",
          fontWeight: 700
        }}>
          {
            marketBullish
              ? "Bullish Momentum"
              : "Bearish Pressure"
          }
        </div>

      </div>

      {/* INVESTMENT PLANNER */}
      <div style={S.card}>

        <h2 style={{
          marginBottom: 16
        }}>
          AI Investment Planner
        </h2>

        <div style={{
          display: "flex",
          gap: 12
        }}>

          <input
            type="number"
            placeholder="Enter investment amount in INR"
            value={investmentAmount}
            onChange={(e) =>
              setInvestmentAmount(
                e.target.value
              )
            }
            style={S.input}
          />

          <button
            onClick={fetchRecommendations}
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

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 16,
            marginBottom: 20
          }}>

            <div style={S.card}>
              <div style={{
                color: "#64748b",
                marginBottom: 6
              }}>
                Total Capital
              </div>

              <div style={{
                fontSize: 24,
                fontWeight: 700
              }}>
                ₹{summary.capital}
              </div>
            </div>

            <div style={S.card}>
              <div style={{
                color: "#64748b",
                marginBottom: 6
              }}>
                Total Invested
              </div>

              <div style={{
                color: "#22c55e",
                fontSize: 24,
                fontWeight: 700
              }}>
                ₹{summary.invested}
              </div>
            </div>

            <div style={S.card}>
              <div style={{
                color: "#64748b",
                marginBottom: 6
              }}>
                Residual Amount
              </div>

              <div style={{
                color: "#f59e0b",
                fontSize: 24,
                fontWeight: 700
              }}>
                ₹{summary.remaining}
              </div>
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
              recommendations.map((r, i) => (

                <div
                  key={i}
                  style={{
                    padding: "18px 0",
                    borderBottom: "1px solid #1e293b"
                  }}
                >

                  <div style={{
                    display: "flex",
                    justifyContent: "space-between"
                  }}>

                    <div>

                      <div style={{
                        fontWeight: 700,
                        fontSize: 18
                      }}>
                        {r.stock}
                      </div>

                      <div style={{
                        color: "#64748b",
                        marginTop: 4
                      }}>
                        Qty: {r.qty}
                      </div>

                    </div>

                    <div style={{
                      textAlign: "right"
                    }}>

                      <div style={{
                        color: "#22c55e",
                        fontWeight: 700,
                        fontSize: 18
                      }}>
                        ₹{r.invested}
                      </div>

                      <div style={{
                        color: "#64748b",
                        fontSize: 12
                      }}>
                        {r.confidence}% confidence
                      </div>

                    </div>

                  </div>

                  {/* TARGETS */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 12,
                    marginTop: 18
                  }}>

                    <div style={{
                      background: "#111827",
                      padding: 12,
                      borderRadius: 10
                    }}>

                      <div style={{
                        color: "#64748b",
                        fontSize: 11
                      }}>
                        Buy Price
                      </div>

                      <div style={{
                        fontWeight: 700
                      }}>
                        ₹{r.price}
                      </div>

                    </div>

                    <div style={{
                      background: "#111827",
                      padding: 12,
                      borderRadius: 10
                    }}>

                      <div style={{
                        color: "#64748b",
                        fontSize: 11
                      }}>
                        Sell Target
                      </div>

                      <div style={{
                        color: "#22c55e",
                        fontWeight: 700
                      }}>
                        ₹{r.target_price}
                      </div>

                    </div>

                    <div style={{
                      background: "#111827",
                      padding: 12,
                      borderRadius: 10
                    }}>

                      <div style={{
                        color: "#64748b",
                        fontSize: 11
                      }}>
                        Stop Loss
                      </div>

                      <div style={{
                        color: "#ef4444",
                        fontWeight: 700
                      }}>
                        ₹{r.stop_loss}
                      </div>

                    </div>

                    <div style={{
                      background: "#111827",
                      padding: 12,
                      borderRadius: 10
                    }}>

                      <div style={{
                        color: "#64748b",
                        fontSize: 11
                      }}>
                        Expected Profit
                      </div>

                      <div style={{
                        color: "#38bdf8",
                        fontWeight: 700
                      }}>
                        ₹{r.estimated_profit}
                      </div>

                    </div>

                  </div>

                  {/* HOLDING */}
                  <div style={{
                    marginTop: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}>

                    <div style={{
                      background: "#22c55e22",
                      color: "#22c55e",
                      padding: "6px 12px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700
                    }}>
                      {r.holding_type}
                    </div>

                    <div style={{
                      color: "#94a3b8",
                      fontSize: 13
                    }}>
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
      <div style={{
        display: "flex",
        gap: 12,
        marginBottom: 20
      }}>

        {
          ["ALL", "BUY", "SELL"]
          .map(f => (

            <button
              key={f}
              onClick={() => setFilter(f)}
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

            <tr style={{
              color: "#64748b"
            }}>

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
              displayRows.map((item, i) => (

                item._placeholder

                ? (

                  <tr key={i}>
                    <td colSpan={5}>
                      —
                    </td>
                  </tr>

                )

                : (

                  <tr
                    key={item.stock}
                    style={{
                      background:
                        flashStocks[item.stock]
                          ? "#22c55e22"
                          : "transparent",
                      transition: "0.4s"
                    }}
                  >

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

                    <td style={{
                      color: "#38bdf8",
                      fontWeight: 700
                    }}>
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