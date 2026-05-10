const API_BASE = "https://n50-nexus-api.onrender.com";

let allStocks = [];

// Utility Functions
function formatNumber(num) {
    return num.toLocaleString('en-IN');
}

function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// Load Top 5 Signals
async function loadTop5() {
    try {
        const res = await fetch(API_BASE + "/api/top5");
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        const grid = document.getElementById('top5Grid');
        grid.innerHTML = '';

        data.data.forEach(stock => {
            const isBullish = stock.score >= 15;
            const isBearish = stock.score <= -15;
            
            const card = document.createElement('div');
            card.className = `stock-card ${isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral'}`;
            card.innerHTML = `
                <div class="card-sym">${stock.symbol}</div>
                <div class="card-name">${stock.name}</div>
                <div class="card-price">₹${stock.price}</div>
                <div class="card-change ${stock.change_pct >= 0 ? 'up' : 'down'}">
                    ${stock.change_pct >= 0 ? '↑' : '↓'} ${stock.change_pct}%
                </div>
                <div class="action-badge" style="color:${stock.color}">${stock.action}</div>
            `;
            grid.appendChild(card);
        });

        document.getElementById('lastUpdated').textContent = 
            `Last updated: ${new Date(data.last_updated).toLocaleTimeString()}`;
            
    } catch (e) {
        console.error(e);
        showToast("Failed to load top signals", true);
    }
}

// Load All Stocks
async function loadAllStocks() {
    try {
        const res = await fetch(API_BASE + "/api/all");
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        allStocks = data.data || [];
        renderTable(allStocks);
    } catch (e) {
        console.error(e);
        showToast("Failed to load market data", true);
    }
}

function renderTable(stocks) {
    const tbody = document.getElementById('stocksTbody');
    tbody.innerHTML = '';

    stocks.forEach(stock => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${stock.symbol}</strong></td>
            <td>₹${stock.price}</td>
            <td class="${stock.change_pct >= 0 ? 'up' : 'down'}">${stock.change_pct}%</td>
            <td>${stock.rsi}</td>
            <td>${stock.macd_hist}</td>
            <td>${stock.bb_lower} / ${stock.bb_mid} / ${stock.bb_upper}</td>
            <td>${stock.volume_signal}</td>
            <td><strong>${stock.score}</strong></td>
            <td style="color:${stock.color}"><strong>${stock.action}</strong></td>
            <td>₹${stock.target}</td>
            <td>₹${stock.stop_loss}</td>
        `;
        tbody.appendChild(row);
    });
}

// Filter Table
function filterTable() {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const actionFilter = document.getElementById('filterAction').value;

    const filtered = allStocks.filter(stock => {
        const matchesSearch = !search || 
            stock.symbol.toLowerCase().includes(search) || 
            stock.name.toLowerCase().includes(search);
        const matchesAction = !actionFilter || stock.action === actionFilter;
        return matchesSearch && matchesAction;
    });

    renderTable(filtered);
}

// Portfolio Analysis
async function runAnalysis() {
    const budgetInput = document.getElementById('budgetInput');
    const budget = parseFloat(budgetInput.value) || 50000;
    const btn = document.getElementById('analyzeBtn');

    btn.classList.add('loading');
    btn.textContent = "BUILDING PORTFOLIO...";

    try {
        const res = await fetch(API_BASE + "/api/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ budget })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        showToast(`Portfolio Ready! ₹${data.total_invested} invested in ${data.portfolio.length} stocks`);

        // You can expand this later to show full portfolio UI
        console.log("Recommended Portfolio:", data);

    } catch (e) {
        console.error(e);
        showToast("Failed to generate portfolio", true);
    } finally {
        btn.classList.remove('loading');
        btn.textContent = "ANALYZE & BUILD PORTFOLIO";
    }
}

function setPreset(amount) {
    document.getElementById('budgetInput').value = amount;
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    if (tab === 'allStocks') {
        document.querySelector('button[onclick="switchTab(\'allStocks\')"]').classList.add('active');
        document.getElementById('tab-allStocks').classList.add('active');
    } else {
        document.querySelector('button[onclick="switchTab(\'screener\')"]').classList.add('active');
        document.getElementById('tab-screener').classList.add('active');
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadTop5();
    loadAllStocks();

    // Auto refresh every 5 minutes
    setInterval(() => {
        loadTop5();
        loadAllStocks();
    }, 300000);

    showToast("✅ Connected to N50 Nexus Live");
});