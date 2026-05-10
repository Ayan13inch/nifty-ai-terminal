const API_BASE = "https://n50-nexus-api.onrender.com";
let allStocks = [];

async function loadTop5() {
  try {
    const res = await fetch(API_BASE + "/api/top5");
    const data = await res.json();
    const container = document.getElementById('top5Grid');
    container.innerHTML = '';
    data.data.forEach(stock => {
      const card = document.createElement('div');
      card.className = 'glass stock-card';
      card.innerHTML = `
        <strong style="font-size:18px">${stock.symbol}</strong><br>
        ₹${stock.price} <span style="color:${stock.change_pct >= 0 ? 'var(--green)' : 'var(--red)'}">(${stock.change_pct}%)</span><br>
        <span style="color:${stock.color}">${stock.action}</span>
      `;
      container.appendChild(card);
    });
  } catch(e) { console.error(e); }
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
      <td style="color:${s.change_pct>=0?'var(--green)':'var(--red)'}">${s.change_pct}%</td>
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
  btn.innerHTML = "ANALYZING...";
  btn.disabled = true;

  try {
    const res = await fetch(API_BASE + "/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget })
    });
    const data = await res.json();

    document.getElementById('portfolioSection').style.display = 'block';

    document.getElementById('portSummary').innerHTML = `
      <p><strong>Invested:</strong> ₹${data.total_invested}</p>
      <p><strong>Potential Gain:</strong> ₹${data.total_potential_gain}</p>
    `;

    const rowsDiv = document.getElementById('portfolioRows');
    rowsDiv.innerHTML = '';
    data.portfolio.forEach(stock => {
      const div = document.createElement('div');
      div.className = 'glass';
      div.style.margin = "10px 0";
      div.style.padding = "15px";
      div.innerHTML = `<strong>${stock.symbol}</strong> × ${stock.qty} | Target: ₹${stock.target}`;
      rowsDiv.appendChild(div);
    });

  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    btn.innerHTML = "ANALYZE & BUILD PORTFOLIO";
    btn.disabled = false;
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadTop5();
  loadAllStocks();
});
