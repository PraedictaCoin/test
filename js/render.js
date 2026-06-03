// ============================================================
// PRAEDICTA – Rendering Functions
// ============================================================

function renderPraedictions() {
    const container = DOM.praedictionsContainer; if (!container) return;

    let filtered = currentPredictions.filter(p => {
        if (currentFilter.category !== 'all' && p.category !== currentFilter.category) return false;
        if (currentFilter.search && !p.title.toLowerCase().includes(currentFilter.search.toLowerCase())) return false;
        if (currentFilter.status === 'active') return p.status === 'active';
        if (currentFilter.status === 'expired') return p.status === 'expired';
        if (currentFilter.status === 'resolved') return p.status === 'resolved';
        if (currentFilter.status === 'ending-soon') return p.status === 'active' && p.resolution_date && new Date(p.resolution_date) > Date.now();
        return true;
    });

    // Sort ending soon
    if (currentFilter.status === 'ending-soon') {
        filtered.sort((a, b) => new Date(a.resolution_date) - new Date(b.resolution_date));
    }

    // Empty state for brand new database
    if (currentPredictions.length === 0 && currentFilter.status === 'active' && currentFilter.category === 'all' && !currentFilter.search) {
        container.innerHTML = `<div style="text-align:center;padding:40px;grid-column:1/-1;"><div style="font-size:3rem;">🔮</div><h3 style="color:var(--accent);margin-top:8px;">The Oracle awaits your first praediction</h3><p style="color:var(--text-muted);margin:16px 0;line-height:1.6;">1. Describe what will happen<br>2. Provide a proof URL<br>3. Choose YES or NO<br>4. Stake 7 PRAE<br>5. Earn SeerScore when you're right!</p></div>`;
        if (DOM.expiredContainer) DOM.expiredContainer.innerHTML = '';
        if (DOM.resolvedContainer) DOM.resolvedContainer.innerHTML = '';
        if (DOM.loadMoreBtn) DOM.loadMoreBtn.style.display = 'none';
        return;
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;grid-column:1/-1;color:var(--text-muted);">No praedictions match your filters.</div>';
        if (DOM.resolvedContainer) DOM.resolvedContainer.innerHTML = '';
        if (DOM.expiredContainer) DOM.expiredContainer.innerHTML = '';
        return;
    }

    const activeOnly = filtered.filter(p => p.status === 'active');
    const expiredOnly = filtered.filter(p => p.status === 'expired');
    const resolvedOnly = filtered.filter(p => p.status === 'resolved');
    const isOracle = (walletAddress === CONFIG.ORACLE_WALLET);

    if (currentFilter.status === 'expired') {
        container.innerHTML = expiredOnly.length > 0 ? expiredOnly.map(p => renderPredictionCard(p, isOracle)).join('') : '<div style="text-align:center;padding:40px;grid-column:1/-1;color:var(--text-muted);">No expired predictions.</div>';
        if (DOM.resolvedContainer) DOM.resolvedContainer.innerHTML = '';
    } else if (currentFilter.status === 'resolved') {
        container.innerHTML = resolvedOnly.length > 0 ? resolvedOnly.map(p => renderPredictionCard(p, isOracle)).join('') : '<div style="text-align:center;padding:40px;grid-column:1/-1;color:var(--text-muted);">No resolved predictions.</div>';
        if (DOM.expiredContainer) DOM.expiredContainer.innerHTML = '';
    } else {
        container.innerHTML = activeOnly.length > 0 ? activeOnly.map(p => renderPredictionCard(p, isOracle)).join('') : '<div style="text-align:center;padding:40px;grid-column:1/-1;color:var(--text-muted);">No active praedictions. Create one below!</div>';
        if (DOM.expiredContainer) {
            DOM.expiredContainer.innerHTML = expiredOnly.length > 0 ? '<h3 style="color:var(--accent);margin-bottom:12px;">🕒 Expired – Awaiting Resolution</h3>' + expiredOnly.map(p => renderPredictionCard(p, isOracle)).join('') : '';
        }
        if (DOM.resolvedContainer) {
            DOM.resolvedContainer.innerHTML = resolvedOnly.length > 0 ? '<h3 style="color:var(--accent);margin-bottom:12px;">✅ Resolved Predictions</h3>' + resolvedOnly.map(p => renderPredictionCard(p, isOracle)).join('') : '';
        }
    }

    const allContainers = [container, DOM.resolvedContainer, DOM.expiredContainer].filter(Boolean);
    allContainers.forEach(cont => {
        cont.querySelectorAll('.buy-btn').forEach(btn => btn.addEventListener('click', buyClick));
        cont.querySelectorAll('.buy-amount').forEach(input => input.addEventListener('input', updatePayout));
        cont.querySelectorAll('.react-btn').forEach(btn => btn.addEventListener('click', reactClick));
        cont.querySelectorAll('.share-btn').forEach(btn => btn.addEventListener('click', shareClick));
        cont.querySelectorAll('.oracle-decide').forEach(btn => btn.addEventListener('click', oracleDecide));
        cont.querySelectorAll('.oracle-resolve').forEach(btn => btn.addEventListener('click', resolveClick));
    });

    if (blindVotingEnabled) {
        applyBlindVoting();
        if (DOM.resolvedContainer) applyBlindVoting(DOM.resolvedContainer);
        if (DOM.expiredContainer) applyBlindVoting(DOM.expiredContainer);
    }
    setTimeout(updateCountdowns, 100);
}

function renderPredictionCard(p, isOracle) {
    const active = p.status === 'active';
    const market = getMarket(p.id);
    const yesPrice = getYesPrice(market.yesPool, market.noPool);
    const noPrice = 1 - yesPrice;
    const deadline = p.resolution_date ? formatDateWithoutSeconds(p.resolution_date) : 'No deadline';
    const canResolve = p.status === 'expired' && isOracle;
    const isCreator = p.creator === walletAddress;
    const myBet = walletAddress ? (p.bets || []).find(b => b.user === walletAddress) : null;
    const hasExternalBets = (p.bets || []).filter(b => b.user !== walletAddress).length > 0;

    const badgeClass = p.status === 'resolved' ? (p.unresolvable ? 'badge-expired' : 'badge-resolved') : p.status === 'expired' ? 'badge-expired' : 'badge-active';
    const badgeText = p.unresolvable ? 'UNRESOLVABLE' : p.status.toUpperCase();
    const catIcon = CATEGORY_ICONS[p.category] || '📁';
    const displayCat = p.category === 'crypto' ? 'Finance' : p.category;
    const controversy = active ? getControversyLabel(yesPrice) : null;
    const timeBadge = active ? getTimeBadge(p.resolution_date) : null;

    return `<div class="praediction-card ${controversy && controversy.class === 'badge-controversy' ? 'controversy' : ''}">
    ${isCreator && active && !hasExternalBets ? `<button class="edit-prediction-btn" data-id="${p.id}" style="position:absolute;top:12px;right:12px;background:transparent;border:none;cursor:pointer;font-size:.8rem;z-index:10;" title="Edit">✏️</button>` : ''}
    <div class="praediction-title">${escapeHtml(p.title)}</div>
    <div class="praediction-desc">${escapeHtml(p.description)}</div>
    <div class="meta-row">
    <span>${catIcon} ${displayCat}</span><span>📅 ${deadline}</span>
    <span class="badge ${badgeClass}">${badgeText}</span>
    ${controversy ? `<span class="badge ${controversy.class}">${controversy.text}</span>` : ''}
    ${timeBadge ? `<span class="badge ${timeBadge.class}">${timeBadge.text}</span>` : ''}
    </div>
    ${myBet ? `<div style="font-size:.7rem;margin-bottom:4px;color:var(--accent);">🎯 You bet ${myBet.outcome?.toUpperCase() || '?'} · ${myBet.amount || '?'} PRAE</div>` : ''}
    ${isCreator && active ? `<div style="font-size:.7rem;color:var(--text-muted);margin-bottom:4px;">👤 Your prediction</div>` : ''}
    ${active ? `<div style="font-size:.7rem;color:var(--text-muted);margin-bottom:8px;" id="countdown-${p.id}"></div>` : ''}
    ${!active ? renderVoteStats(yesPrice, noPrice) : ''}${active ? renderVoteStats(yesPrice, noPrice) : ''}
    ${active && !isCreator ? renderActiveActions(p, yesPrice) : active && isCreator ? '<div style="text-align:center;padding:8px;color:var(--text-muted);font-size:.8rem;">You staked on this prediction</div>' : ''}
    ${!active ? renderResolvedStatus(p) : ''}
    ${p.source_url ? `<div style="font-size:.7rem;margin-top:4px;">📎 <a href="${escapeHtml(p.source_url)}" target="_blank" rel="noopener" style="color:var(--accent);">Verification Source</a></div>` : (!active && !p.auto_source ? '<div style="font-size:.7rem;color:#FF8888;">⚠️ No source provided</div>' : '')}
    ${canResolve ? renderOracleResolveButtons(p) : ''}
    ${!active ? renderReactionBar(p) : active ? renderReactionBar(p) : ''}
    </div>`;
}

function renderVoteStats(yesPrice, noPrice) { return `<div class="vote-stats"><span>✅ YES: ${yesPrice.toFixed(4)} PRAE</span><span>❌ NO: ${noPrice.toFixed(4)} PRAE</span></div>`; }

function renderActiveActions(p, yesPrice) {
    return `<div class="action-buttons">
    <input type="number" class="buy-amount" id="amount-${p.id}" value="${CONFIG.MIN_BET}" min="${CONFIG.MIN_BET}" step="1" inputmode="numeric" style="width:70px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:40px;padding:8px;color:var(--text);" aria-label="Bet amount">
    <button class="btn-praedict buy-btn" data-id="${p.id}" data-outcome="yes"><span>Buy YES</span><span class="loader" style="display:none;"></span></button>
    <button class="btn-praedict buy-btn" data-id="${p.id}" data-outcome="no"><span>Buy NO</span><span class="loader" style="display:none;"></span></button>
    <button class="btn-suggest oracle-decide" data-id="${p.id}"><span>🦉 Oracle decide</span></button>
    </div>
    <div style="margin-top:8px;font-size:.7rem;color:var(--text-muted);">Potential payout: <span id="payout-${p.id}">${(CONFIG.MIN_BET / (yesPrice || 0.5)).toFixed(2)} YES</span></div>`;
}

function renderReactionBar(p) {
    const grouped = {};
    (p.reactions || []).forEach(r => { if (isValidReaction(r.emoji)) grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; });
    return `<div class="reaction-bar" style="margin-top:12px;display:flex;gap:8px;align-items:center;">
    ${CONFIG.ALLOWED_EMOJIS.map(e => { const count = grouped[e] || 0; return `<button class="reaction-btn react-btn" data-id="${p.id}" data-emoji="${e}" style="display:inline-flex;align-items:center;gap:3px;background:transparent;border:1px solid var(--accent-glow);border-radius:20px;padding:4px 10px;cursor:pointer;color:var(--text);font-size:.8rem;">${e} ${count > 0 ? `<span style="font-size:.7rem;color:var(--accent);">${count}</span>` : ''}</button>`; }).join('')}
    <button class="share-btn" data-url="${window.location.origin}#pred-${p.id}" style="margin-left:auto;background:transparent;border:1px solid var(--accent-glow);border-radius:20px;padding:4px 10px;cursor:pointer;color:var(--text);font-size:.8rem;">🔗 Share</button>
    </div>`;
}

function renderResolvedStatus(p) {
    const outcomeText = p.unresolvable ? '🚫 UNRESOLVABLE - All bets refunded' : `RESOLVED: ${p.resolved_outcome === 'yes' ? '✅ YES' : '❌ NO'}`;
    return `<div style="text-align:center;margin-top:12px;padding:8px;background:var(--accent-glow);border-radius:12px;">🏆 ${outcomeText}</div>`;
}

function renderOracleResolveButtons(p) {
    return `<div style="margin-top:12px;display:flex;gap:8px;">
    <button class="oracle-resolve" data-id="${p.id}" data-outcome="yes">✅ YES</button>
    <button class="oracle-resolve" data-id="${p.id}" data-outcome="no">❌ NO</button>
    <button class="oracle-resolve" data-id="${p.id}" data-outcome="unresolvable" style="background:#FF4444;">🚫 Unresolvable</button>
    </div>`;
}
