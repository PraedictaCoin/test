// ============================================================
// PRAEDICTA – Rendering Functions (render.js) - FINAL
// ============================================================

function renderPraedictions() {
    saveScrollPosition();
    const container = DOM.praedictionsContainer; if (!container) return;
    hideSkeleton();

    let filtered = currentPredictions.filter(p => {
        if (currentFilter.category !== 'all' && p.category !== currentFilter.category) return false;
        if (currentFilter.search && !p.title.toLowerCase().includes(currentFilter.search.toLowerCase())) return false;
        if (currentFilter.creator && !p.creator.toLowerCase().includes(currentFilter.creator.toLowerCase())) return false;
        if (currentFilter.status === 'active') return p.status === 'active' || p.status === 'expired';
        if (currentFilter.status === 'expired') return p.status === 'expired';
        if (currentFilter.status === 'resolved') return p.status === 'resolved';
        if (currentFilter.status === 'ending-soon') return p.status === 'active' && p.resolution_date && new Date(p.resolution_date) > Date.now();
        return true;
    });

    if (currentFilter.minVolume > 0) {
        filtered = filtered.filter(p => (p.bets || []).reduce((s, b) => s + (b.amount || 0), 0) >= currentFilter.minVolume);
    }
    if (currentFilter.maxVolume && currentFilter.maxVolume < Infinity && currentFilter.maxVolume > 0) {
        filtered = filtered.filter(p => (p.bets || []).reduce((s, b) => s + (b.amount || 0), 0) <= currentFilter.maxVolume);
    }
    if (currentFilter.tags && currentFilter.tags.length > 0) {
        const tagMap = { crypto: ['crypto', 'finance'], stocks: ['stocks', 'finance'], weather: ['weather'], sports: ['sports'] };
        filtered = filtered.filter(p => currentFilter.tags.some(tag => (tagMap[tag] || [tag]).includes(p.category)));
    }
    filtered = sortPredictions(filtered, currentFilter.sort || 'newest');
    if (currentFilter.status === 'ending-soon') {
        filtered.sort((a, b) => new Date(a.resolution_date) - new Date(b.resolution_date));
    }

    if (currentPredictions.length === 0 && currentFilter.status === 'active' && currentFilter.category === 'all' && !currentFilter.search) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔮</div><h3 style="color:var(--accent);">The Oracle awaits your first praediction</h3><p style="margin:16px 0;line-height:1.6;">1. Describe what will happen<br>2. Provide a proof URL<br>3. Choose YES or NO<br>4. Stake 7 points<br>5. Earn SeerScore when you're right!</p></div>`;
        if (DOM.expiredContainer) DOM.expiredContainer.innerHTML = '';
        if (DOM.resolvedContainer) DOM.resolvedContainer.innerHTML = '';
        if (DOM.loadMoreBtn) DOM.loadMoreBtn.style.display = 'none';
        renderActivityFeed();
        renderRecentWinners();
        restoreScrollPosition();
        return;
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No praedictions match your filters.</p></div>';
        if (DOM.resolvedContainer) DOM.resolvedContainer.innerHTML = '';
        if (DOM.expiredContainer) DOM.expiredContainer.innerHTML = '';
        renderActivityFeed();
        renderRecentWinners();
        restoreScrollPosition();
        return;
    }

    const activeOnly = filtered.filter(p => p.status === 'active' || p.status === 'expired');
    const expiredOnly = filtered.filter(p => p.status === 'expired');
    const resolvedOnly = filtered.filter(p => p.status === 'resolved');
    const isOracle = (walletAddress === CONFIG.ORACLE_WALLET);

    if (currentFilter.status === 'expired') {
        container.innerHTML = expiredOnly.length > 0 ? expiredOnly.map(p => renderPredictionCard(p, isOracle)).join('') : '<div class="empty-state"><p>No expired predictions.</p></div>';
        if (DOM.resolvedContainer) DOM.resolvedContainer.innerHTML = '';
    } else if (currentFilter.status === 'resolved') {
        container.innerHTML = resolvedOnly.length > 0 ? resolvedOnly.map(p => renderPredictionCard(p, isOracle)).join('') : '<div class="empty-state"><p>No resolved predictions.</p></div>';
        if (DOM.expiredContainer) DOM.expiredContainer.innerHTML = '';
    } else {
        container.innerHTML = activeOnly.length > 0 ? activeOnly.map(p => renderPredictionCard(p, isOracle)).join('') : '<div class="empty-state"><p>No active praedictions. Create one below!</p></div>';
        if (DOM.expiredContainer) {
            DOM.expiredContainer.innerHTML = '';
        }
        if (DOM.resolvedContainer) {
            DOM.resolvedContainer.innerHTML = resolvedOnly.length > 0 ? '<h3 style="color:var(--accent);margin-bottom:12px;">✅ Resolved Predictions</h3>' + resolvedOnly.map(p => renderPredictionCard(p, isOracle)).join('') : '';
        }
    }

    bindCardEvents();
    setTimeout(updateCountdowns, 100);
    renderActivityFeed();
    renderRecentWinners();
    restoreScrollPosition();
}

function renderPredictionCard(p, isOracle) {
    const active = p.status === 'active';
    const isExpanded = expandedCards[p.id] || false;
    const market = getMarket(p.id);
    const yesPrice = getYesPrice(market);
    const noPrice = 1 - yesPrice;
    const deadline = p.resolution_date ? formatDateWithoutSeconds(p.resolution_date) : 'No deadline';
    const canResolve = p.status === 'expired' && isOracle;
    const isCreator = p.creator === walletAddress;
    const myBet = walletAddress ? (p.bets || []).find(b => b.user === walletAddress) : null;
    const hasExternalBets = (p.bets || []).filter(b => b.user !== walletAddress).length > 0;
    const badgeClass = p.status === 'resolved' ? (p.unresolvable ? 'badge-expired' : 'badge-resolved') : p.status === 'expired' ? 'badge-expired' : 'badge-active';
    const badgeText = p.unresolvable ? 'UNRESOLVABLE' : p.status.toUpperCase();
    const catIcon = CATEGORY_ICONS[p.category] || '📁';
    const controversy = active ? getControversyLabel(yesPrice) : null;
    const timeBadge = active ? getTimeBadge(p.resolution_date) : null;
    const isOverdue = p.status === 'expired' && p.resolution_date && new Date(p.resolution_date) < Date.now();
    const overdueBadge = isOverdue ? { text: '⏰ Overdue', class: 'badge-flash' } : null;
    const stateClass = p.status === 'active' ? 'status-active' : p.status === 'expired' ? 'status-expired' : p.unresolvable ? 'status-unresolvable' : 'status-resolved';

    // COMPACT MODE
    if (!isExpanded) {
        return `<div class="praediction-card compact-mode ${stateClass}" data-prediction-id="${p.id}" style="cursor:pointer;" onclick="toggleCardExpand('${p.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;">
        <div class="praediction-title" style="font-size:1rem;">${escapeHtml(p.title).slice(0, 60)}${p.title.length > 60 ? '...' : ''}</div>
        <div class="meta-row" style="margin-bottom:4px;">
        <span>${catIcon} ${p.category}</span><span class="badge ${badgeClass}">${badgeText}</span>
        ${timeBadge ? `<span class="badge ${timeBadge.class}">${timeBadge.text}</span>` : ''}
        ${overdueBadge ? `<span class="badge ${overdueBadge.class}">${overdueBadge.text}</span>` : ''}
        ${myBet ? `<span style="color:var(--accent);">🎯 ${myBet.outcome?.toUpperCase()} ${myBet.amount}P</span>` : ''}
        </div></div><span style="font-size:1.2rem;color:var(--text-muted);margin-left:8px;">▶</span></div>
        ${active ? renderVoteStats(yesPrice, noPrice) : ''}
        ${active ? renderMiniOrderBook(p) : ''}
        ${active && !isCreator ? `<div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-praedict buy-btn" data-id="${p.id}" data-outcome="yes" style="font-size:.7rem;padding:6px 12px;" onclick="event.stopPropagation();">Buy YES</button><button class="btn-praedict buy-btn" data-id="${p.id}" data-outcome="no" style="font-size:.7rem;padding:6px 12px;background:rgba(239,68,68,0.8);" onclick="event.stopPropagation();">Buy NO</button></div>` : ''}
        ${active && isCreator ? '<div style="text-align:center;padding:4px;color:var(--text-muted);font-size:.7rem;">You staked on this</div>' : ''}
        ${!active ? `<div style="text-align:center;margin-top:8px;font-size:.8rem;color:var(--accent);">${p.unresolvable ? '🚫 UNRESOLVABLE' : `RESOLVED: ${p.resolved_outcome?.toUpperCase()}`}</div>` : ''}
        </div>`;
    }

    // EXPANDED MODE
    let html = `<div class="praediction-card expanded-mode ${stateClass}" data-prediction-id="${p.id}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <span style="font-size:.7rem;color:var(--text-muted);cursor:pointer;" onclick="toggleCardExpand('${p.id}')">▶ Compact</span>
        ${isCreator && active && !hasExternalBets ? `<button class="edit-prediction-btn" data-id="${p.id}" style="background:transparent;border:none;cursor:pointer;font-size:.8rem;" title="Edit">✏️</button>` : ''}
    </div>
    <div class="praediction-title">${escapeHtml(p.title)}</div>
    <div class="praediction-desc">${escapeHtml(p.description || '')}</div>
    <div class="meta-row">
        <span>${catIcon} ${p.category}</span><span>📅 ${deadline}</span>
        <span class="badge ${badgeClass}">${badgeText}</span>
        ${controversy ? `<span class="badge ${controversy.class}">${controversy.text}</span>` : ''}
        ${timeBadge ? `<span class="badge ${timeBadge.class}">${timeBadge.text}</span>` : ''}
        ${overdueBadge ? `<span class="badge ${overdueBadge.class}">${overdueBadge.text}</span>` : ''}
        <span style="font-size:.6rem;color:var(--text-muted);">${timeAgo(p.created_at)}</span>
    </div>
    ${myBet ? `<div style="font-size:.7rem;margin-bottom:4px;color:var(--accent);">🎯 You bet ${myBet.outcome?.toUpperCase() || '?'} · ${myBet.amount || '?'} PRAE</div>` : ''}
    ${isCreator && active ? `<div style="font-size:.65rem;color:var(--oracle-color);margin-bottom:4px;">🏆 Earn 10 SeerScore when resolved</div>` : ''}
    ${active ? `<div style="font-size:.7rem;color:var(--text-muted);margin-bottom:8px;" id="countdown-${p.id}"></div>` : ''}
    ${renderResolutionInfo(p)}
    ${active ? renderVoteStats(yesPrice, noPrice) : renderVoteStats(yesPrice, noPrice)}
    
    <!-- Market/Limit Toggle -->
    <div class="order-type-toggle" id="orderToggle-${p.id}">
        <button class="order-type-btn active" data-type="market">📈 Market</button>
        <button class="order-type-btn" data-type="limit">📊 Limit</button>
    </div>
    <div id="limitOrderUI-${p.id}" style="display:none;">
        <input type="number" class="buy-amount" id="amount-${p.id}" value="${CONFIG.MIN_BET}" min="${CONFIG.MIN_BET}" step="1">
        <button class="btn-praedict buy-btn" data-id="${p.id}" data-outcome="yes">Buy YES</button>
        <button class="btn-praedict buy-btn" data-id="${p.id}" data-outcome="no">Buy NO</button>
    </div>
    <div id="marketOrderUI-${p.id}" style="display:block;">
        <input type="number" class="market-amount" id="marketAmount-${p.id}" value="${CONFIG.MIN_BET}" min="${CONFIG.MIN_BET}" step="1">
        <button class="btn-praedict market-buy-btn" data-id="${p.id}" data-outcome="yes">Market YES</button>
        <button class="btn-praedict market-buy-btn" data-id="${p.id}" data-outcome="no">Market NO</button>
        <div id="slippageWarning-${p.id}" class="slippage-warning"></div>
    </div>
    
    <!-- Chart containers (placeholder – requires implementation in utils.js) -->
    <div id="candlestick-${p.id}" style="height:200px; margin-top:8px;"></div>
    <div id="depth-${p.id}" style="height:150px; margin-top:8px;"></div>
    
    <!-- Watchlist buttons -->
    ${watchlist.includes(p.id) ? `<button class="watchlist-remove" data-id="${p.id}" style="margin-top:8px;">⭐ Remove from Watchlist</button>` : `<button class="watchlist-add" data-id="${p.id}" style="margin-top:8px;">☆ Add to Watchlist</button>`}
    
    <!-- Report button -->
    <button class="report-btn" data-id="${p.id}" style="margin-top:4px;">🚩 Report</button>
    
    <!-- Virtual disclaimer -->
    <div class="virtual-disclaimer" style="font-size:.6rem; color:var(--text-muted); text-align:center; margin-top:8px;">🎮 Virtual points – no real value</div>
    
    ${renderMiniOrderBook(p)}
    ${showOrderBook[p.id] ? renderOrderBook(p) : ''}
    ${p.bets && p.bets.length > 0 ? renderBetList(p) : ''}
    ${active && !isCreator ? renderActiveActions(p, yesPrice) : active && isCreator ? '<div style="text-align:center;padding:8px;color:var(--text-muted);font-size:.8rem;">You staked on this prediction</div>' : ''}
    ${!active ? renderResolvedStatus(p) : ''}
    ${p.source_url ? `<div style="font-size:.7rem;margin-top:4px;">📎 <a href="${escapeHtml(p.source_url)}" target="_blank" rel="noopener" style="color:var(--accent);">Verification Source</a></div>` : (!active && !p.auto_source ? '<div style="font-size:.7rem;color:#FF8888;">⚠️ No source provided</div>' : '')}
    ${canResolve ? renderOracleResolveButtons(p) : ''}
    ${renderReactionBar(p)}
    </div>`;
    return html;
}

function toggleCardExpand(id) {
    expandedCards[id] = !expandedCards[id];
    renderPraedictions();
}

function renderResolutionInfo(p) {
    const src = p.auto_source || '';
    const target = p.target_value || '';
    const deadline = p.resolution_date ? new Date(p.resolution_date).toUTCString().replace('GMT', 'UTC') : 'No deadline';
    if (!src && !p.source_url) return '';
    let sourceLabel = 'Manual (Oracle)', condition = 'Oracle reviews evidence', autoResolve = '❌ No';
    if (src.startsWith('coingecko_')) { sourceLabel = 'CoinGecko'; condition = `Price ≥ $${target}`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('redstone_')) { sourceLabel = 'RedStone'; condition = `Price ≥ $${target}`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('binance_')) { sourceLabel = 'Binance'; condition = `Price ≥ $${target}`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('yahoo_')) { sourceLabel = 'Yahoo Finance'; condition = `Price ≥ $${target}`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('forex_')) { sourceLabel = 'Forex'; condition = `Rate ≥ ${target}`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('weather_temp')) { const c = src.split(':')[1]||''; sourceLabel = `${c} Weather`; condition = `Temp ≥ ${target}°C`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('weather_rain')) { const c = src.split(':')[1]||''; sourceLabel = `${c} Rain`; condition = `Rain ≥ ${target}mm`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('sports_')) { sourceLabel = 'Sports'; condition = `${src.replace('sports_','')} wins`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('wiki_')) { sourceLabel = 'Wikipedia'; condition = 'Event verified'; autoResolve = '✅ Yes'; }
    else if (src.startsWith('oscar_')) { sourceLabel = 'Oscars'; condition = 'Winner verified'; autoResolve = '✅ Yes'; }
    else if (src.startsWith('movie_')) { sourceLabel = 'Box Office'; condition = `Revenue ≥ $${target}`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('flight_')) { sourceLabel = 'Flight'; condition = 'Delayed?'; autoResolve = '✅ Yes'; }
    else if (src.startsWith('hurricane_')) { sourceLabel = 'Hurricane'; condition = 'Active?'; autoResolve = '✅ Yes'; }
    else if (src.startsWith('quake_')) { sourceLabel = 'Earthquake'; condition = `Mag ≥ ${target}`; autoResolve = '✅ Yes'; }
    else if (src === 'fed_rate') { sourceLabel = 'Fed Rate'; condition = `Rate ≥ ${target}%`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('esports_')) { sourceLabel = 'Esports'; condition = 'Team wins'; autoResolve = '✅ Yes'; }
    else if (src.startsWith('news_')) { sourceLabel = 'News'; condition = 'Headline found'; autoResolve = '✅ Yes'; }
    else if (src.startsWith('youtube_')) { sourceLabel = 'YouTube'; condition = `Subs ≥ ${target}`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('spotify_')) { sourceLabel = 'Spotify'; condition = `Followers ≥ ${target}`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('f1_')) { sourceLabel = 'F1'; condition = 'Driver wins'; autoResolve = '✅ Yes'; }
    else if (src.startsWith('eurovision_')) { sourceLabel = 'Eurovision'; condition = 'Country wins'; autoResolve = '✅ Yes'; }
    else if (src.startsWith('github_')) { sourceLabel = 'GitHub'; condition = `Stars ≥ ${target}`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('steam_')) { sourceLabel = 'Steam'; condition = `Players ≥ ${target}`; autoResolve = '✅ Yes'; }
    else if (src.startsWith('meteor_')) { sourceLabel = 'Meteor'; condition = `Size ≥ ${target}m`; autoResolve = '✅ Yes'; }
    else if (p.source_url) { sourceLabel = 'Manual (URL)'; condition = 'Oracle checks URL'; autoResolve = '⚠️ No'; }
    return `<div class="resolution-info"><div style="color:var(--accent);font-weight:500;margin-bottom:6px;">🔮 Resolution Info</div><div class="resolution-info-grid"><span style="color:var(--text-muted);">📊 Source:</span><span>${sourceLabel}</span><span style="color:var(--text-muted);">🎯 Condition:</span><span>${condition}</span><span style="color:var(--text-muted);">⏰ Deadline:</span><span>${deadline}</span><span style="color:var(--text-muted);">🤖 Auto-resolve:</span><span>${autoResolve}</span><span style="color:var(--text-muted);">⏱️ Timeline:</span><span>Resolves within 24h</span></div></div>`;
}

function renderVoteStats(yesPrice, noPrice) {
    return `<div class="vote-stats"><span>✅ YES: <span class="price-highlight">${yesPrice.toFixed(4)}</span> points</span><span>❌ NO: <span class="price-highlight">${noPrice.toFixed(4)}</span> points</span><span title="Order book market price" style="cursor:help;font-size:.65rem;">ℹ️</span></div>`;
}

function renderActiveActions(p, yesPrice) {
    const market = getMarket(p.id);
    const price = getYesPrice(market);
    const maxBet = getMaxBet(userPRAEBalance, price);
    const positionValue = walletAddress ? getPositionValue(p.id, walletAddress) : 0;
    return `<div class="action-buttons">
    <input type="number" class="buy-amount" id="amount-${p.id}" value="${CONFIG.MIN_BET}" min="${CONFIG.MIN_BET}" step="1" inputmode="numeric" style="width:80px;background:var(--input-bg);border:1px solid var(--input-border);border-radius:40px;padding:8px 12px;color:var(--text);text-align:center;" aria-label="Bet amount">
    <button class="btn-praedict buy-btn" data-id="${p.id}" data-outcome="yes" style="font-size:.75rem;">Buy YES</button>
    <button class="btn-praedict buy-btn" data-id="${p.id}" data-outcome="no" style="font-size:.75rem;background:rgba(239,68,68,0.8);">Buy NO</button></div>
    <div style="display:flex;gap:4px;margin-top:6px;justify-content:center;">
    <button class="quick-bet-btn" data-id="${p.id}" data-outcome="yes" data-amount="7" style="font-size:.6rem;padding:3px 10px;border-radius:16px;background:var(--accent-glow);border:1px solid var(--accent);color:var(--accent);cursor:pointer;">7 points</button>
    <button class="quick-bet-btn" data-id="${p.id}" data-outcome="yes" data-amount="20" style="font-size:.6rem;padding:3px 10px;border-radius:16px;background:var(--accent-glow);border:1px solid var(--accent);color:var(--accent);cursor:pointer;">20 points</button>
    <button class="quick-bet-btn" data-id="${p.id}" data-outcome="yes" data-amount="50" style="font-size:.6rem;padding:3px 10px;border-radius:16px;background:var(--accent-glow);border:1px solid var(--accent);color:var(--accent);cursor:pointer;">50 points</button></div>
    <div style="margin-top:8px;font-size:.7rem;color:var(--text-muted);text-align:center;">Payout: <span id="payout-${p.id}">${(CONFIG.MIN_BET / (price || 0.5)).toFixed(2)} YES</span> · Max: <span id="maxbet-${p.id}">${maxBet}</span> points</div>
    ${positionValue > 0 ? `<div style="margin-top:4px;font-size:.7rem;color:var(--accent);text-align:center;">💎 Position: ~${positionValue.toFixed(2)} points</div>` : ''}
    <div style="margin-top:4px;font-size:.6rem;color:var(--text-muted);text-align:center;">Fee: 0.5% · Resolves within 24h</div>`;
}

function renderReactionBar(p) {
    const grouped = {};
    (p.reactions || []).forEach(r => { if (isValidReaction(r.emoji)) grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; });
    return `<div class="reaction-bar" style="margin-top:12px;display:flex;gap:8px;align-items:center;">${CONFIG.ALLOWED_EMOJIS.map(e => {
        const count = grouped[e] || 0;
        return `<button class="reaction-btn react-btn" data-id="${p.id}" data-emoji="${e}" style="display:inline-flex;align-items:center;gap:3px;background:transparent;border:1px solid var(--accent-glow);border-radius:20px;padding:4px 10px;cursor:pointer;color:var(--text);font-size:.8rem;">${e} ${count > 0 ? `<span style="font-size:.7rem;color:var(--accent);">${count}</span>` : ''}</button>`;
    }).join('')}<button class="share-btn" data-url="${window.location.origin}/test/#pred-${p.id}" style="margin-left:auto;background:transparent;border:1px solid var(--accent-glow);border-radius:20px;padding:4px 10px;cursor:pointer;color:var(--text);font-size:.8rem;">🔗 Share</button></div>`;
}

function renderResolvedStatus(p) {
    const t = p.unresolvable ? '🚫 UNRESOLVABLE - All bets refunded' : `RESOLVED: ${p.resolved_outcome === 'yes' ? '✅ YES' : '❌ NO'}`;
    return `<div style="text-align:center;margin-top:12px;padding:8px;background:var(--accent-glow);border-radius:12px;">🏆 ${t}</div>`;
}

function renderOracleResolveButtons(p) {
    const disputeCount = p.disputes ? p.disputes.length : 0;
    return `<div style="margin-top:12px;display:flex;gap:8px;"><button class="oracle-resolve" data-id="${p.id}" data-outcome="yes">✅ YES</button><button class="oracle-resolve" data-id="${p.id}" data-outcome="no">❌ NO</button><button class="oracle-resolve" data-id="${p.id}" data-outcome="unresolvable" style="background:#FF4444;">🚫 Unresolvable</button></div>${p.status === 'resolved' && !p.unresolvable ? `<div style="margin-top:8px;text-align:center;font-size:.7rem;"><button class="dispute-btn" data-id="${p.id}" style="background:transparent;border:1px solid var(--oracle-color);color:var(--oracle-color);padding:4px 12px;border-radius:20px;cursor:pointer;font-size:.7rem;">⚠️ Dispute (${disputeCount})</button></div>` : ''}`;
}

function renderActivityFeed() {
    if (!DOM.activityFeed) return;
    const recent = [];
    currentPredictions.forEach(p => {
        (p.bets || []).forEach(b => {
            recent.push({
                time: b.time || p.created_at || Date.now(),
                text: `💰 ${escapeHtml((b.user || '???').slice(0, 6))}... bet ${b.amount || '?'} points on ${(b.outcome || '?').toUpperCase()} for "${escapeHtml(p.title).slice(0, 30)}..."`,
                type: 'bet'
            });
        });
    });
    currentPredictions.filter(p => p.status === 'resolved' && p.resolved_at).forEach(p => {
        recent.push({
            time: new Date(p.resolved_at).getTime(),
            text: `✅ "${escapeHtml(p.title).slice(0, 40)}..." resolved ${p.resolved_outcome === 'yes' ? 'YES' : 'NO'}${p.unresolvable ? ' (UNRESOLVABLE)' : ''}`,
            type: 'resolve'
        });
    });
    currentPredictions.filter(p => p.created_at).forEach(p => {
        recent.push({
            time: new Date(p.created_at).getTime(),
            text: `🆕 ${escapeHtml((p.creator || '').slice(0, 6))}... created "${escapeHtml(p.title).slice(0, 40)}..."`,
            type: 'create'
        });
    });
    recent.sort((a, b) => b.time - a.time);
    const displayItems = recent.slice(0, 20);
    DOM.activityFeed.innerHTML = displayItems.length > 0 ? '<h4 style="color:var(--accent);margin-bottom:8px;">📡 Live Activity</h4>' + displayItems.map(r => `<div style="font-size:.75rem;padding:6px 0;color:var(--text-muted);border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;"><span style="flex:1;">${r.text}</span><span style="font-size:.65rem;color:var(--text-muted);margin-left:8px;white-space:nowrap;">${timeAgo(new Date(r.time).toISOString())}</span></div>`).join('') : '<div style="text-align:center;padding:12px;color:var(--text-muted);">No activity yet. Be the first!</div>';
}

function renderRecentWinners() {
    if (!DOM.recentWinners) return;
    const resolved = currentPredictions.filter(p => p.status === 'resolved' && !p.unresolvable && p.resolved_at).sort((a, b) => new Date(b.resolved_at) - new Date(a.resolved_at)).slice(0, 5);
    if (resolved.length === 0) return;
    DOM.recentWinners.innerHTML = '<h4 style="color:var(--accent);margin-bottom:8px;">🏆 Recent Winners</h4>' + resolved.map(p => {
        const w = p.resolved_outcome === 'yes' ? 'YES' : 'NO';
        const top = ((p.bets || []).filter(b => b.outcome === p.resolved_outcome).sort((a, b) => b.amount - a.amount)[0] || {}).amount || 0;
        return `<div style="font-size:.75rem;padding:4px 0;color:var(--accent);border-bottom:1px solid var(--border);">🏆 ${escapeHtml(p.title.slice(0, 35))}... ${w}${top ? `<span style="color:var(--text-muted);">· ${top} points won</span>` : ''}</div>`;
    }).join('');
}

function renderBetList(p) {
    const betLimit = betDisplayLimits[p.id] || BETS_PER_CARD;
    const sortedBets = (p.bets || []).sort((a, b) => (b.time || 0) - (a.time || 0));
    const visibleBets = sortedBets.slice(0, betLimit);
    const hasMore = sortedBets.length > betLimit;
    const totalAmount = sortedBets.reduce((s, b) => s + (b.amount || 0), 0);
    const uniqueBettors = new Set(sortedBets.map(b => b.user)).size;
    let html = `<div style="margin-top:8px; padding-top:8px; border-top:1px solid var(--border);"><div style="display:flex; gap:12px; font-size:.7rem; color:var(--text-muted); margin-bottom:6px;"><span>💰 ${totalAmount} points bet</span><span>👥 ${uniqueBettors} bettors</span><span>📊 ${sortedBets.length} total bets</span></div><div style="max-height:${betLimit * 32}px; overflow-y:auto; margin-bottom:4px;">`;
    visibleBets.forEach(b => {
        const userShort = escapeHtml((b.user || '???').slice(0, 6)) + '...';
        const timeStr = b.time ? timeAgo(new Date(b.time).toISOString()) : '';
        const isWin = p.status === 'resolved' && b.outcome === p.resolved_outcome;
        const betColor = isWin ? 'var(--success-color)' : p.status === 'resolved' ? 'var(--error-color)' : 'var(--accent)';
        html += `<div style="display:flex; justify-content:space-between; align-items:center; font-size:.65rem; padding:2px 0; color:var(--text-muted);"><span>${userShort} · <span style="color:${betColor};">${(b.outcome || '?').toUpperCase()}</span></span><span style="display:flex; gap:8px;align-items:center;"><span style="color:var(--accent);">${b.amount || 0} points</span>${timeStr ? `<span style="font-size:.6rem;">${timeStr}</span>` : ''}<button onclick="event.stopPropagation();copyTrade('${p.id}','${b.outcome}','${b.amount || CONFIG.MIN_BET}')" title="Copy trade" style="background:transparent;border:1px solid var(--border);color:var(--text-muted);border-radius:8px;padding:0 4px;cursor:pointer;font-size:.55rem;">📋</button></span></div>`;
    });
    html += `</div>`;
    if (hasMore) html += `<button onclick="showMoreBets('${p.id}')" style="width:100%; padding:4px; background:var(--accent-glow); border:1px solid var(--accent); border-radius:12px; color:var(--accent); cursor:pointer; font-size:.65rem;">👁️ Show all ${sortedBets.length} bets</button>`;
    if (betLimit > BETS_PER_CARD) html += `<button onclick="showLessBets('${p.id}')" style="width:100%; padding:4px; background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-size:.6rem; margin-top:2px;">Show less</button>`;
    html += `</div>`;
    return html;
}

function showMoreBets(id) {
    const p = currentPredictions.find(p => p.id === id);
    if (!p) return;
    betDisplayLimits[id] = (p.bets || []).length;
    renderPraedictions();
}

function showLessBets(id) {
    betDisplayLimits[id] = BETS_PER_CARD;
    renderPraedictions();
}

// ============================================================
// EVENT BINDING FOR DYNAMIC BUTTONS
// ============================================================

function bindCardEvents() {
    document.querySelectorAll('.order-type-btn').forEach(btn => {
        btn.removeEventListener('click', toggleOrderType);
        btn.addEventListener('click', toggleOrderType);
    });
    document.querySelectorAll('.market-buy-btn').forEach(btn => {
        btn.removeEventListener('click', marketBuyClick);
        btn.addEventListener('click', marketBuyClick);
    });
    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.removeEventListener('click', buyClick);
        btn.addEventListener('click', buyClick);
    });
    document.querySelectorAll('.watchlist-add').forEach(btn => {
        btn.removeEventListener('click', addToWatchlist);
        btn.addEventListener('click', addToWatchlist);
    });
    document.querySelectorAll('.watchlist-remove').forEach(btn => {
        btn.removeEventListener('click', removeFromWatchlist);
        btn.addEventListener('click', removeFromWatchlist);
    });
    document.querySelectorAll('.report-btn').forEach(btn => {
        btn.removeEventListener('click', reportPredictionClick);
        btn.addEventListener('click', reportPredictionClick);
    });
    document.querySelectorAll('.market-amount').forEach(input => {
        input.removeEventListener('input', onMarketAmountInput);
        input.addEventListener('input', onMarketAmountInput);
    });
}

function toggleOrderType(e) {
    const btn = e.currentTarget;
    const id = btn.closest('.praediction-card')?.dataset.predictionId;
    if (!id) return;
    const type = btn.dataset.type;
    const container = btn.closest('.praediction-card');
    container.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (type === 'market') {
        container.querySelector(`#limitOrderUI-${id}`).style.display = 'none';
        container.querySelector(`#marketOrderUI-${id}`).style.display = 'block';
    } else {
        container.querySelector(`#limitOrderUI-${id}`).style.display = 'block';
        container.querySelector(`#marketOrderUI-${id}`).style.display = 'none';
    }
}

async function marketBuyClick(e) {
    const btn = e.currentTarget;
    const predictionId = btn.closest('.praediction-card')?.dataset.predictionId;
    const outcome = btn.dataset.outcome;
    const amountInput = document.getElementById(`marketAmount-${predictionId}`);
    const amount = parseFloat(amountInput?.value);
    if (isNaN(amount) || amount < CONFIG.MIN_BET) {
        showToast(`Minimum ${CONFIG.MIN_BET} points`, 'error');
        return;
    }
    const ok = await showPriceImpactWarning(predictionId, outcome, amount);
    if (!ok) return;
    await executeMarketOrder(predictionId, outcome, amount);
}

async function showPriceImpactWarning(predictionId, outcome, amount) {
    const sim = await simulateMarketImpact(predictionId, outcome, amount);
    if (!sim) return true;
    if (sim.slippage > 5) {
        return confirm(`⚠️ High slippage (${sim.slippage.toFixed(1)}%)! Expected avg price: ${sim.avgPrice.toFixed(4)}. Continue?`);
    } else if (sim.slippage > 2) {
        showToast(`⚠️ Slippage: ${sim.slippage.toFixed(1)}%. Avg price: ${sim.avgPrice.toFixed(4)}`, 'info');
    }
    return true;
}

async function onMarketAmountInput(e) {
    const input = e.target;
    const id = input.id.replace('marketAmount-', '');
    const amount = parseFloat(input.value);
    if (isNaN(amount) || amount < CONFIG.MIN_BET) return;
    const sim = await simulateMarketImpact(id, 'yes', amount);
    const warningDiv = document.getElementById(`slippageWarning-${id}`);
    if (sim && sim.slippage) {
        warningDiv.innerHTML = `⚠️ Slippage: ${sim.slippage.toFixed(1)}% | Avg price: ${sim.avgPrice.toFixed(4)}`;
    } else {
        warningDiv.innerHTML = '';
    }
}

async function addToWatchlist(e) {
    const id = e.currentTarget.dataset.id;
    if (!walletAddress) return showToast("Connect wallet", 'error');
    await callSecureRpc('add_watchlist', { predictionId: id });
    watchlist.push(id);
    renderPraedictions();
    showToast("Added to watchlist", 'info');
}

async function removeFromWatchlist(e) {
    const id = e.currentTarget.dataset.id;
    if (!walletAddress) return showToast("Connect wallet", 'error');
    await callSecureRpc('remove_watchlist', { predictionId: id });
    watchlist = watchlist.filter(i => i !== id);
    renderPraedictions();
    showToast("Removed from watchlist", 'info');
}

async function reportPredictionClick(e) {
    const id = e.currentTarget.dataset.id;
    if (!walletAddress) return showToast("Connect wallet", 'error');
    const reason = prompt("Why are you reporting this prediction?");
    if (!reason) return;
    await reportPrediction(id, reason);
}