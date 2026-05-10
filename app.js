const API_BASE = "https://n50-nexus-api.onrender.com";
let allStocks = [];

function createSparkline(data) {
  return `<canvas width="120" height="50" class="sparkline" data-points="${data.join(',')}"></canvas>`;
}

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
        ₹${stock.price} <span style="color:${stock.change_pct >= 0 ? '#39ff14' : '#ff00aa'}">(${stock.change_pct}%)</span><br>
        <span style="color:${stock.color}">${stock.action}</span>
        ${createSparkline(stock.sparkline)}
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
      <td style="color:${s.change_pct>=0?'#39ff14':'#ff00aa'}">${s.change_pct}%</td>
      <td>${s.rsi}</td>
      <td>${s.score}</td>
      <td style="color:${s.color}">${s.action}</td>
      <td>${createSparkline(s.sparkline)}</td>
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

    document.getElementById('portfolioSection').style.display = 'block';
    document.getElementById('portSummary').innerHTML = `
      <strong>Invested:</strong> ₹${data.total_invested}<br>
      <strong>Potential Gain:</strong> <span style="color:#39ff14">₹${data.total_potential_gain}</span>
    `;

    const rowsDiv = document.getElementById('portfolioRows');
    rowsDiv.innerHTML = '';
    data.portfolio.forEach(stock => {
      const div = document.createElement('div');
      div.className = 'port-row glass';
      div.innerHTML = `
        <strong>${stock.symbol}</strong> × ${stock.qty} @ ₹${stock.price}<br>
        Target: <span style="color:#39ff14">₹${stock.target}</span> | 
        Stop Loss: <span style="color:#ff00aa">₹${stock.stop_loss}</span>
      `;
      rowsDiv.appendChild(div);
    });

  } catch (e) {
    alert("Error generating portfolio");
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
