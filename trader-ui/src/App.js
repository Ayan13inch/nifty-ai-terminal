const API_BASE = "https://n50-nexus-api.onrender.com";

let allStocks = [];

console.log("🚀 N50 Nexus Frontend Loaded");

// Utility
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.classList.toggle('error', isError);
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    }
}

// Load Top 5
async function loadTop5() {
    try {
        console.log("Fetching top 5...");
        const res = await fetch(API_BASE + "/api/top5");
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        const grid = document.getElementById('top5Grid');
        if (grid) grid.innerHTML = '';

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
            if (grid) grid.appendChild(card);
        });

        const lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) lastUpdated.textContent = `Last updated: ${new Date(data.last_updated).toLocaleTimeString()}`;

        console.log("✅ Top 5 loaded successfully");
    } catch (e) {
        console.error("Top5 Error:", e);
        showToast("Failed to load top signals", true);
    }
}

// Load All Stocks
async function loadAllStocks() {
    try {
        console.log("Fetching all stocks...");
        const res = await fetch(API_BASE + "/api/all");
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        allStocks = data.data || [];
        renderTable(allStocks);
        console.log(`✅ Loaded ${allStocks.length} stocks`);
    } catch (e) {
        console.error("All Stocks Error:", e);
        showToast("Failed to load market data", true);
    }
}

function renderTable(stocks) {
    const tbody = document.getElementById('stocksTbody');
    if (!tbody) return;
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

async function runAnalysis() {
    const budget = parseFloat(document.getElementById('budgetInput').value) || 50000;
    const btn = document.getElementById('analyzeBtn');
    
    btn.textContent = "BUILDING...";
    btn.disabled = true;

    try {
        const res = await fetch(API_BASE + "/api/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ budget })
        });
        const data = await res.json();

        if (data.error) throw new Error(data.error);
        
        showToast(`✅ Portfolio Ready! ₹${data.total_invested} invested`);
        console.log("Portfolio:", data);
    } catch (e) {
        console.error(e);
        showToast("Failed to generate portfolio", true);
    } finally {
        btn.textContent = "ANALYZE & BUILD PORTFOLIO";
        btn.disabled = false;
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log("📡 Initializing N50 Nexus...");
    loadTop5();
    loadAllStocks();

    setInterval(() => {
        loadTop5();
        loadAllStocks();
    }, 300000);

    showToast("✅ Connected to N50 Nexus");
});