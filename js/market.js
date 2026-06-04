// ============================================================
// PRAEDICTA – Market & Trading (market.js) - FINAL v7
// All game mechanics + polish
// ============================================================

const mockMarkets = {};
const MAX_PRICE_HISTORY = 100;

function getMarket(id) {
    if (!mockMarkets[id]) {
        const keys = Object.keys(mockMarkets);
        if (keys.length >= CONFIG.MAX_CACHED_MARKETS) delete mockMarkets[keys[0]];
        mockMarkets[id] = { yesBids: [], noBids: [], totalYes: 0, totalNo: 0, totalVolume: 0, priceHistory: [{ price: 0.5, time: Date.now() }], firstBetUser: null };
    }
    return mockMarkets[id];
}

function getYesPrice(market) {
    if (market.yesBids.length === 0 && market.noBids.length === 0) { const h = market.priceHistory; return h.length > 0 ? h[h.length-1].price : 0.5; }
    return ((market.yesBids[0]?.price || 0.5) + (1 - (market.noBids[0]?.price || 0.5))) / 2;
}

function getMaxBet(balance, price) { return price <= 0 ? 0 : Math.floor(balance / (price * (1 + CONFIG.FEE_PER_TRADE))); }

function getPositionValue(id, user) {
    const m = getMarket(id); const p = getYesPrice(m);
    return m.yesBids.filter(b => b.user === user).reduce((s, b) => s + b.amount * p, 0) + m.noBids.filter(b => b.user === user).reduce((s, b) => s + b.amount * (1 - p), 0);
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
    const el = document.createElement('div');
    el.textContent = emoji;
    el.style.cssText = `position:fixed;left:${x}px;top:${y}px;font-size:1.5rem;z-index:9999;pointer-events:none;animation:floatUp 1.5s ease-out forwards;`;
    document.body.appendChild(el); setTimeout(() => el.remove(), 1500);
}

function showBetReceipt(prediction, outcome, amount, price, fee, totalCost, potentialWin) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:5000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `<div style="background:var(--bg);border:1px solid var(--accent);border-radius:20px;max-width:400px;width:90%;padding:24px;text-align:center;">
    <div style="font-size:2rem;">✅</div><h3 style="color:var(--accent);margin:8px 0;">Bet Confirmed!</h3>
    <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:12px;">${escapeHtml(prediction.title).slice(0, 60)}...</div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:.8rem;text-align:left;margin-bottom:16px;">
    <span style="color:var(--text-muted);">Bet:</span><span><strong>${outcome.toUpperCase()} · ${amount} PRAE</strong></span>
    <span style="color:var(--text-muted);">Price:</span><span>${price.toFixed(4)}</span>
    <span style="color:var(--text-muted);">Fee:</span><span>${fee.toFixed(3)}</span>
    <span style="color:var(--text-muted);">Total:</span><span>${totalCost.toFixed(2)}</span>
    <span style="color:var(--text-muted);">Win:</span><span style="color:var(--success-color);">~${potentialWin.toFixed(2)} PRAE</span></div>
    <div style="display:flex;gap:8px;">
    <button onclick="navigator.clipboard.writeText('I just bet ${amount} PRAE on ${outcome.toUpperCase()}! ${window.location.origin}/test/#pred-${prediction.id}')" style="flex:1;padding:8px;border-radius:20px;background:var(--accent-glow);color:var(--accent);border:1px solid var(--accent);cursor:pointer;font-size:.75rem;">📋 Share</button>
    <button onclick="this.closest('div[style*=z-index\\:5000]').remove()" style="flex:1;padding:8px;border-radius:20px;background:var(--accent);color:var(--bg);border:none;cursor:pointer;font-size:.75rem;">👁️ Close</button></div></div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

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
    if (userPRAEBalance < totalCost) return { error: `Need ${totalCost.toFixed(2)} PRAE` };
    userPRAEBalance -= totalCost; saveBalance();
    const order = { user: walletAddress, amount, price, time: Date.now() };
    if (outcome === 'yes') { const i = market.yesBids.findIndex(b => b.price < price); if (i === -1) market.yesBids.push(order); else market.yesBids.splice(i, 0, order); }
    else { const i = market.noBids.findIndex(b => b.price < price); if (i === -1) market.noBids.push(order); else market.noBids.splice(i, 0, order); }
    matchOrders(market);
    const cp = getYesPrice(market); market.priceHistory.push({ price: cp, time: Date.now() }); if (market.priceHistory.length > MAX_PRICE_HISTORY) market.priceHistory.shift();
    if (amount >= 50) { showToast(`🤯 BIG BET: ${amount} PRAE on ${outcome.toUpperCase()}!`, 'info'); try { const a = new AudioContext(); const o = a.createOscillator(); o.type='triangle'; o.frequency.value=200; o.connect(a.destination); o.start(); o.stop(a.currentTime+0.5); } catch(e){} }
    return { success: true, cost: totalCost, fee, price, amount, discount, bonus };
}

function matchOrders(market) {
    let yi = 0, ni = 0;
    while (yi < market.yesBids.length && ni < market.noBids.length) {
        const yb = market.yesBids[yi], nb = market.noBids[ni];
        if (yb.price + nb.price >= 1) {
            const amt = Math.min(yb.amount, nb.amount), mp = (yb.price + (1 - nb.price)) / 2;
            market.totalYes += amt; market.totalNo += amt; market.totalVolume += amt * mp;
            yb.amount -= amt; nb.amount -= amt;
            if (yb.amount <= 0) market.yesBids.splice(yi, 1); else yi++;
            if (nb.amount <= 0) market.noBids.splice(ni, 1); else ni++;
        } else if (yb.price > nb.price) yi++; else ni++;
    }
}

function marketBuy(id, outcome, amount) { return placeLimitOrder(id, outcome, amount, 0.98); }
function buySharesMock(id, outcome, amount) { return marketBuy(id, outcome, amount); }
async function buySharesReal(id, outcome, amount) { showToast("⛓️ Real market coming soon!", 'info'); return { cost: 0 }; }

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
            showBetReceipt(prediction, outcome, amount, price, fee, totalCost, pw);
            sounds.flip(); analyticsData.bets++;
            if (navigator.vibrate) navigator.vibrate(50);
            const card = btn.closest('.praediction-card');
            if (card) { card.classList.add('bet-pulse'); setTimeout(() => card.classList.remove('bet-pulse'), 600); }
            await refreshAll();
        }
    } catch (err) { showToast('Failed', 'error'); }
    finally { btn.innerHTML = orig; btn.disabled = false; actionCooldown = false; }
}

async function oracleDecide(e) { const id = e.currentTarget.dataset.id; const o = Math.random() < 0.5 ? 'yes' : 'no'; const r = useRealMarket ? await buySharesReal(id, o, CONFIG.MIN_BET) : marketBuy(id, o, CONFIG.MIN_BET); if (r.error) showToast(r.error, 'error'); else showToast(`Oracle chose ${o.toUpperCase()}`, 'info'); await refreshAll(); }

async function resolveClick(e) {
    if (walletAddress !== CONFIG.ORACLE_WALLET) return showToast("Only Oracle", 'error');
    const id = e.currentTarget.dataset.id, outcome = e.currentTarget.dataset.outcome;
    if (!confirm(`Resolve to ${outcome?.toUpperCase()}?`)) return;
    try { if (outcome === 'unresolvable') await callSecureRpc('unresolvable', { predictionId: id }); else { await resolveAndPayout(id, outcome); await callSecureRpc('resolve', { predictionId: id, outcome }); } showToast(`Resolved!`, 'success'); sounds.win(); await refreshAll(); } catch (err) { showToast('Failed', 'error'); }
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
        if (w.user === walletAddress) {
            const mult = getStreakMultiplier(getWinStreak() + 1); if (mult > 1) { amt *= mult; showToast(`🔥 ${getWinStreak()+1} streak! ${mult}x!`, 'success'); }
            const bp = w.outcome === 'yes' ? price : 1 - price; if (bp < 0.3) { amt *= 1.5; showToast('🐺 Underdog +50%!', 'success'); }
            if (amt >= 50) { spawnConfetti(); showToast(`🎉 +${amt.toFixed(0)} PRAE!`, 'success'); }
        }
        return { user: w.user, amount: amt };
    });
    const myBet = bets.find(b => b.user === walletAddress);
    if (myBet && myBet.outcome !== outcome && price > 0.45 && price < 0.55) showToast('😱 So close! 50/50!', 'info');
    payouts.forEach(p => { if (p.user === walletAddress) { userPRAEBalance += p.amount; saveBalance(); } });
    prediction.payouts = payouts; prediction.claimed = false;
}

function getDailyChallenge() {
    const c = [{ title:"Berlin above 25°C today?", cat:"weather", source:"weather_temp:Berlin", target:"25" },{ title:"BTC above $100K?", cat:"finance", source:"redstone_btc", target:"100000" },{ title:"ETH above $5K?", cat:"finance", source:"redstone_eth", target:"5000" },{ title:"SOL above $200?", cat:"finance", source:"redstone_sol", target:"200" },{ title:"Tesla above $350?", cat:"finance", source:"redstone_tsla", target:"350" },{ title:"Gold above $2500?", cat:"finance", source:"redstone_gold", target:"2500" },{ title:"London rain >5mm?", cat:"weather", source:"weather_rain:London", target:"5" }];
    return c[getUTCDayKey().split('').reduce((s, ch) => s + ch.charCodeAt(0), 0) % c.length];
}

function renderDailyChallenge() {
    if (!DOM.dailyChallenge) return; const ch = getDailyChallenge();
    DOM.dailyChallenge.innerHTML = `<div style="padding:12px;background:var(--accent-glow);border-radius:12px;margin-bottom:16px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="font-size:1.2rem;">🎯</span><strong style="color:var(--accent);">Daily Challenge</strong></div><div style="font-size:.9rem;margin-bottom:8px;">"${ch.title}"</div><button onclick="quickBetDaily()" style="padding:6px 16px;border-radius:20px;background:var(--accent);color:var(--bg);border:none;cursor:pointer;font-size:.75rem;">🎯 Quick Bet 7 PRAE</button></div>`;
}

function quickBetDaily() { const c = getDailyChallenge(); DOM.title.value = c.title; DOM.category.value = c.cat; DOM.autoSource.value = c.source; DOM.targetValue.value = c.target; const t = new Date(); t.setDate(t.getDate()+1); t.setHours(23,59,0,0); DOM.resolutionDate.value = t.toISOString().slice(0,16); showToast("🎯 Challenge loaded!", 'success'); }

function renderProgressBars() {
    if (!DOM.progressBars) return;
    DOM.progressBars.innerHTML = `<div style="display:flex;gap:16px;font-size:.65rem;color:var(--text-muted);margin-bottom:8px;"><div style="flex:1;"><div style="display:flex;justify-content:space-between;"><span>🎯 Bets</span><span>${analyticsData.bets}/77</span></div><div style="background:var(--border);border-radius:4px;height:4px;margin-top:2px;"><div style="background:var(--accent);border-radius:4px;height:100%;width:${Math.min(100,(analyticsData.bets/77)*100)}%;"></div></div></div><div style="flex:1;"><div style="display:flex;justify-content:space-between;"><span>✨ Created</span><span>${analyticsData.creations}/3</span></div><div style="background:var(--border);border-radius:4px;height:4px;margin-top:2px;"><div style="background:var(--oracle-color);border-radius:4px;height:100%;width:${Math.min(100,(analyticsData.creations/3)*100)}%;"></div></div></div></div>`;
}

function quickTemplate(type) {
    const t = { btc:{ title:"BTC above $____ by ____", cat:"finance", source:"redstone_btc" }, eth:{ title:"ETH above $____ by ____", cat:"finance", source:"redstone_eth" }, weather:{ title:"____ will be above ____°C tomorrow", cat:"weather", source:"weather_temp" }, sports:{ title:"____ will win against ____", cat:"sports", source:"sports_" }, movie:{ title:"____ grosses over $____", cat:"entertainment", source:"movie_" }, spacex:{ title:"SpaceX launches ____ by ____", cat:"space", source:"spacex_" } }[type];
    if (!t) return; DOM.title.value = t.title; DOM.category.value = t.cat; DOM.autoSource.value = t.source; DOM.title.focus(); showToast('📝 Fill in the blanks!', 'info');
}

async function reactClick(e) {
    const btn = e.currentTarget, id = btn.dataset.id, emoji = btn.dataset.emoji;
    if (!isValidReaction(emoji)) return;
    const prediction = currentPredictions.find(p => p.id === id); if (!prediction) return;
    prediction.reactions = prediction.reactions || [];
    if (prediction.reactions.some(r => r.user === walletAddress)) return showToast("Already reacted", 'info');
    prediction.reactions.push({ user: walletAddress, emoji });
    const rect = btn.getBoundingClientRect(); animateReaction(emoji, rect.left + rect.width/2, rect.top);
    try { await callSecureRpc('react', { predictionId: id, reaction: emoji }); } catch (err) {}
    updateReactionDisplay(prediction, btn.closest('.praediction-card'));
}

function updateReactionDisplay(prediction, card) { if (!card) return; const g = {}; (prediction.reactions||[]).filter(r => isValidReaction(r.emoji)).forEach(r => { g[r.emoji] = (g[r.emoji]||0) + 1; }); CONFIG.ALLOWED_EMOJIS.forEach(e => { const b = card.querySelector(`.react-btn[data-emoji="${e}"]`); if (b) { const c = g[e]||0; b.innerHTML = c > 0 ? `${e} <span style="font-size:.7rem;color:var(--accent);">${c}</span>` : e; } }); }
function shareClick(e) { navigator.clipboard.writeText(e.target.dataset.url).then(() => showToast("Copied!", 'success')); }
function updatePayout(e) { const id = e.target.id.split('-')[1], amt = parseFloat(e.target.value)||CONFIG.MIN_BET, m = getMarket(id), p = getYesPrice(m); const el = document.getElementById(`payout-${id}`); if (el) el.textContent = `${(amt/(p||0.5)).toFixed(2)} YES`; const mx = document.getElementById(`maxbet-${id}`); if (mx) mx.textContent = getMaxBet(userPRAEBalance, p); }
function renderPriceChart(market, id) { const h = market.priceHistory; if (!h || h.length < 2) return ''; const d = h.slice(-20), mx = Math.max(...d.map(x => x.price)), mn = Math.min(...d.map(x => x.price)), r = mx-mn||0.01, pts = d.map((p,i) => `${i*8},${40-((p.price-mn)/r)*40}`).join(' '), ch = d[d.length-1].price-d[0].price, cc = ch>0?'var(--success-color)':ch<0?'var(--error-color)':'var(--text-muted)'; return `<div style="margin-top:8px;padding:8px;background:var(--card-bg);border-radius:8px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><span style="font-size:.7rem;color:var(--text-muted);">Price</span><span style="font-size:.7rem;color:${cc};">${ch>0?'📈':ch<0?'📉':'➡️'} ${ch>0?'+':''}${ch.toFixed(4)}</span></div><svg width="${d.length*8}" height="40"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="1.5"/></svg></div>`; }
