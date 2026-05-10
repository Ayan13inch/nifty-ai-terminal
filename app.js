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
        <strong>${stock.symbol}</strong><br>
        ₹${stock.price} <span style="color:${stock.change_pct >= 0 ? '#00ff9d' : '#ff3b5c'}">(${stock.change_pct}%)</span><br>
        <span style="color:${stock.color}">${stock.action}</span>
      `;
      container.appendChild(card);
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
      <td style="color:${s.change_pct>=0?'#00ff9d':'#ff3b5c'}">${s.change_pct}%</td>
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget })
    });
    const data = await res.json();

    document.getElementById('portfolioSection').classList.add('visible');

    // Summary
    document.getElementById('portSummary').innerHTML = `
      <strong>Total Invested:</strong> ₹${data.total_invested.toLocaleString('en-IN')}<br>
      <strong>Potential Gain:</strong> <span style="color:#00ff9d">₹${data.total_potential_gain.toLocaleString('en-IN')}</span>
    `;

    // Portfolio Rows with Stop Loss
    const rowsDiv = document.getElementById('portfolioRows');
    rowsDiv.innerHTML = '';
    data.portfolio.forEach(stock => {
      const div = document.createElement('div');
      div.className = 'glass';
      div.style.padding = "16px";
      div.style.marginBottom = "12px";
      div.innerHTML = `
        <strong>${stock.symbol}</strong> × ${stock.qty} @ ₹${stock.price}<br>
        <span style="color:#00ff9d">Target: ₹${stock.target}</span> | 
        <span style="color:#ff3b5c">Stop Loss: ₹${stock.stop_loss}</span>
      `;
      rowsDiv.appendChild(div);
    });

  } catch (e) {
    alert("Failed to generate portfolio");
  } finally {
    btn.textContent = "ANALYZE & BUILD PORTFOLIO";
    btn.disabled = false;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadTop5();
  loadAllStocks();
});
