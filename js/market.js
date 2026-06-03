// ============================================================
// PRAEDICTA – Market & Trading (market.js) - FINAL v4
// Order Book + Price Charts + Payouts
// ============================================================

const mockMarkets = {};
const MAX_PRICE_HISTORY = 100;

function getMarket(id) {
    if (!mockMarkets[id]) {
        const keys = Object.keys(mockMarkets);
        if (keys.length >= CONFIG.MAX_CACHED_MARKETS) delete mockMarkets[keys[0]];
        mockMarkets[id] = {
            yesBids: [], noBids: [],
            totalYes: 0, totalNo: 0, totalVolume: 0,
            priceHistory: [{ price: 0.5, time: Date.now() }]
        };
    }
    return mockMarkets[id];
}

// Get current YES price from order book
function getYesPrice(market) {
    if (market.yesBids.length === 0 && market.noBids.length === 0) {
        // Use last known price
        const hist = market.priceHistory;
        return hist.length > 0 ? hist[hist.length - 1].price : 0.5;
    }
    const bestYes = market.yesBids.length > 0 ? market.yesBids[0].price : 0.50;
    const bestNo = market.noBids.length > 0 ? 1 - market.noBids[0].price : 0.50;
    return (bestYes + bestNo) / 2;
}

// Get max bet based on balance
function getMaxBet(balance, price) {
    if (price <= 0) return 0;
    const maxWithFee = balance / (price * (1 + CONFIG.FEE_PER_TRADE));
    return Math.floor(maxWithFee);
}

// Get user's position value
function getPositionValue(id, user) {
    const market = getMarket(id);
    const price = getYesPrice(market);
    const userYesBids = market.yesBids.filter(b => b.user === user);
    const userNoBids = market.noBids.filter(b => b.user === user);
    const yesValue = userYesBids.reduce((s, b) => s + b.amount * price, 0);
    const noValue = userNoBids.reduce((s, b) => s + b.amount * (1 - price), 0);
    return yesValue + noValue;
}

// Place a limit order
function placeLimitOrder(id, outcome, amount, price) {
    const market = getMarket(id);

    if (price <= 0.01 || price >= 0.99) return { error: 'Price must be between 0.02 and 0.98' };
    if (amount < CONFIG.MIN_BET) return { error: `Minimum is ${CONFIG.MIN_BET} PRAE` };

    const fee = (amount * price * CONFIG.FEE_PER_TRADE);
    const totalCost = (amount * price) + fee;

    if (userPRAEBalance < totalCost) {
        return { error: `Need ${totalCost.toFixed(2)} PRAE (incl. ${fee.toFixed(2)} fee). You have ${userPRAEBalance.toFixed(2)}` };
    }

    userPRAEBalance -= totalCost;
    saveBalance();

    const order = { user: walletAddress, amount, price, time: Date.now() };

    // Insert in sorted position (maintains sort order)
    if (outcome === 'yes') {
        const insertAt = market.yesBids.findIndex(b => b.price < price);
        if (insertAt === -1) market.yesBids.push(order);
        else market.yesBids.splice(insertAt, 0, order);
    } else {
        const insertAt = market.noBids.findIndex(b => b.price < price);
        if (insertAt === -1) market.noBids.push(order);
        else market.noBids.splice(insertAt, 0, order);
    }

    // Match orders
    matchOrders(market);

    // Record price history
    const currentPrice = getYesPrice(market);
    market.priceHistory.push({ price: currentPrice, time: Date.now() });
    if (market.priceHistory.length > MAX_PRICE_HISTORY) market.priceHistory.shift();

    return { success: true, cost: totalCost, fee, price, amount };
}

// Match overlapping orders (optimized single pass)
function matchOrders(market) {
    let yesIdx = 0, noIdx = 0;

    while (yesIdx < market.yesBids.length && noIdx < market.noBids.length) {
        const yesBid = market.yesBids[yesIdx];
        const noBid = market.noBids[noIdx];

        if (yesBid.price + noBid.price >= 1) {
            const matchAmt = Math.min(yesBid.amount, noBid.amount);
            const matchPrice = (yesBid.price + (1 - noBid.price)) / 2;

            market.totalYes += matchAmt;
            market.totalNo += matchAmt;
            market.totalVolume += matchAmt * matchPrice;

            yesBid.amount -= matchAmt;
            noBid.amount -= matchAmt;

            if (yesBid.amount <= 0) {
                market.yesBids.splice(yesIdx, 1);
                // Don't increment yesIdx since splice shifted array
            } else {
                yesIdx++;
            }

            if (noBid.amount <= 0) {
                market.noBids.splice(noIdx, 1);
            } else {
                noIdx++;
            }

            if (yesBid.amount <= 0 && noBid.amount <= 0) {
                // Both consumed, continue from current positions
            }
        } else if (yesBid.price > noBid.price) {
            yesIdx++;
        } else {
            noIdx++;
        }
    }
}

// Market buy (fill at best available)
function marketBuy(id, outcome, amount) {
    return placeLimitOrder(id, outcome, amount, outcome === 'yes' ? 0.98 : 0.98);
}

function buySharesMock(id, outcome, amount) {
    return marketBuy(id, outcome, amount);
}

async function buySharesReal(id, outcome, amount) {
    showToast("⛓️ Real market coming soon!", 'info');
    return { cost: 0 };
}

// Get order book display
function getOrderBook(id) {
    const market = getMarket(id);
    return {
        yesBids: market.yesBids.slice(0, 5),
        noBids: market.noBids.slice(0, 5),
        price: getYesPrice(market),
        volume: market.totalVolume,
        spread: market.yesBids.length > 0 && market.noBids.length > 0
        ? (market.yesBids[0].price - (1 - market.noBids[0].price)).toFixed(4)
        : 'N/A',
        priceHistory: market.priceHistory
    };
}

// ============================================================
// BUY CLICK - With fee, max bet, position, confirmation
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

    if (amount > maxBet) return showToast(`Max bet: ${maxBet} PRAE (balance: ${userPRAEBalance.toFixed(1)})`, 'error');
    if (!confirm(`Bet ${amount} PRAE on ${outcome.toUpperCase()}?\n\nPrice: ${price.toFixed(4)} PRAE/share\nFee: ${fee.toFixed(3)} PRAE (0.5%)\nTotal: ${totalCost.toFixed(2)} PRAE\n\nThis cannot be undone.`)) return;

    actionCooldown = true;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="loader"></span>';
    btn.disabled = true;

    try {
        const result = useRealMarket
        ? await buySharesReal(id, outcome, amount)
        : marketBuy(id, outcome, amount);

        if (result.error) {
            showToast(result.error, 'error');
        } else {
            showToast(`✅ ${outcome.toUpperCase()} · ${price.toFixed(4)} PRAE · Fee: ${fee.toFixed(3)} · Total: ${totalCost.toFixed(2)}`, 'success');
            sounds.flip();
            analyticsData.bets++;

            const card = btn.closest('.praediction-card');
            if (card) {
                card.classList.add('bet-pulse');
                setTimeout(() => card.classList.remove('bet-pulse'), 600);
                // Update price chart on card
                const chartContainer = card.querySelector('.price-chart-container');
                if (chartContainer) {
                    chartContainer.innerHTML = renderPriceChart(getMarket(id), id);
                }
            }
            await refreshAll();
        }
    } catch (err) {
        showToast('Transaction failed', 'error');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        actionCooldown = false;
    }
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
    } catch (err) {
        showToast('Failed: ' + (err.message || 'unknown'), 'error');
    }
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

    payouts.forEach(p => {
        if (p.user === walletAddress) {
            userPRAEBalance += p.amount;
            saveBalance();
        }
    });

    prediction.payouts = payouts;
    prediction.claimed = false;

    const winnerCount = winners.length;
    showToast(`💰 ${winnerCount} winner${winnerCount > 1 ? 's' : ''} paid ${winningPool.toFixed(2)} PRAE`, 'success');
}

// ============================================================
// PRICE CHART (Sparkline)
// ============================================================

function renderPriceChart(market, id) {
    const history = market.priceHistory;
    if (!history || history.length < 2) return '';

    const data = history.slice(-30);
    const max = Math.max(...data.map(h => h.price));
    const min = Math.min(...data.map(h => h.price));
    const range = max - min || 0.01;
    const height = 40;
    const width = data.length * 6;

    const points = data.map((h, i) => {
        const x = i * 6;
        const y = height - ((h.price - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const firstPrice = data[0].price;
    const lastPrice = data[data.length - 1].price;
    const change = lastPrice - firstPrice;
    const changeColor = change > 0 ? 'var(--success-color)' : change < 0 ? 'var(--error-color)' : 'var(--text-muted)';
    const changeIcon = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
    const changePercent = firstPrice > 0 ? ((change / firstPrice) * 100).toFixed(1) : '0.0';

    return `<div class="price-chart-container" style="margin-top:8px; padding:8px; background:var(--card-bg); border-radius:8px;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
    <span style="font-size:.65rem; color:var(--text-muted);">Price Trend</span>
    <span style="font-size:.65rem; color:${changeColor};">${changeIcon} ${change > 0 ? '+' : ''}${changePercent}%</span>
    </div>
    <svg width="${width}" height="${height}" style="display:block; overflow:visible;">
    <polyline points="${points}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <div style="display:flex; justify-content:space-between; font-size:.55rem; color:var(--text-muted); margin-top:2px;">
    <span>${timeAgo(data[0].time)}</span>
    <span>${lastPrice.toFixed(4)} PRAE</span>
    </div>
    </div>`;
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
