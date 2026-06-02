// ============================================================
// PRAEDICTA – Market & Trading Logic
// ============================================================

const mockMarkets = {};
const MOCK_INITIAL_POOL = 1000;

function getMarket(id) { if (!mockMarkets[id]) { const keys = Object.keys(mockMarkets); if (keys.length >= CONFIG.MAX_CACHED_MARKETS) delete mockMarkets[keys[0]]; mockMarkets[id] = { yesPool: MOCK_INITIAL_POOL, noPool: MOCK_INITIAL_POOL }; } return mockMarkets[id]; }
function getYesPrice(yes, no) { return (yes + no === 0) ? 0.5 : no / (yes + no); }

function buySharesMock(id, outcome, amount) {
    const market = getMarket(id);
    const price = outcome === 'yes' ? getYesPrice(market.yesPool, market.noPool) : 1 - getYesPrice(market.yesPool, market.noPool);
    const cost = amount * price;
    if (userPRAEBalance < cost) return { error: 'Insufficient PRAE balance.' };
    userPRAEBalance -= cost; saveBalance();
    if (outcome === 'yes') { market.yesPool += amount; market.noPool = (market.yesPool * market.noPool) / market.yesPool; }
    else { market.noPool += amount; market.yesPool = (market.yesPool * market.noPool) / market.noPool; }
    return { cost, shares: amount };
}

async function buySharesReal(id, outcome, amount) { showToast("⛓️ Real market coming soon!"); return { cost: 0, shares: 0 }; }

async function buyClick(e) {
    if (actionCooldown) return; const btn = e.currentTarget; const id = btn.dataset.id; const outcome = btn.dataset.outcome;
    const amountInput = document.getElementById(`amount-${id}`); const amount = parseFloat(amountInput?.value) || CONFIG.MIN_BET;
    if (amount < CONFIG.MIN_BET) return showToast(`Minimum bet is ${CONFIG.MIN_BET} PRAE.`);
    if (!['yes', 'no'].includes(outcome)) return;
    const prediction = currentPredictions.find(p => p.id === id);
    if (prediction && prediction.creator === walletAddress) return showToast("You can't bet on your own prediction");
    actionCooldown = true; setLoading(btn, true);
    try { const result = useRealMarket ? await buySharesReal(id, outcome, amount) : buySharesMock(id, outcome, amount); if (result.error) showToast(result.error); else { showToast(`Bought ${result.shares.toFixed(2)} ${outcome.toUpperCase()} shares for ${result.cost.toFixed(2)} PRAE.`); await refreshAll(); } }
    catch (err) { console.error('Buy error:', err); showToast('Transaction failed.'); }
    finally { setLoading(btn, false); actionCooldown = false; }
}

async function oracleDecide(e) { const id = e.currentTarget.dataset.id; const outcome = Math.random() < 0.5 ? 'yes' : 'no'; const amount = CONFIG.MIN_BET; const result = useRealMarket ? await buySharesReal(id, outcome, amount) : buySharesMock(id, outcome, amount); if (result.error) showToast(result.error); else showToast(`Oracle chose ${outcome.toUpperCase()} – bought ${result.shares.toFixed(2)} shares.`); await refreshAll(); }

async function resolveClick(e) {
    if (walletAddress !== CONFIG.ORACLE_WALLET) return showToast("Only Oracle can resolve.");
    const id = e.currentTarget.dataset.id; const outcome = e.currentTarget.dataset.outcome;
    if (outcome === 'unresolvable') { if (!confirm("Mark as UNRESOLVABLE? All bets refunded.")) return; }
    else { if (!confirm(`Resolve to ${outcome.toUpperCase()}?`)) return; }
    try { if (outcome === 'unresolvable') await callSecureRpc('unresolvable', { predictionId: id }); else await callSecureRpc('resolve', { predictionId: id, outcome }); showToast(outcome === 'unresolvable' ? "Marked unresolvable" : `Resolved ${outcome.toUpperCase()}!`); await refreshAll(); }
    catch (err) { console.error('Resolve error:', err); showToast('Failed to resolve.'); }
}

async function reactClick(e) {
    const btn = e.currentTarget; const id = btn.dataset.id; const emoji = btn.dataset.emoji;
    if (!isValidReaction(emoji)) return;
    const prediction = currentPredictions.find(p => p.id === id); if (!prediction) return;
    prediction.reactions = prediction.reactions || [];
    if (prediction.reactions.some(r => r.user === walletAddress)) return showToast("You already reacted");
    prediction.reactions.push({ user: walletAddress, emoji });
    try { await callSecureRpc('react', { predictionId: id, reaction: emoji }); } catch (err) { console.error('Reaction failed:', err); }
    updateReactionDisplay(prediction, btn.closest('.praediction-card'));
}

function updateReactionDisplay(prediction, card) { if (!card) return; const grouped = {}; (prediction.reactions || []).filter(r => isValidReaction(r.emoji)).forEach(r => { grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; }); CONFIG.ALLOWED_EMOJIS.forEach(emoji => { const btn = card.querySelector(`.react-btn[data-emoji="${emoji}"]`); if (btn) { const count = grouped[emoji] || 0; btn.innerHTML = count > 0 ? `${emoji} <span style="font-size:.7rem;color:var(--accent);">${count}</span>` : emoji; } }); }

function shareClick(e) { navigator.clipboard.writeText(e.target.dataset.url).then(() => showToast("Link copied!")); }

function updatePayout(e) { const id = e.target.id.split('-')[1]; const amount = parseFloat(e.target.value) || CONFIG.MIN_BET; const market = getMarket(id); const price = getYesPrice(market.yesPool, market.noPool); const el = document.getElementById(`payout-${id}`); if (el) el.textContent = `${(amount / (price || 0.5)).toFixed(2)} YES`; }
