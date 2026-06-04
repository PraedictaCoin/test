// ============================================================
// PRAEDICTA – Market & Trading (market.js) - FINAL v10
// Full Order Book Market Maker with Server Sync
// ============================================================

const mockMarkets = {};
const MAX_PRICE_HISTORY = 100;
const ORDER_BOOK_DEPTH = 5;

// ============================================================
// ORDER BOOK PERSISTENCE
// ============================================================

function saveOrderBooks() {
    try {
        const data = {};
        Object.keys(mockMarkets).forEach(id => {
            data[id] = {
                yesBids: mockMarkets[id].yesBids,
                noBids: mockMarkets[id].noBids,
                totalYes: mockMarkets[id].totalYes,
                totalNo: mockMarkets[id].totalNo,
                totalVolume: mockMarkets[id].totalVolume,
                priceHistory: mockMarkets[id].priceHistory.slice(-50),
                firstBetUser: mockMarkets[id].firstBetUser
            };
        });
        localStorage.setItem('praedicta_orderbooks', JSON.stringify(data));
    } catch (e) { console.debug('Save orderbooks failed:', e); }
}

function loadOrderBooks() {
    try {
        const stored = localStorage.getItem('praedicta_orderbooks');
        if (stored) {
            const data = JSON.parse(stored);
            Object.keys(data).forEach(id => {
                mockMarkets[id] = data[id];
            });
        }
    } catch (e) { console.debug('Load orderbooks failed:', e); }
}

setInterval(saveOrderBooks, 5000);

// ============================================================
// MARKET FUNCTIONS
// ============================================================

function getMarket(id) {
    if (!mockMarkets[id]) {
        const keys = Object.keys(mockMarkets);
        if (keys.length >= CONFIG.MAX_CACHED_MARKETS) delete mockMarkets[keys[0]];
        mockMarkets[id] = { 
            yesBids: [], noBids: [], totalYes: 0, totalNo: 0, totalVolume: 0, 
            priceHistory: [{ price: 0.5, time: Date.now() }], firstBetUser: null, fills: [] 
        };
    }
    return mockMarkets[id];
}

function getYesPrice(market) {
    if (market.yesBids.length === 0 && market.noBids.length === 0) { 
        const h = market.priceHistory; return h.length > 0 ? h[h.length-1].price : 0.5; 
    }
    const bestYesBid = market.yesBids[0]?.price || 0.5;
    const bestNoBid = market.noBids[0]?.price || 0.5;
    return (bestYesBid + (1 - bestNoBid)) / 2;
}

function getBestBid(market) { return market.yesBids.length > 0 ? market.yesBids[0].price : null; }
function getBestAsk(market) { return market.noBids.length > 0 ? 1 - market.noBids[0].price : null; }

function getSpread(market) {
    const bid = getBestBid(market), ask = getBestAsk(market);
    if (bid === null || ask === null) return null;
    return { bid, ask, spread: ask - bid, spreadPercent: ((ask - bid) / ask * 100) };
}

function getMaxBet(balance, price) { return price <= 0 ? 0 : Math.floor(balance / (price * (1 + CONFIG.FEE_PER_TRADE))); }

function getPositionValue(id, user) {
    const m = getMarket(id); const p = getYesPrice(m);
    return m.yesBids.filter(b => b.user === user).reduce((s, b) => s + b.amount * p, 0) + 
           m.noBids.filter(b => b.user === user).reduce((s, b) => s + b.amount * (1 - p), 0);
}

function getUserOpenOrders(id, user) {
    if (!user) return { yes: [], no: [] };
    const m = getMarket(id);
    return { yes: m.yesBids.filter(b => b.user === user), no: m.noBids.filter(b => b.user === user) };
}

function getOrderBookDepth(market, depth = ORDER_BOOK_DEPTH) {
    const aggregateYes = {}, aggregateNo = {};
    market.yesBids.forEach(b => { const price = b.price.toFixed(4); aggregateYes[price] = (aggregateYes[price] || 0) + b.amount; });
    market.noBids.forEach(b => { const price = b.price.toFixed(4); aggregateNo[price] = (aggregateNo[price] || 0) + b.amount; });
    const bids = Object.entries(aggregateYes).map(([price, amount]) => ({ price: parseFloat(price), amount })).sort((a, b) => b.price - a.price).slice(0, depth);
    const asks = Object.entries(aggregateNo).map(([price, amount]) => ({ price: parseFloat(price), amount })).sort((a, b) => a.price - b.price).slice(0, depth).map(a => ({ price: 1 - a.price, amount: a.amount }));
    return { bids, asks };
}

function getWinStreak() {
    let streak = 0;
    const resolved = currentPredictions.filter(p => p.status === 'resolved' && !p.unresolvable);
    for (let i = resolved.length - 1; i >= 0; i--) {
        const b = (resolved[i].bets || []).find(b => b.user === walletAddress);
        if (b && b.outcome === resolved[i].resolved_outcome) streak++; else break;
    }
    return streak;
}

function getStreakMultiplier(streak) { if (streak >= 5) return 2.0; if (streak >= 3) return 1.5; if (streak >= 2) return 1.25; return 1.0; }

function spawnConfetti() {
    for (let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.style.cssText = `position:fixed;top:-10px;left:${Math.random()*100}%;width:8px;height:8px;background:hsl(${Math.random()*360},80%,60%);border-radius:2px;z-index:9999;animation:confettiFall ${1+Math.random()*2}s ease-in forwards;animation-delay:${Math.random()*0.5}s;`;
        document.body.appendChild(c); setTimeout(() => c.remove(), 3000);
    }
}

function animateReaction(emoji, x, y) {
    const el = document.createElement('div'); el.textContent = emoji;
    el.style.cssText = `position:fixed;left:${x}px;top:${y}px;font-size:1.5rem;z-index:9999;pointer-events:none;animation:floatUp 1.5s ease-out forwards;`;
    document.body.appendChild(el); setTimeout(() => el.remove(), 1500);
}

// ============================================================
// ORDER PLACEMENT WITH SERVER SYNC
// ============================================================

function placeLimitOrder(id, outcome, amount, price) {
    const market = getMarket(id);
    if (price <= 0.01 || price >= 0.99) return { error: 'Price must be between 0.02 and 0.98' };
    if (amount < CONFIG.MIN_BET) return { error: `Minimum is ${CONFIG.MIN_BET} PRAE` };
    
    let bonus = 0, discount = 0;
    if (!market.firstBetUser || market.firstBetUser === walletAddress) { market.firstBetUser = walletAddress; bonus = 1; userPRAEBalance += bonus; showToast('🩸 First Blood! +1 PRAE!', 'success'); }
    
    const prediction = currentPredictions.find(p => p.id === id);
    if (prediction?.created_at && (Date.now() - new Date(prediction.created_at).getTime()) < 3600000) discount = amount * price * 0.001;
    
    const fee = (amount * price * CONFIG.FEE_PER_TRADE) - discount;
    const totalCost = (amount * price) + fee;
    if (userPRAEBalance < totalCost) return { error: `Need ${totalCost.toFixed(2)} PRAE. You have ${userPRAEBalance.toFixed(2)}.` };
    
    userPRAEBalance -= totalCost; saveBalance();
    
    const order = { user: walletAddress, amount, price, time: Date.now(), originalAmount: amount, filled: 0, id: 'local_' + Date.now() + Math.random() };
    
    if (outcome === 'yes') { const i = market.yesBids.findIndex(b => b.price < price); if (i === -1) market.yesBids.push(order); else market.yesBids.splice(i, 0, order); }
    else { const i = market.noBids.findIndex(b => b.price < price); if (i === -1) market.noBids.push(order); else market.noBids.splice(i, 0, order); }
    
    const fillResult = matchOrders(market);
    const cp = getYesPrice(market); market.priceHistory.push({ price: cp, time: Date.now() }); if (market.priceHistory.length > MAX_PRICE_HISTORY) market.priceHistory.shift();
    if (amount >= 50) { showToast(`🤯 BIG ORDER: ${amount} PRAE on ${outcome.toUpperCase()}!`, 'info'); }
    saveOrderBooks();
    
    // Server sync
    try {
        callSecureRpc('place_order', { predictionId: id, outcome, amount, price, wallet: walletAddress }).catch(e => console.debug('Server order sync:', e.message));
    } catch (err) { console.debug('Server sync skipped'); }
    
    return { success: true, cost: totalCost, fee, price, amount, discount, bonus, filled: fillResult.filled, remaining: amount - fillResult.filled };
}

// ============================================================
// ORDER MATCHING WITH PARTIAL FILLS
// ============================================================

function matchOrders(market) {
    let totalFilled = 0, fillEvents = [], yi = 0, ni = 0;
    while (yi < market.yesBids.length && ni < market.noBids.length) {
        const yb = market.yesBids[yi], nb = market.noBids[ni];
        if (yb.price + nb.price >= 1) {
            const matchAmount = Math.min(yb.amount, nb.amount), matchPrice = (yb.price + (1 - nb.price)) / 2;
            market.totalYes += matchAmount; market.totalNo += matchAmount; market.totalVolume += matchAmount * matchPrice;
            const fill = { time: Date.now(), amount: matchAmount, price: matchPrice, yesUser: yb.user, noUser: nb.user };
            market.fills = market.fills || []; market.fills.push(fill); fillEvents.push(fill);
            yb.amount -= matchAmount; yb.filled = (yb.filled || 0) + matchAmount;
            nb.amount -= matchAmount; nb.filled = (nb.filled || 0) + matchAmount;
            totalFilled += matchAmount;
            if (yb.amount <= 0) market.yesBids.splice(yi, 1); else yi++;
            if (nb.amount <= 0) market.noBids.splice(ni, 1); else ni++;
        } else if (yb.price > nb.price) yi++; else ni++;
    }
    return { filled: totalFilled, events: fillEvents };
}

// ============================================================
// CANCEL ORDER
// ============================================================

function cancelOrder(id, outcome, index) {
    const market = getMarket(id), orders = outcome === 'yes' ? market.yesBids : market.noBids;
    if (index < 0 || index >= orders.length) return { error: 'Order not found' };
    const order = orders[index];
    if (order.user !== walletAddress) return { error: 'Not your order' };
    const refundAmount = order.amount * order.price;
    userPRAEBalance += refundAmount; saveBalance();
    orders.splice(index, 1); saveOrderBooks();
    
    // Server sync
    try {
        callSecureRpc('cancel_order', { orderId: order.id, wallet: walletAddress }).catch(e => console.debug('Server cancel sync:', e.message));
    } catch (err) { console.debug('Server cancel skipped'); }
    
    return { success: true, refunded: refundAmount };
}

// ============================================================
// MARKET BUY
// ============================================================

function marketBuy(id, outcome, amount) { return placeLimitOrder(id, outcome, amount, outcome === 'yes' ? 0.98 : 0.02); }
function buySharesMock(id, outcome, amount) { return marketBuy(id, outcome, amount); }
async function buySharesReal(id, outcome, amount) { showToast("⛓️ Real market coming soon!", 'info'); return { cost: 0 }; }

// ============================================================
// BUY CLICK HANDLER
// ============================================================

async function buyClick(e) {
    if (actionCooldown) return;
    const btn = e.currentTarget, id = btn.dataset.id, outcome = btn.dataset.outcome;
    const amount = parseFloat(document.getElementById(`amount-${id}`)?.value) || CONFIG.MIN_BET;
    if (amount < CONFIG.MIN_BET) return showToast(`Minimum ${CONFIG.MIN_BET} PRAE`, 'error');
    if (!['yes', 'no'].includes(outcome)) return;
    const prediction = currentPredictions.find(p => p.id === id);
    if (prediction?.creator === walletAddress) return showToast("Can't bet on your own", 'error');
    
    const market = getMarket(id), price = outcome === 'yes' ? getYesPrice(market) : 1 - getYesPrice(market);
    const fee = (amount * price * CONFIG.FEE_PER_TRADE), totalCost = (amount * price) + fee;
    if (amount > getMaxBet(userPRAEBalance, price)) return showToast(`Max: ${getMaxBet(userPRAEBalance, price)} PRAE`, 'error');
    
    const streak = getWinStreak(), multiplier = getStreakMultiplier(streak);
    const isUnderdog = (outcome === 'yes' ? price : 1 - price) < 0.3;
    let msg = `Bet ${amount} PRAE on ${outcome.toUpperCase()}?\n\nPrice: ${price.toFixed(4)}\nFee: ${fee.toFixed(3)}\nTotal: ${totalCost.toFixed(2)}`;
    if (multiplier > 1) msg += `\n\n🔥 Streak: ${streak} (${multiplier}x payout!)`;
    if (isUnderdog) msg += `\n\n🐺 Underdog! +50% bonus if you win!`;
    if (!confirm(msg)) return;
    
    actionCooldown = true; const orig = btn.innerHTML; btn.innerHTML = '<span class="loader"></span>'; btn.disabled = true;
    try {
        const result = useRealMarket ? await buySharesReal(id, outcome, amount) : marketBuy(id, outcome, amount);
        if (result.error) { showToast(result.error, 'error'); }
        else {
            const pw = (amount / price) * (outcome === 'yes' ? 1 : (1 - price));
            showToast(`✅ ${outcome.toUpperCase()} · ${price.toFixed(4)} · ${totalCost.toFixed(2)} PRAE`, 'success');
            if (result.bonus) showToast(`🩸 +${result.bonus} PRAE bonus!`, 'success');
            if (result.filled > 0) showToast(`⚡ ${result.filled} PRAE filled instantly!`, 'info');
            showBetReceipt(prediction, outcome, amount, price, fee, totalCost, pw, result.remaining);
            analyticsData.bets++;
            if (navigator.vibrate) navigator.vibrate(50);
            const card = btn.closest('.praediction-card');
            if (card) { card.classList.add('bet-pulse'); setTimeout(() => card.classList.remove('bet-pulse'), 600); }
            await refreshAll();
        }
    } catch (err) { showToast('Failed', 'error'); }
    finally { btn.innerHTML = orig; btn.disabled = false; actionCooldown = false; }
}

// ============================================================
// BET RECEIPT
// ============================================================

function showBetReceipt(prediction, outcome, amount, price, fee, totalCost, potentialWin, remaining) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:5000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `<div style="background:var(--bg);border:1px solid var(--accent);border-radius:20px;max-width:400px;width:90%;padding:24px;text-align:center;">
    <div style="font-size:2rem;">✅</div><h3 style="color:var(--accent);margin:8px 0;">Order Confirmed!</h3>
    <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:12px;">${escapeHtml((prediction?.title || '').slice(0, 60))}...</div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:.8rem;text-align:left;margin-bottom:16px;">
    <span style="color:var(--text-muted);">Side:</span><span><strong>${outcome.toUpperCase()}</strong></span>
    <span style="color:var(--text-muted);">Amount:</span><span><strong>${amount} PRAE</strong></span>
    <span style="color:var(--text-muted);">Price:</span><span>${price.toFixed(4)}</span>
    <span style="color:var(--text-muted);">Fee:</span><span>${fee.toFixed(3)}</span>
    <span style="color:var(--text-muted);">Total:</span><span>${totalCost.toFixed(2)} PRAE</span>
    <span style="color:var(--text-muted);">Est. Win:</span><span style="color:var(--success-color);">~${potentialWin.toFixed(2)} PRAE</span>
    ${remaining > 0 ? `<span style="color:var(--text-muted);">Status:</span><span style="color:var(--oracle-color);">🕒 ${remaining.toFixed(0)} PRAE waiting in order book</span>` : '<span style="color:var(--text-muted);">Status:</span><span style="color:var(--success-color);">✅ Fully filled</span>'}
    </div>
    <div style="display:flex;gap:8px;">
    <button onclick="navigator.clipboard.writeText('I just bet ${amount} PRAE on ${outcome.toUpperCase()}! ${window.location.origin}/test/#pred-${prediction?.id}')" style="flex:1;padding:8px;border-radius:20px;background:var(--accent-glow);color:var(--accent);border:1px solid var(--accent);cursor:pointer;font-size:.75rem;">📋 Share</button>
    <button onclick="this.closest('div[style*=z-index\\:5000]').remove()" style="flex:1;padding:8px;border-radius:20px;background:var(--accent);color:var(--bg);border:none;cursor:pointer;font-size:.75rem;">👁️ Close</button></div></div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

// ============================================================
// ORDER BOOK RENDERER
// ============================================================

function renderOrderBook(p) {
    const market = getMarket(p.id), depth = getOrderBookDepth(market), spread = getSpread(market);
    const currentPrice = getYesPrice(market);
    const maxVolume = Math.max(...depth.bids.map(b => b.amount), ...depth.asks.map(a => a.amount), 1);
    
    let html = `<div style="margin-top:12px;padding:12px;background:var(--card-bg);border-radius:12px;border:1px solid var(--border);">`;
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:.75rem;color:var(--accent);font-weight:600;">📊 Order Book</span><span style="font-size:.65rem;color:var(--text-muted);cursor:pointer;" onclick="event.stopPropagation();toggleOrderBook('${p.id}')">Hide</span></div>`;
    
    if (spread) {
        html += `<div style="text-align:center;margin-bottom:8px;font-size:.7rem;color:var(--text-muted);">Spread: <span style="color:var(--accent);">${spread.spread.toFixed(4)}</span> (${spread.spreadPercent.toFixed(2)}%)</div>`;
    }
    
    html += `<div style="margin-bottom:4px;"><div style="display:flex;justify-content:space-between;font-size:.6rem;color:var(--text-muted);padding:2px 0;"><span>Price</span><span>Amount</span><span>Total</span></div>`;
    
    let askCumulative = 0;
    [...depth.asks].reverse().forEach(a => { askCumulative += a.amount; const barWidth = (a.amount / maxVolume) * 100; html += `<div style="display:flex;justify-content:space-between;align-items:center;font-size:.65rem;padding:2px 0;position:relative;"><div style="position:absolute;right:0;top:0;bottom:0;background:rgba(239,68,68,0.1);width:${barWidth}%;border-radius:2px;"></div><span style="color:var(--error-color);z-index:1;">${a.price.toFixed(4)}</span><span style="z-index:1;">${a.amount.toFixed(0)}</span><span style="color:var(--text-muted);z-index:1;">${askCumulative.toFixed(0)}</span></div>`; });
    
    html += `<div style="text-align:center;padding:4px 0;border-top:2px solid var(--accent);border-bottom:2px solid var(--accent);margin:4px 0;"><span style="font-size:.8rem;font-weight:700;color:var(--accent);">${currentPrice.toFixed(4)} PRAE</span></div>`;
    
    let bidCumulative = 0;
    depth.bids.forEach(b => { bidCumulative += b.amount; const barWidth = (b.amount / maxVolume) * 100; html += `<div style="display:flex;justify-content:space-between;align-items:center;font-size:.65rem;padding:2px 0;position:relative;"><div style="position:absolute;right:0;top:0;bottom:0;background:rgba(16,185,129,0.1);width:${barWidth}%;border-radius:2px;"></div><span style="color:var(--success-color);z-index:1;">${b.price.toFixed(4)}</span><span style="z-index:1;">${b.amount.toFixed(0)}</span><span style="color:var(--text-muted);z-index:1;">${bidCumulative.toFixed(0)}</span></div>`; });
    html += `</div>`;
    
    const userOrders = getUserOpenOrders(p.id, walletAddress);
    if (userOrders.yes.length > 0 || userOrders.no.length > 0) {
        html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);"><div style="font-size:.65rem;color:var(--text-muted);margin-bottom:4px;">📋 Your Open Orders</div>`;
        userOrders.yes.forEach((o, i) => { const origIdx = market.yesBids.indexOf(o); html += `<div style="display:flex;justify-content:space-between;align-items:center;font-size:.65rem;padding:2px 0;"><span style="color:var(--success-color);">YES</span><span>${o.amount.toFixed(1)} @ ${o.price.toFixed(4)}</span><button onclick="event.stopPropagation();cancelMyOrder('${p.id}','yes',${origIdx})" style="background:transparent;border:1px solid var(--error-color);color:var(--error-color);border-radius:10px;padding:1px 6px;cursor:pointer;font-size:.6rem;">✕</button></div>`; });
        userOrders.no.forEach((o, i) => { const origIdx = market.noBids.indexOf(o); html += `<div style="display:flex;justify-content:space-between;align-items:center;font-size:.65rem;padding:2px 0;"><span style="color:var(--error-color);">NO</span><span>${o.amount.toFixed(1)} @ ${o.price.toFixed(4)}</span><button onclick="event.stopPropagation();cancelMyOrder('${p.id}','no',${origIdx})" style="background:transparent;border:1px solid var(--error-color);color:var(--error-color);border-radius:10px;padding:1px 6px;cursor:pointer;font-size:.6rem;">✕</button></div>`; });
        html += `</div>`;
    }
    html += `</div>`;
    return html;
}

function toggleOrderBook(id) { showOrderBook[id] = !showOrderBook[id]; renderPraedictions(); }

async function cancelMyOrder(id, outcome, index) {
    if (!confirm(`Cancel this ${outcome.toUpperCase()} order?`)) return;
    const result = cancelOrder(id, outcome, index);
    if (result.error) { showToast(result.error, 'error'); }
    else { showToast(`✅ Order cancelled. ${result.refunded.toFixed(2)} PRAE refunded.`, 'success'); await refreshAll(); }
}

// ============================================================
// ORACLE & RESOLVE
// ============================================================

async function oracleDecide(e) { const id = e.currentTarget.dataset.id; const o = Math.random() < 0.5 ? 'yes' : 'no'; const r = useRealMarket ? await buySharesReal(id, o, CONFIG.MIN_BET) : marketBuy(id, o, CONFIG.MIN_BET); if (r.error) showToast(r.error, 'error'); else showToast(`Oracle chose ${o.toUpperCase()}`, 'info'); await refreshAll(); }

async function resolveClick(e) {
    if (walletAddress !== CONFIG.ORACLE_WALLET) return showToast("Only Oracle", 'error');
    const id = e.currentTarget.dataset.id, outcome = e.currentTarget.dataset.outcome;
    if (!confirm(`Resolve to ${outcome?.toUpperCase()}?`)) return;
    try { if (outcome === 'unresolvable') await callSecureRpc('unresolvable', { predictionId: id }); else { await resolveAndPayout(id, outcome); await callSecureRpc('resolve', { predictionId: id, outcome }); } showToast(`Resolved!`, 'success'); await refreshAll(); } catch (err) { showToast('Failed', 'error'); }
}

async function resolveAndPayout(id, outcome) {
    const prediction = currentPredictions.find(p => p.id === id); if (!prediction) return;
    const bets = prediction.bets || [], winners = bets.filter(b => b.outcome === outcome), losers = bets.filter(b => b.outcome !== outcome);
    if (winners.length === 0) return;
    const pool = losers.reduce((s, b) => s + (b.amount || 0), 0), fee = pool * CONFIG.FEE_PER_TRADE, wp = pool - fee;
    const tws = winners.reduce((s, b) => s + (b.amount || 0), 0); if (tws === 0) return;
    const price = outcome === 'yes' ? getYesPrice(getMarket(id)) : 1 - getYesPrice(getMarket(id));
    const payouts = winners.map(w => {
        let amt = wp * ((w.amount || 0) / tws);
        if (w.user === walletAddress) { const mult = getStreakMultiplier(getWinStreak() + 1); if (mult > 1) { amt *= mult; showToast(`🔥 ${getWinStreak()+1} streak! ${mult}x!`, 'success'); } const bp = w.outcome === 'yes' ? price : 1 - price; if (bp < 0.3) { amt *= 1.5; showToast('🐺 Underdog +50%!', 'success'); } if (amt >= 50) { spawnConfetti(); showToast(`🎉 +${amt.toFixed(0)} PRAE!`, 'success'); } }
        return { user: w.user, amount: amt };
    });
    payouts.forEach(p => { if (p.user === walletAddress) { userPRAEBalance += p.amount; saveBalance(); } });
    prediction.payouts = payouts; prediction.claimed = false;
}

// ============================================================
// DAILY CHALLENGE & TEMPLATES
// ============================================================

function getDailyChallenge() { const c = [{ title:"Berlin above 25°C today?", cat:"weather", source:"weather_temp:Berlin", target:"25" },{ title:"BTC above $100K?", cat:"finance", source:"redstone_btc", target:"100000" },{ title:"ETH above $5K?", cat:"finance", source:"redstone_eth", target:"5000" },{ title:"SOL above $200?", cat:"finance", source:"redstone_sol", target:"200" },{ title:"Tesla above $350?", cat:"finance", source:"redstone_tsla", target:"350" },{ title:"Gold above $2500?", cat:"finance", source:"redstone_gold", target:"2500" },{ title:"London rain >5mm?", cat:"weather", source:"weather_rain:London", target:"5" }]; return c[getUTCDayKey().split('').reduce((s, ch) => s + ch.charCodeAt(0), 0) % c.length]; }
function renderDailyChallenge() { if (!DOM.dailyChallenge) return; const ch = getDailyChallenge(); DOM.dailyChallenge.innerHTML = `<div style="padding:12px;background:var(--accent-glow);border-radius:12px;margin-bottom:16px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="font-size:1.2rem;">🎯</span><strong style="color:var(--accent);">Daily Challenge</strong></div><div style="font-size:.9rem;margin-bottom:8px;">"${ch.title}"</div><button onclick="quickBetDaily()" style="padding:6px 16px;border-radius:20px;background:var(--accent);color:var(--bg);border:none;cursor:pointer;font-size:.75rem;">🎯 Quick Bet 7 PRAE</button></div>`; }
function quickBetDaily() { const c = getDailyChallenge(); DOM.title.value = c.title; DOM.category.value = c.cat; DOM.autoSource.value = c.source; DOM.targetValue.value = c.target; const t = new Date(); t.setDate(t.getDate()+1); t.setHours(23,59,0,0); DOM.resolutionDate.value = t.toISOString().slice(0,16); showToast("🎯 Challenge loaded!", 'success'); }
function renderProgressBars() { if (!DOM.progressBars) return; DOM.progressBars.innerHTML = `<div style="display:flex;gap:16px;font-size:.65rem;color:var(--text-muted);margin-bottom:8px;"><div style="flex:1;"><div style="display:flex;justify-content:space-between;"><span>🎯 Bets</span><span>${analyticsData.bets}/77</span></div><div style="background:var(--border);border-radius:4px;height:4px;margin-top:2px;"><div style="background:var(--accent);border-radius:4px;height:100%;width:${Math.min(100,(analyticsData.bets/77)*100)}%;"></div></div></div><div style="flex:1;"><div style="display:flex;justify-content:space-between;"><span>✨ Created</span><span>${analyticsData.creations}/3</span></div><div style="background:var(--border);border-radius:4px;height:4px;margin-top:2px;"><div style="background:var(--oracle-color);border-radius:4px;height:100%;width:${Math.min(100,(analyticsData.creations/3)*100)}%;"></div></div></div></div>`; }
function quickTemplate(type) { const t = { btc:{ title:"BTC above $____ by ____", cat:"finance", source:"redstone_btc" }, eth:{ title:"ETH above $____ by ____", cat:"finance", source:"redstone_eth" }, weather:{ title:"____ will be above ____°C tomorrow", cat:"weather", source:"weather_temp" }, sports:{ title:"____ will win against ____", cat:"sports", source:"sports_" }, movie:{ title:"____ grosses over $____", cat:"entertainment", source:"movie_" }, spacex:{ title:"SpaceX launches ____ by ____", cat:"space", source:"spacex_" } }[type]; if (!t) return; DOM.title.value = t.title; DOM.category.value = t.cat; DOM.autoSource.value = t.source; DOM.title.focus(); showToast('📝 Fill in the blanks!', 'info'); }

// ============================================================
// REACTIONS
// ============================================================

async function reactClick(e) { const btn = e.currentTarget, id = btn.dataset.id, emoji = btn.dataset.emoji; if (!isValidReaction(emoji)) return; const prediction = currentPredictions.find(p => p.id === id); if (!prediction) return; prediction.reactions = prediction.reactions || []; if (prediction.reactions.some(r => r.user === walletAddress)) return showToast("Already reacted", 'info'); prediction.reactions.push({ user: walletAddress, emoji }); const rect = btn.getBoundingClientRect(); animateReaction(emoji, rect.left + rect.width/2, rect.top); try { await callSecureRpc('react', { predictionId: id, reaction: emoji }); } catch (err) { console.debug('Reaction sync failed:', err); } updateReactionDisplay(prediction, btn.closest('.praediction-card')); }
function updateReactionDisplay(prediction, card) { if (!card) return; const g = {}; (prediction.reactions||[]).filter(r => isValidReaction(r.emoji)).forEach(r => { g[r.emoji] = (g[r.emoji]||0) + 1; }); CONFIG.ALLOWED_EMOJIS.forEach(e => { const b = card.querySelector(`.react-btn[data-emoji="${e}"]`); if (b) { const c = g[e]||0; b.innerHTML = c > 0 ? `${e} <span style="font-size:.7rem;color:var(--accent);">${c}</span>` : e; } }); }
function shareClick(e) { navigator.clipboard.writeText(e.target.dataset.url).then(() => showToast("Copied!", 'success')); }
function updatePayout(e) { const id = e.target.id.split('-')[1], amt = parseFloat(e.target.value)||CONFIG.MIN_BET, m = getMarket(id), p = getYesPrice(m); const el = document.getElementById(`payout-${id}`); if (el) el.textContent = `${(amt/(p||0.5)).toFixed(2)} YES`; const mx = document.getElementById(`maxbet-${id}`); if (mx) mx.textContent = getMaxBet(userPRAEBalance, p); }

loadOrderBooks();
