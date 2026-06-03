// ============================================================
// PRAEDICTA – Market & Trading (market.js) - FINAL v3
// ============================================================

const mockMarkets = {};

function getMarket(id) {
    if (!mockMarkets[id]) {
        const keys = Object.keys(mockMarkets);
        if (keys.length >= CONFIG.MAX_CACHED_MARKETS) delete mockMarkets[keys[0]];
        mockMarkets[id] = { yesBids: [], noBids: [], totalYes: 0, totalNo: 0, totalVolume: 0 };
    }
    return mockMarkets[id];
}

function getYesPrice(market) {
    const bestYes = market.yesBids.length > 0 ? market.yesBids[0].price : 0.50;
    const bestNo = market.noBids.length > 0 ? 1 - market.noBids[0].price : 0.50;
    return (bestYes + bestNo) / 2;
}

function getMaxBet(balance, price) {
    const maxWithFee = balance / (price * (1 + CONFIG.FEE_PER_TRADE));
    return Math.floor(maxWithFee);
}

function getPositionValue(id, user) {
    const market = getMarket(id);
    const userYesBids = market.yesBids.filter(b => b.user === user);
    const userNoBids = market.noBids.filter(b => b.user === user);
    const yesValue = userYesBids.reduce((s, b) => s + b.amount * getYesPrice(market), 0);
    const noValue = userNoBids.reduce((s, b) => s + b.amount * (1 - getYesPrice(market)), 0);
    return yesValue + noValue;
}

function placeLimitOrder(id, outcome, amount, price) {
    const market = getMarket(id);
    if (price <= 0.01 || price >= 0.99) return { error: 'Price must be between 0.02 and 0.98' };
    if (amount < CONFIG.MIN_BET) return { error: `Minimum is ${CONFIG.MIN_BET} PRAE` };
    const fee = (amount * price * CONFIG.FEE_PER_TRADE);
    const totalCost = (amount * price) + fee;
    if (userPRAEBalance < totalCost) return { error: `Need ${totalCost.toFixed(2)} PRAE (incl. ${fee.toFixed(2)} fee). You have ${userPRAEBalance.toFixed(2)}` };
    userPRAEBalance -= totalCost;
    saveBalance();
    const order = { user: walletAddress, amount, price, time: Date.now() };
    if (outcome === 'yes') { market.yesBids.push(order); market.yesBids.sort((a, b) => b.price - a.price); }
    else { market.noBids.push(order); market.noBids.sort((a, b) => b.price - a.price); }
    matchOrders(market);
    return { success: true, cost: totalCost, fee, price, amount };
}

function matchOrders(market) {
    for (let i = 0; i < market.yesBids.length; i++) {
        for (let j = 0; j < market.noBids.length; j++) {
            const yesBid = market.yesBids[i], noBid = market.noBids[j];
            if (yesBid.price + noBid.price >= 1) {
                const matchAmt = Math.min(yesBid.amount, noBid.amount);
                const matchPrice = (yesBid.price + (1 - noBid.price)) / 2;
                market.totalYes += matchAmt; market.totalNo += matchAmt;
                market.totalVolume += matchAmt * matchPrice;
                yesBid.amount -= matchAmt; noBid.amount -= matchAmt;
                if (yesBid.amount <= 0) { market.yesBids.splice(i, 1); i--; }
                if (noBid.amount <= 0) { market.noBids.splice(j, 1); j--; }
                if (yesBid.amount <= 0) break;
            }
        }
    }
}

function marketBuy(id, outcome, amount) { return placeLimitOrder(id, outcome, amount, 0.98); }
function buySharesMock(id, outcome, amount) { return marketBuy(id, outcome, amount); }
async function buySharesReal(id, outcome, amount) { showToast("⛓️ Real market coming soon!", 'info'); return { cost: 0 }; }

// ============================================================
// BUY CLICK - With fee, max bet, position value
// ============================================================

async function buyClick(e) {
    if (actionCooldown) return;
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    const outcome = btn.dataset.outcome;
    const amountInput = document.getElementById(`amount-${id}`);
    const amount = parseFloat(amountInput?.value) || CONFIG.MIN_BET;

    if (amount < CONFIG.MIN_BET) return showToast(`Minimum is ${CONFIG.MIN_BET} PRAE`, 'error');
    if (!['yes', 'no'].includes(outcome)) return;
    const prediction = currentPredictions.find(p => p.id === id);
    if (prediction?.creator === walletAddress) return showToast("Can't bet on your own prediction", 'error');

    const market = getMarket(id);
    const price = outcome === 'yes' ? getYesPrice(market) : 1 - getYesPrice(market);
    const fee = (amount * price * CONFIG.FEE_PER_TRADE);
    const totalCost = (amount * price) + fee;
    const maxBet = getMaxBet(userPRAEBalance, price);

    if (amount > maxBet) return showToast(`Max bet: ${maxBet} PRAE`, 'error');
    if (!confirm(`Bet ${amount} PRAE on ${outcome.toUpperCase()}?\n\nPrice: ${price.toFixed(4)} PRAE/share\nFee: ${fee.toFixed(3)} PRAE (0.5%)\nTotal: ${totalCost.toFixed(2)} PRAE`)) return;

    actionCooldown = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="loader"></span>';
    btn.disabled = true;

    try {
        const result = useRealMarket ? await buySharesReal(id, outcome, amount) : marketBuy(id, outcome, amount);
        if (result.error) { showToast(result.error, 'error'); }
        else {
            showToast(`✅ ${outcome.toUpperCase()} · ${price.toFixed(4)} PRAE · Fee: ${fee.toFixed(3)} · Total: ${totalCost.toFixed(2)}`, 'success');
            sounds.flip(); analyticsData.bets++;
            const card = btn.closest('.praediction-card');
            if (card) { card.classList.add('bet-pulse'); setTimeout(() => card.classList.remove('bet-pulse'), 600); }
            await refreshAll();
        }
    } catch (err) { showToast('Transaction failed', 'error'); }
    finally { btn.innerHTML = originalHTML; btn.disabled = false; actionCooldown = false; }
}

// ============================================================
// ORACLE + RESOLVE + PAYOUT
// ============================================================

async function oracleDecide(e) {
    const id = e.currentTarget.dataset.id;
    const outcome = Math.random() < 0.5 ? 'yes' : 'no';
    const amount = CONFIG.MIN_BET;
    const result = useRealMarket ? await buySharesReal(id, outcome, amount) : marketBuy(id, outcome, amount);
    if (result.error) showToast(result.error, 'error');
    else showToast(`Oracle chose ${outcome.toUpperCase()}`, 'info');
    await refreshAll();
}

async function resolveClick(e) {
    if (walletAddress !== CONFIG.ORACLE_WALLET) return showToast("Only Oracle can resolve", 'error');
    const id = e.currentTarget.dataset.id;
    const outcome = e.currentTarget.dataset.outcome;
    if (!confirm(`Resolve to ${outcome?.toUpperCase()}? Winners will be paid from losing pool.`)) return;

    try {
        if (outcome === 'unresolvable') {
            await callSecureRpc('unresolvable', { predictionId: id });
        } else {
            await resolveAndPayout(id, outcome);
            await callSecureRpc('resolve', { predictionId: id, outcome });
        }
        showToast(`Resolved ${outcome?.toUpperCase()}! Winners paid.`, 'success');
        sounds.win();
        await refreshAll();
    } catch (err) { showToast('Failed: ' + (err.message || 'unknown'), 'error'); }
}

async function resolveAndPayout(id, outcome) {
    const prediction = currentPredictions.find(p => p.id === id);
    if (!prediction) return;

    const bets = prediction.bets || [];
    const winners = bets.filter(b => b.outcome === outcome);
    const losers = bets.filter(b => b.outcome !== outcome);

    if (winners.length === 0) return;

    const losingPool = losers.reduce((sum, b) => sum + (b.amount || 0), 0);
    const fee = losingPool * CONFIG.FEE_PER_TRADE;
    const winningPool = losingPool - fee;
    const totalWinningShares = winners.reduce((sum, b) => sum + (b.amount || 0), 0);

    if (totalWinningShares === 0) return;

    const payouts = winners.map(w => {
        const share = (w.amount || 0) / totalWinningShares;
        return { user: w.user, amount: winningPool * share };
    });

    // Pay current user if they won
    payouts.forEach(p => {
        if (p.user === walletAddress) {
            userPRAEBalance += p.amount;
            saveBalance();
        }
    });

    // Mark prediction as having payouts calculated
    prediction.payouts = payouts;
    prediction.claimed = false;

    const winnerCount = winners.length;
    showToast(`💰 ${winnerCount} winner${winnerCount > 1 ? 's' : ''} paid ${winningPool.toFixed(2)} PRAE`, 'success');
}

// ============================================================
// REACTIONS + SHARE
// ============================================================

async function reactClick(e) {
    const btn = e.currentTarget; const id = btn.dataset.id; const emoji = btn.dataset.emoji;
    if (!isValidReaction(emoji)) return;
    const prediction = currentPredictions.find(p => p.id === id); if (!prediction) return;
    prediction.reactions = prediction.reactions || [];
    if (prediction.reactions.some(r => r.user === walletAddress)) return showToast("Already reacted", 'info');
    prediction.reactions.push({ user: walletAddress, emoji });
    try { await callSecureRpc('react', { predictionId: id, reaction: emoji }); } catch (err) {}
    updateReactionDisplay(prediction, btn.closest('.praediction-card'));
}

function updateReactionDisplay(prediction, card) {
    if (!card) return;
    const grouped = {};
    (prediction.reactions || []).filter(r => isValidReaction(r.emoji)).forEach(r => { grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; });
    CONFIG.ALLOWED_EMOJIS.forEach(emoji => {
        const btn = card.querySelector(`.react-btn[data-emoji="${emoji}"]`);
        if (btn) { const count = grouped[emoji] || 0; btn.innerHTML = count > 0 ? `${emoji} <span style="font-size:.7rem;color:var(--accent);">${count}</span>` : emoji; }
    });
}

function shareClick(e) { navigator.clipboard.writeText(e.target.dataset.url).then(() => showToast("Copied!", 'success')); }

function updatePayout(e) {
    const id = e.target.id.split('-')[1];
    const amount = parseFloat(e.target.value) || CONFIG.MIN_BET;
    const market = getMarket(id);
    const price = getYesPrice(market);
    const maxBet = getMaxBet(userPRAEBalance, price);
    const el = document.getElementById(`payout-${id}`);
    if (el) el.textContent = `${(amount / (price || 0.5)).toFixed(2)} YES`;
    const maxEl = document.getElementById(`maxbet-${id}`);
    if (maxEl) maxEl.textContent = maxBet;
}
