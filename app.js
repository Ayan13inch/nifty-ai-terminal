const API_BASE = "https://n50-nexus-api.onrender.com";
let allStocks = [];

async function loadTop5() {
  try {
    const res = await fetch(API_BASE + "/api/top5");
    const data = await res.json();
    const grid = document.getElementById('top5Grid');
    grid.innerHTML = '';
    data.data.forEach(s => {
      const div = document.createElement('div');
      div.className = 'stock-card';
      div.innerHTML = `
        <strong>${s.symbol}</strong><br>
        ₹${s.price} <span style="color:${s.change_pct>=0?'#00ff88':'#ff3366'}">${s.change_pct}%</span><br>
        <span style="color:${s.color}">${s.action}</span>
      `;
      grid.appendChild(div);
    });
  } catch(e) {}
}

async function loadAllStocks() {
  try {
    const res = await fetch(API_BASE + "/api/all");
    const data = await res.json();
    allStocks = data.data || [];
    renderTable(allStocks);
  } catch(e) {}
}

function renderTable(stocks) {
  const tbody = document.getElementById('stocksTbody');
  tbody.innerHTML = '';
  stocks.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${s.symbol}</strong></td>
      <td>₹${s.price}</td>
      <td style="color:${s.change_pct>=0?'#00ff88':'#ff3366'}">${s.change_pct}%</td>
      <td>${s.rsi}</td>
      <td>${s.score}</td>
      <td style="color:${s.color}">${s.action}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function runAnalysis() {
  const budget = parseFloat(document.getElementById('budgetInput').value) || 50000;
  const btn = document.getElementById('analyzeBtn');
  btn.textContent = "ANALYZING...";
  btn.disabled = true;

  try {
    const res = await fetch(API_BASE + "/api/recommendations", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({budget})
    });
    const data = await res.json();

    document.getElementById('portfolioSection').classList.add('visible');
    // Summary
    document.getElementById('portSummary').innerHTML = `
      <div>Invested: <strong>₹${data.total_invested}</strong></div>
      <div>Potential Gain: <strong style="color:var(--green)">₹${data.total_potential_gain}</strong></div>
    `;

    // Rows
    const rows = document.getElementById('portfolioRows');
    rows.innerHTML = '';
    data.portfolio.forEach(p => {
      const d = document.createElement('div');
      d.style = "background:#0f1626; padding:15px; margin:10px 0; border-radius:8px;";
      d.innerHTML = `<strong>${p.symbol}</strong> × ${p.qty} @ ₹${p.price} → Target ₹${p.target}`;
      rows.appendChild(d);
    });

  } catch(e) {
    alert("Error generating portfolio");
  } finally {
    btn.textContent = "ANALYZE & BUILD PORTFOLIO";
    btn.disabled = false;
  }
}

function setPreset(val) {
  document.getElementById('budgetInput').value = val;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadTop5();
  loadAllStocks();
});
