const API_BASE = "https://n50-nexus-api.onrender.com";
let allStocks = [];

function drawSparkline(canvas, points) {
  if (!canvas || !points || points.length < 2) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = 140;
  const h = canvas.height = 45;
  ctx.clearRect(0, 0, w, h);

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  ctx.beginPath();
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2.5;
  points.forEach((val, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((val - min) / range) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
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
        <strong>${stock.symbol}</strong><br>
        ₹${stock.price} <span style="color:${stock.change_pct >= 0 ? '#39ff14' : '#ff0088'}">(${stock.change_pct}%)</span><br>
        <span style="color:${stock.color}">${stock.action}</span>
        <canvas class="sparkline-container"></canvas>
      `;
      container.appendChild(card);
      setTimeout(() => drawSparkline(card.querySelector('canvas'), stock.sparkline), 100);
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
      <td style="color:${s.change_pct>=0?'#39ff14':'#ff0088'}">${s.change_pct}%</td>
      <td>${s.score}</td>
      <td style="color:${s.color}">${s.action}</td>
      <td><canvas class="sparkline-container" width="140" height="45"></canvas></td>
    `;
    tbody.appendChild(tr);
    setTimeout(() => {
      const canvas = tr.querySelector('canvas');
      if (canvas) drawSparkline(canvas, s.sparkline);
    }, 200);
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
      Invested: ₹${data.total_invested}<br>
      Potential Gain: <span style="color:#39ff14">₹${data.total_potential_gain}</span>
    `;

    const rows = document.getElementById('portfolioRows');
    rows.innerHTML = '';
    data.portfolio.forEach(stock => {
      const div = document.createElement('div');
      div.className = 'glass';
      div.style.padding = "16px";
      div.style.margin = "10px 0";
      div.innerHTML = `
        <strong>${stock.symbol}</strong> × ${stock.qty} @ ₹${stock.price}<br>
        Target: <span style="color:#39ff14">₹${stock.target}</span> | 
        Stop Loss: <span style="color:#ff0088">₹${stock.stop_loss}</span>
      `;
      rows.appendChild(div);
    });
  } catch (e) {
    alert("Error");
  } finally {
    btn.textContent = "ANALYZE & BUILD PORTFOLIO";
    btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadTop5();
  loadAllStocks();
});
