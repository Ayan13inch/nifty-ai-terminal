const API_BASE = "https://n50-nexus-api.onrender.com";

let allStocks = [];

// Utility
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

// Load Top 5
async function loadTop5() {
    try {
        const res = await fetch(API_BASE + "/api/top5");
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const grid = document.getElementById('top5Grid');
        grid.innerHTML = '';

        data.data.forEach(stock => {
            const card = document.createElement('div');
            card.className = `stock-card ${stock.score >= 15 ? 'bullish' : stock.score <= -15 ? 'bearish' : 'neutral'}`;
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

// Load All Stocks Table
async function loadAllStocks() {
    try {
        const res = await fetch(API_BASE + "/api/all");
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        allStocks = data.data;
        renderTable(allStocks);
    } catch (e) {
        console.error(e);
        showToast("Failed to load stock data", true);
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

// Filter & Search
function filterTable() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const actionFilter = document.getElementById('filterAction').value;

    let filtered = allStocks.filter(stock => {
        const matchesSearch = stock.symbol.toLowerCase().includes(search) || 
                            stock.name.toLowerCase().includes(search);
        const matchesAction = !actionFilter || stock.action === actionFilter;
        return matchesSearch && matchesAction;
    });

    renderTable(filtered);
}

// Portfolio Analysis
async function runAnalysis() {
    const budget = parseFloat(document.getElementById('budgetInput').value) || 50000;
    const btn = document.getElementById('analyzeBtn');
    btn.classList.add('loading');
    btn.textContent = "ANALYZING...";

    try {
        const res = await fetch(API_BASE + "/api/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ budget })
        });
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        // Render portfolio (you can expand this)
        console.log("Portfolio:", data);
        showToast(`Portfolio ready! ₹${data.total_invested} invested`);

        // Basic display
        document.getElementById('portfolioSection').classList.add('visible');
        // You can expand this section further as needed

    } catch (e) {
        showToast("Analysis failed", true);
    } finally {
        btn.classList.remove('loading');
        btn.textContent = "ANALYZE & BUILD PORTFOLIO";
    }
}

function setPreset(amount) {
    document.getElementById('budgetInput').value = amount;
}

// Tab Switching
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));

    if (tab === 'allStocks') {
        document.querySelector('button[onclick="switchTab(\'allStocks\')"]').classList.add('active');
        document.getElementById('tab-allStocks').classList.add('active');
    } else {
        document.querySelector('button[onclick="switchTab(\'screener\')"]').classList.add('active');
        document.getElementById('tab-screener').classList.add('active');
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadTop5();
    loadAllStocks();

    // Refresh every 5 minutes
    setInterval(() => {
        loadTop5();
        loadAllStocks();
    }, 300000);

    showToast("Connected to N50 Nexus");
});