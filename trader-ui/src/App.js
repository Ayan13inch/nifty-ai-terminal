/**
 * N50 NEXUS — Frontend Intelligence Engine
 * Connects to Flask backend at localhost:5000
 */

const API = "https://n50-nexus-api.onrender.com/api";
let allStocksData = [];
let sortState = { key: "score", asc: false };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt  = (n) => "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtN = (n, d = 2) => Number(n).toLocaleString("en-IN", { maximumFractionDigits: d });
const pct  = (n) => (n >= 0 ? "+" : "") + fmtN(n, 2) + "%";

function colorOf(action) {
  if (action.includes("STRONG BUY"))  return "var(--green)";
  if (action.includes("BUY"))         return "var(--green2)";
  if (action.includes("STRONG SELL")) return "var(--red)";
  if (action.includes("SELL"))        return "var(--red2)";
  return "var(--yellow)";
}

function rsiClass(rsi) {
  if (rsi < 30) return "good";
  if (rsi > 70) return "bad";
  if (rsi < 45) return "ok";
  if (rsi > 55) return "warn";
  return "ok";
}

function scoreBar(score) {
  const pct = Math.min(100, Math.max(0, ((score + 100) / 200) * 100));
  const color = score > 15 ? "var(--green)" : score < -15 ? "var(--red)" : "var(--yellow)";
  return `<div style="display:flex;align-items:center;gap:8px">
    <div style="width:80px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden">
      <div style="width:${pct}%;height:100%;background:${color};border-radius:2px"></div>
    </div>
    <span style="color:${color};font-size:12px">${score > 0 ? "+" : ""}${score}</span>
  </div>`;
}

function toast(msg, type = "info") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast show" + (type === "error" ? " error" : "");
  setTimeout(() => el.classList.remove("show"), 3500);
}

function showLoading(show) {
  document.getElementById("loadingOverlay").classList.toggle("visible", show);
}

// ─── Clock & Market Status ────────────────────────────────────────────────────

function updateClock() {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const h = ist.getHours(), m = ist.getMinutes();
  const open  = h > 9  || (h === 9  && m >= 15);
  const close = h < 15 || (h === 15 && m <= 30);
  const isMarketOpen = open && close && ist.getDay() >= 1 && ist.getDay() <= 5;

  document.getElementById("marketTime").textContent =
    ist.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " IST";

  const statusEl = document.getElementById("nseStatus");
  if (isMarketOpen) {
    statusEl.textContent = "NSE • MARKET OPEN";
    statusEl.style.borderColor = "var(--green)";
    statusEl.style.color = "var(--green)";
  } else {
    statusEl.textContent = "NSE • MARKET CLOSED";
    statusEl.style.borderColor = "var(--text-dim)";
    statusEl.style.color = "var(--text-dim)";
  }
}
setInterval(updateClock, 1000);
updateClock();

// ─── Sparkline Canvas ─────────────────────────────────────────────────────────

function drawSparkline(canvas, data, color) {
  const ctx = canvas.getContext("2d");
  const w = canvas.offsetWidth || 180;
  const h = canvas.offsetHeight || 40;
  canvas.width = w * window.devicePixelRatio;
  canvas.height = h * window.devicePixelRatio;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * (h - 8) - 4,
  ]);

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, color + "44");
  grad.addColorStop(1, color + "00");

  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.lineTo(pts[pts.length - 1][0], h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Last dot
  const [lx, ly] = pts[pts.length - 1];
  ctx.beginPath();
  ctx.arc(lx, ly, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// ─── Ticker Tape ─────────────────────────────────────────────────────────────

function buildTicker(stocks) {
  const items = [...stocks, ...stocks]; // duplicate for seamless loop
  const html = items.map(s =>
    `<span class="tick-item">
      <span class="tick-sym">${s.symbol}</span>
      <span class="tick-price">${fmt(s.price)}</span>
      <span class="${s.change >= 0 ? "tick-up" : "tick-down"}">${pct(s.change_pct)}</span>
    </span>`
  ).join("");
  document.getElementById("tickerInner").innerHTML = html;
}

// ─── Top 5 Cards ─────────────────────────────────────────────────────────────

function buildTop5(stocks) {
  const grid = document.getElementById("top5Grid");
  grid.innerHTML = stocks.map((s, i) => {
    const isBull = s.score > 15;
    const isBear = s.score < -15;
    const cls    = isBull ? "bullish" : isBear ? "bearish" : "neutral";
    const color  = colorOf(s.action);
    const chgCls = s.change >= 0 ? "up" : "down";
    const chgSym = s.change >= 0 ? "▲" : "▼";

    return `<div class="stock-card ${cls}" onclick="scrollToStock('${s.symbol}')"
               style="animation: slideIn 0.4s ease ${i * 0.08}s both">
      <div class="card-sym">${s.symbol}</div>
      <div class="card-name">${s.name}</div>
      <div class="card-price" id="price-${s.symbol}">${fmt(s.price)}</div>
      <div class="card-change ${chgCls}">${chgSym} ${fmtN(Math.abs(s.change))} (${pct(s.change_pct)})</div>

      <div class="sparkline-wrap">
        <canvas id="spark-${s.symbol}"></canvas>
      </div>

      <div class="card-indicators">
        <div class="ind-block">
          <div class="ind-label">RSI (14)</div>
          <div class="ind-value ${rsiClass(s.rsi)}">${fmtN(s.rsi, 1)}</div>
        </div>
        <div class="ind-block">
          <div class="ind-label">MACD HIST</div>
          <div class="ind-value ${s.macd_hist > 0 ? "good" : "bad"}">${fmtN(s.macd_hist, 2)}</div>
        </div>
        <div class="ind-block">
          <div class="ind-label">52W HIGH</div>
          <div class="ind-value ok">${fmt(s.week52_high)}</div>
        </div>
        <div class="ind-block">
          <div class="ind-label">52W LOW</div>
          <div class="ind-value ok">${fmt(s.week52_low)}</div>
        </div>
      </div>

      <div class="action-badge" style="color:${color}">
        ${s.action}
      </div>
    </div>`;
  }).join("");

  // Draw sparklines after DOM update
  requestAnimationFrame(() => {
    stocks.forEach(s => {
      const canvas = document.getElementById(`spark-${s.symbol}`);
      if (canvas && s.sparkline?.length) {
        const color = s.change >= 0 ? "#00ff88" : "#ff3366";
        drawSparkline(canvas, s.sparkline, color);
      }
    });
  });
}

// ─── Full Table ───────────────────────────────────────────────────────────────

function buildTable(stocks) {
  const tbody = document.getElementById("stocksTbody");
  if (!stocks.length) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:40px;color:var(--text-dim)">NO STOCKS MATCH YOUR FILTER</td></tr>`;
    return;
  }

  tbody.innerHTML = stocks.map(s => {
    const color  = colorOf(s.action);
    const chgCls = s.change >= 0 ? "var(--green)" : "var(--red)";
    const rsiPct = Math.min(100, s.rsi);
    const rsiCol = s.rsi < 30 ? "#00ff88" : s.rsi > 70 ? "#ff3366" : "#00d4ff";

    const bbPos = s.bb_upper > s.bb_lower
      ? ((s.price - s.bb_lower) / (s.bb_upper - s.bb_lower) * 100).toFixed(0)
      : 50;

    return `<tr id="row-${s.symbol}">
      <td>
        <div style="font-family:var(--font-head);font-size:12px;color:var(--cyan);letter-spacing:2px">${s.symbol}</div>
        <div style="font-size:10px;color:var(--text-dim)">${s.name.substring(0,20)}</div>
      </td>
      <td style="font-family:var(--font-mono);font-size:14px;color:var(--text)">${fmt(s.price)}</td>
      <td style="font-family:var(--font-mono);color:${chgCls}">
        ${s.change >= 0 ? "▲" : "▼"} ${pct(s.change_pct)}
      </td>
      <td>
        <div class="rsi-bar">
          <div class="rsi-track">
            <div class="rsi-fill" style="width:${rsiPct}%;background:${rsiCol}"></div>
          </div>
          <span style="font-family:var(--font-mono);font-size:12px;color:${rsiCol}">${fmtN(s.rsi,1)}</span>
        </div>
      </td>
      <td style="font-family:var(--font-mono);font-size:12px;color:${s.macd_hist > 0 ? "var(--green)" : "var(--red)"}">
        ${s.macd_hist > 0 ? "▲" : "▼"} ${fmtN(s.macd_hist, 3)}
      </td>
      <td style="font-family:var(--font-mono);font-size:11px">
        <span style="color:var(--red2)">${fmt(s.bb_lower)}</span>
        <span style="color:var(--text-dim)"> ◆ </span>
        <span style="color:var(--cyan)">${bbPos}%</span>
        <span style="color:var(--text-dim)"> ◆ </span>
        <span style="color:var(--green2)">${fmt(s.bb_upper)}</span>
      </td>
      <td>
        <span style="font-family:var(--font-mono);font-size:11px;
          color:${s.volume_signal === "HIGH" ? "var(--green)" : s.volume_signal === "LOW" ? "var(--text-dim)" : "var(--cyan)"}">
          ${s.volume_signal}
        </span>
      </td>
      <td>${scoreBar(s.score)}</td>
      <td>
        <span class="mini-badge" style="color:${color};border-color:${color}">${s.action}</span>
      </td>
      <td style="font-family:var(--font-mono);font-size:13px;color:var(--green)">${fmt(s.target)}</td>
      <td style="font-family:var(--font-mono);font-size:13px;color:var(--red)">${fmt(s.stop_loss)}</td>
    </tr>`;
  }).join("");
}

// ─── Filter & Sort ────────────────────────────────────────────────────────────

function filterTable() {
  const q      = document.getElementById("searchInput").value.toLowerCase();
  const action = document.getElementById("filterAction").value;
  const filtered = allStocksData.filter(s =>
    (!q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) &&
    (!action || s.action === action)
  );
  buildTable(filtered);
}

function sortTable(key) {
  if (sortState.key === key) sortState.asc = !sortState.asc;
  else { sortState.key = key; sortState.asc = false; }

  const sorted = [...allStocksData].sort((a, b) => {
    const av = typeof a[key] === "string" ? a[key] : Number(a[key]);
    const bv = typeof b[key] === "string" ? b[key] : Number(b[key]);
    const cmp = av > bv ? 1 : av < bv ? -1 : 0;
    return sortState.asc ? cmp : -cmp;
  });
  allStocksData = sorted;
  filterTable();
}

function scrollToStock(sym) {
  const row = document.getElementById(`row-${sym}`);
  if (row) {
    switchTab("allStocks");
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.style.background = "rgba(0,212,255,0.15)";
    setTimeout(() => row.style.background = "", 2000);
  }
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function switchTab(id) {
  document.querySelectorAll(".tab-btn").forEach((b, i) => {
    const ids = ["allStocks", "screener"];
    b.classList.toggle("active", ids[i] === id);
  });
  document.querySelectorAll(".tab-panel").forEach(p => {
    p.classList.toggle("active", p.id === `tab-${id}`);
  });
}

// ─── Screener ────────────────────────────────────────────────────────────────

function runScreener() {
  const rsiMin   = parseFloat(document.getElementById("rsiMin").value)    || 0;
  const rsiMax   = parseFloat(document.getElementById("rsiMax").value)    || 100;
  const minScore = parseFloat(document.getElementById("minScore").value)  || -100;
  const maxPrice = parseFloat(document.getElementById("maxPrice").value)  || Infinity;

  const results = allStocksData.filter(s =>
    s.rsi >= rsiMin && s.rsi <= rsiMax &&
    s.score >= minScore &&
    s.price <= maxPrice
  );

  const color = colorOf;
  const tbody = document.getElementById("screenerTbody");
  if (!results.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text-dim)">NO STOCKS MATCH CRITERIA</td></tr>`;
    return;
  }
  tbody.innerHTML = results.map(s => `
    <tr>
      <td style="font-family:var(--font-head);font-size:12px;color:var(--cyan);letter-spacing:2px">${s.symbol}</td>
      <td style="font-size:12px;color:var(--text-dim)">${s.name}</td>
      <td style="font-family:var(--font-mono);color:var(--text)">${fmt(s.price)}</td>
      <td style="font-family:var(--font-mono);color:${s.change >= 0 ? "var(--green)" : "var(--red)"}">${pct(s.change_pct)}</td>
      <td style="font-family:var(--font-mono);color:${s.rsi < 30 ? "var(--green)" : s.rsi > 70 ? "var(--red)" : "var(--cyan)"}">${fmtN(s.rsi,1)}</td>
      <td>${scoreBar(s.score)}</td>
      <td><span class="mini-badge" style="color:${colorOf(s.action)};border-color:${colorOf(s.action)}">${s.action}</span></td>
      <td style="font-family:var(--font-mono);color:var(--green)">${fmt(s.target)}</td>
      <td style="font-family:var(--font-mono);color:var(--red)">${fmt(s.stop_loss)}</td>
    </tr>
  `).join("");
}

// ─── Budget Presets ───────────────────────────────────────────────────────────

function setPreset(val) {
  document.getElementById("budgetInput").value = val;
}

// ─── Portfolio Analysis ───────────────────────────────────────────────────────

async function runAnalysis() {
  const budget = parseFloat(document.getElementById("budgetInput").value);
  if (!budget || budget < 1000) {
    toast("Minimum budget is ₹1,000", "error"); return;
  }

  const btn = document.getElementById("analyzeBtn");
  btn.textContent = "ANALYZING MARKET...";
  btn.classList.add("loading");

  try {
    const res = await fetch(`${API}/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget }),
    });
    const data = await res.json();
    if (data.error) { toast(data.error, "error"); return; }
    renderPortfolio(data);
  } catch (e) {
    toast("Backend unreachable. Is app.py running?", "error");
  } finally {
    btn.textContent = "ANALYZE & BUILD PORTFOLIO";
    btn.classList.remove("loading");
  }
}

function renderPortfolio(data) {
  const section = document.getElementById("portfolioSection");
  section.classList.add("visible");
  section.scrollIntoView({ behavior: "smooth", block: "start" });

  // Summary stats
  const returnPct = data.total_invested > 0
    ? ((data.total_potential_gain / data.total_invested) * 100).toFixed(1)
    : 0;

  document.getElementById("portSummary").innerHTML = `
    <div class="port-stat">
      <div class="port-stat-label">INVESTED</div>
      <div class="port-stat-value" style="color:var(--cyan)">${fmt(data.total_invested)}</div>
    </div>
    <div class="port-stat">
      <div class="port-stat-label">CASH LEFT</div>
      <div class="port-stat-value" style="color:var(--text-dim)">${fmt(data.remaining_cash)}</div>
    </div>
    <div class="port-stat">
      <div class="port-stat-label">POT. GAIN</div>
      <div class="port-stat-value" style="color:var(--green)">+${fmt(data.total_potential_gain)} (${returnPct}%)</div>
    </div>
    <div class="port-stat">
      <div class="port-stat-label">MAX RISK</div>
      <div class="port-stat-value" style="color:var(--red)">-${fmt(data.total_risk)}</div>
    </div>
  `;

  if (!data.portfolio.length) {
    document.getElementById("portfolioRows").innerHTML = `
      <div style="padding:40px;text-align:center;font-family:var(--font-mono);color:var(--text-dim)">
        No buyable stocks found within budget. Try a higher budget or wait for better signals.
      </div>`;
    return;
  }

  document.getElementById("portfolioRows").innerHTML = data.portfolio.map((s, i) => `
    <div class="port-row" style="animation-delay:${i * 0.1}s">
      <div class="port-row-sym">
        <div class="port-row-sym-code">${s.symbol}</div>
        <div class="port-row-sym-name">${s.name}</div>
        <div style="margin-top:6px">
          <span class="mini-badge" style="color:var(--green);border-color:var(--green)">
            ${s.allocation_pct}% ALLOCATED
          </span>
        </div>
      </div>

      <div>
        <div class="port-col-label">BUY PRICE</div>
        <div class="port-col-value cyan">${fmt(s.price)}</div>
      </div>
      <div>
        <div class="port-col-label">QTY</div>
        <div class="port-col-value cyan">${s.qty} shares</div>
      </div>
      <div>
        <div class="port-col-label">TOTAL COST</div>
        <div class="port-col-value cyan">${fmt(s.cost)}</div>
      </div>
      <div>
        <div class="port-col-label">TARGET (6%)</div>
        <div class="port-col-value green">${fmt(s.target)}</div>
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--green)">
          +${fmt(s.potential_gain)}
        </div>
      </div>
      <div>
        <div class="port-col-label">STOP-LOSS</div>
        <div class="port-col-value red">${fmt(s.stop_loss)}</div>
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--red)">
          -${fmt(s.risk_amount)}
        </div>
      </div>

      <div class="sell-when">
        <div style="color:var(--cyan);font-family:var(--font-head);font-size:9px;letter-spacing:2px;margin-bottom:6px">
          SELL WHEN
        </div>
        • Price hits ${fmt(s.target)}<br>
        • RSI crosses 70+<br>
        • Price drops to ${fmt(s.stop_loss)}<br>
        • <span style="color:var(--text-dim)">Reason: ${s.reason}</span>
      </div>
    </div>
  `).join("");
}

// ─── Data Fetch ───────────────────────────────────────────────────────────────

async function loadTop5() {
  try {
    const res = await fetch(`${API}/top5`);
    const data = await res.json();
    if (data.data) {
      buildTop5(data.data);
      buildTicker(data.data);
      const ts = data.last_updated
        ? new Date(data.last_updated).toLocaleTimeString("en-IN")
        : "—";
      document.getElementById("lastUpdated").textContent = `LAST SYNC: ${ts}`;
    }
  } catch (e) {
    console.warn("Top5 fetch failed:", e);
    toast("Could not connect to backend. Make sure app.py is running.", "error");
  }
}

async function loadAllStocks() {
  try {
    const res = await fetch(`${API}/all?sort=score&order=desc`);
    const data = await res.json();
    if (data.data) {
      allStocksData = data.data;
      buildTable(allStocksData);
      buildTicker(allStocksData);
      document.getElementById("liveStatus").textContent =
        `${data.data.length} STOCKS LOADED`;
    }
  } catch (e) {
    console.warn("All stocks fetch failed:", e);
  }
}

async function checkBackend() {
  try {
    const res = await fetch(`${API}/status`);
    const data = await res.json();
    return data.status === "online" && data.stocks_loaded > 0;
  } catch {
    return false;
  }
}

async function init() {
  showLoading(true);
  document.getElementById("liveStatus").textContent = "LOADING...";

  // Poll until backend is ready
  let tries = 0;
  while (tries < 30) {
    const ready = await checkBackend();
    if (ready) break;
    await new Promise(r => setTimeout(r, 2000));
    tries++;
  }

  showLoading(false);

  await Promise.all([loadTop5(), loadAllStocks()]);

  // Auto-refresh every 5 minutes
  setInterval(async () => {
    await Promise.all([loadTop5(), loadAllStocks()]);
  }, 5 * 60 * 1000);
}

init();