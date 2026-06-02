// ============================================================
// PRAEDICTA – Profile, Leaderboard & Data Loading
// ============================================================

async function loadPredictions() { try { return await fetchWithRetry(async () => { const { data, error } = await supabaseClient.from('predictions').select('*').order('created_at', { ascending: false }).limit(100); if (error) throw error; return data || []; }); } catch (err) { console.error('Load predictions error:', err); showToast('Failed to load predictions.'); return []; } }
async function loadUser(address) { if (!address) return null; try { const { data } = await supabaseClient.from('users').select('*').eq('address', address).maybeSingle(); return data; } catch (err) { console.error('Load user error:', err); return null; } }
async function loadLeaderboard(period, category) { try { const params = { filter: period }; const rpc = category ? 'get_category_leaderboard' : 'get_leaderboard'; if (category) params.cat = category; const { data } = await supabaseClient.rpc(rpc, params); return data || []; } catch (err) { console.error('Load leaderboard error:', err); return []; } }
async function loadHallOfFame() { try { const { data } = await supabaseClient.from('predictions').select('id, title, resolved_outcome, bets, unresolvable').eq('status', 'resolved').eq('unresolvable', false).order('resolved_at', { ascending: false }).limit(10); return (data || []).sort((a, b) => { const aC = (a.bets || []).filter(b => b.outcome === a.resolved_outcome).length; const bC = (b.bets || []).filter(b => b.outcome === b.resolved_outcome).length; return bC - aC; }); } catch (err) { console.error('Load hall of fame error:', err); return []; } }

async function loadMorePredictions() { predictionsOffset += PREDICTIONS_PER_PAGE; try { const { data } = await supabaseClient.from('predictions').select('*').order('created_at', { ascending: false }).range(predictionsOffset, predictionsOffset + PREDICTIONS_PER_PAGE - 1); if (data && data.length > 0) { currentPredictions = [...currentPredictions, ...data]; renderPraedictions(); } else { if (DOM.loadMoreBtn) DOM.loadMoreBtn.style.display = 'none'; } } catch (err) { console.error('Load more error:', err); } }

function updateStreakDisplay(user) { if (!DOM.streakRewards || !user) return; const streak = user.login_streak || 0; const bonus = streak >= 7 ? '🎁 Bonus active!' : streak >= 3 ? '🔥 Warming up!' : 'Keep going...'; const countEl = DOM.streakRewards.querySelector('#streakCount'); const bonusEl = DOM.streakRewards.querySelector('#streakBonus'); if (countEl) countEl.textContent = streak; if (bonusEl) bonusEl.textContent = bonus; }
function updateStreakStory(user) { if (!DOM.streakStory || !user) return; const streak = user.login_streak || 0; const milestones = Object.keys(STREAK_STORIES).map(Number).sort((a, b) => a - b); let storyKey = 0; for (const m of milestones) { if (streak >= m) storyKey = m; else break; } DOM.streakStory.textContent = STREAK_STORIES[storyKey] || `Day ${streak}: Your legend continues...`; }
function updateFreezeTimer(user) { if (!DOM.freezeTimer || !user) return; const nextFreeze = user.next_freeze_available; if (nextFreeze) { const remaining = new Date(nextFreeze) - Date.now(); if (remaining > 0) { const hours = Math.floor(remaining / 3600000); const mins = Math.floor((remaining % 3600000) / 60000); DOM.freezeTimer.textContent = `❄️ Next freeze in: ${hours}h ${mins}m`; } else { DOM.freezeTimer.textContent = '❄️ Freeze available!'; } } else { DOM.freezeTimer.textContent = ''; } }

async function renderProfile(userData) {
    if (!walletAddress) return; const user = userData || await loadUser(walletAddress);
    if (!user) { if (DOM.profileStats) DOM.profileStats.innerHTML = '<div>User not found.</div>'; return; }
    const displayName = user.display_name || `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`; const avatar = user.avatar || '';
    const seerScore = user.seerscore || 0; const prophetTitle = getProphetTitle(seerScore);
    if (DOM.walletDisplay) DOM.walletDisplay.innerHTML = `${avatar} ${escapeHtml(displayName)}`;
    if (DOM.profileWalletAddress) DOM.profileWalletAddress.textContent = `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}`;
    if (DOM.profileStats) {
        DOM.profileStats.innerHTML = `<div><span style="color:var(--accent);">💰 PRAE Balance:</span> ${userPRAEBalance.toFixed(2)}</div><div><span style="color:var(--accent);">👁️ Seerscore:</span> ${seerScore}</div><div style="margin-top:8px;"><span style="color:var(--oracle-color);">${prophetTitle.emoji} Rank:</span> ${prophetTitle.title}</div>`;
        // Accuracy stat
        const allPredictions = currentPredictions.filter(p => p.status === 'resolved' && !p.unresolvable);
        const myCorrectBets = allPredictions.filter(p => { const myBet = (p.bets || []).find(b => b.user === walletAddress); return myBet && myBet.outcome === p.resolved_outcome; });
        const myTotalBets = allPredictions.filter(p => (p.bets || []).some(b => b.user === walletAddress));
        if (myTotalBets.length > 0) { const accuracy = ((myCorrectBets.length / myTotalBets.length) * 100).toFixed(0); DOM.profileStats.innerHTML += `<div style="margin-top:4px;">🎯 Accuracy: <strong>${accuracy}%</strong> (${myCorrectBets.length}/${myTotalBets.length})</div>`; }
    }
    if (DOM.dailyDigest) {
        const today = getUTCDayKey();
        const todayResolved = currentPredictions.filter(p => p.status === 'resolved' && p.resolved_at && p.resolved_at.startsWith(today) && (p.bets || []).some(b => b.user === walletAddress));
        if (todayResolved.length > 0) {
            const won = todayResolved.filter(p => { const myBet = p.bets.find(b => b.user === walletAddress); return myBet && myBet.outcome === p.resolved_outcome; });
            DOM.dailyDigest.innerHTML = `📊 Today: ${won.length}/${todayResolved.length} correct`;
            if (won.length === todayResolved.length) DOM.dailyDigest.innerHTML += '<br>🏆 Perfect day!';
        } else { const horo = user.zodiac ? await fetchHoroscopeForZodiac(user.zodiac) : null; DOM.dailyDigest.innerHTML = '📊 Yesterday: you traded wisely.'; if (horo?.luckyNumber) DOM.dailyDigest.innerHTML += `<br>🍀 Lucky Number: <strong>${horo.luckyNumber}</strong>`; }
    }
    const moon = getLunarPhase(); if (DOM.lunarPhase) DOM.lunarPhase.innerHTML = `${moon.emoji} ${moon.name}`;
    const hasZodiac = !!user.zodiac; if (DOM.zodiacSelectorWrapper) DOM.zodiacSelectorWrapper.style.display = hasZodiac ? 'none' : 'flex'; if (DOM.userZodiacDisplay) DOM.userZodiacDisplay.style.display = hasZodiac ? 'block' : 'none';
    if (hasZodiac) { if (DOM.userZodiacDisplay) DOM.userZodiacDisplay.textContent = signSymbols[user.zodiac] || ''; const horo = await fetchHoroscopeForZodiac(user.zodiac); if (horo && DOM.zodiacRealHeadline && DOM.zodiacHoroscopeDisplay) { DOM.zodiacRealHeadline.style.display = 'block'; DOM.zodiacHoroscopeDisplay.innerHTML = `${escapeHtml(horo.description)}<br><br>🍀 Lucky: ${horo.luckyNumber}<br>😌 ${horo.mood}`; } }
    if (user.display_name) { if (DOM.profileNameSection) DOM.profileNameSection.style.display = 'none'; } else { if (DOM.profileNameSection) DOM.profileNameSection.style.display = 'flex'; if (DOM.displayNameInput) DOM.displayNameInput.value = ''; }
    updateStreakDisplay(user); updateStreakStory(user); updateFreezeTimer(user); updateHypeMessage();
    if (DOM.avatarSelect) DOM.avatarSelect.value = user.avatar || ''; if (DOM.referralLink) DOM.referralLink.textContent = `${window.location.origin}?ref=${walletAddress}`;
}

async function renderLeaderboard(period = 'all', category = null) {
    leaderboardPeriod = period; const container = DOM.leaderboardList; if (!container) return;
    const data = await loadLeaderboard(period, category);
    if (previousLeaderboard.length > 0) { data.forEach((entry, i) => { const prevIndex = previousLeaderboard.findIndex(p => p.address === entry.address); if (prevIndex >= 0 && prevIndex !== i) entry.positionChange = prevIndex - i; }); } previousLeaderboard = [...data];
    container.innerHTML = data.length === 0 ? '<div style="text-align:center;padding:20px;color:var(--text-muted);">No data yet.</div>' : data.map((u, i) => { const changeIcon = u.positionChange > 0 ? ' 🟢↑' : u.positionChange < 0 ? ' 🔴↓' : ''; const name = u.display_name || `${(u.address || '').slice(0, 6)}...${(u.address || '').slice(-4)}`; const uTitle = getProphetTitle(u.seerscore || 0); return `<div style="display:flex;justify-content:space-between;padding:8px;" class="${u.positionChange !== 0 ? 'leaderboard-glow' : ''}"><div>${i + 1}. ${u.avatar || ''} ${uTitle.emoji} ${escapeHtml(name)}${changeIcon}</div><div>👁️ ${u.seerscore}</div></div>`; }).join('');
    try { const { data: seer } = await supabaseClient.rpc('get_seer_of_the_day'); if (seer && DOM.seerOfTheDay) { const seerTitle = getProphetTitle(seer.seerscore || 0); DOM.seerOfTheDay.innerHTML = `<div style="text-align:center;"><div style="font-size:2rem;">🌟</div><div>👁️ Seer of the Day</div><div style="font-size:1.2rem;color:var(--accent);">${seerTitle.emoji} ${seer.display_name || (seer.address || '').slice(0, 6)}...</div><div style="font-size:.8rem;">${seerTitle.title} • SeerScore: ${seer.seerscore || '???'}</div></div>`; } } catch (err) { console.error('Seer of day error:', err); }
}

async function renderHallOfFame() { const container = DOM.hallOfFameList; if (!container) return; const predictions = await loadHallOfFame(); container.innerHTML = predictions.length === 0 ? '<div style="text-align:center;color:var(--text-muted);">No resolved predictions yet.</div>' : predictions.map((p, i) => { const correct = (p.bets || []).filter(b => b.outcome === p.resolved_outcome).length; const total = (p.bets || []).length; const acc = total ? ((correct / total) * 100).toFixed(0) : 0; return `<div class="praediction-card hall-of-fame"><div class="praediction-title">#${i + 1} – ${escapeHtml(p.title)}</div><div class="meta-row"><span>✅ Resolved: ${(p.resolved_outcome || '').toUpperCase()}</span><span>Correct: ${correct}/${total} (${acc}%)</span></div></div>`; }).join(''); }

async function refreshAll() {
    try {
        predictionsOffset = 0;
        const predictions = await loadPredictions(); currentPredictions = predictions; renderPraedictions();
        const user = await loadUser(walletAddress); await renderProfile(user);
        const activeTab = document.querySelector('.tab-content.active'); if (activeTab?.id === 'tab-leaderboard') await renderLeaderboard(leaderboardPeriod, DOM.leaderboardCategoryFilter?.value || null);
        const activeCount = predictions.filter(p => p.status === 'active').length; if (DOM.totalActive) DOM.totalActive.textContent = activeCount;
        const totalBet = Object.values(mockMarkets).reduce((s, m) => s + m.yesPool + m.noPool - (MOCK_INITIAL_POOL * 2), 0); if (DOM.totalPraedicts) DOM.totalPraedicts.textContent = totalBet.toFixed(0); if (DOM.crowdYes) DOM.crowdYes.textContent = '50%';
        const totalVolume = Object.values(mockMarkets).reduce((s, m) => s + Math.abs(m.yesPool - MOCK_INITIAL_POOL) + Math.abs(m.noPool - MOCK_INITIAL_POOL), 0); if (DOM.totalVolume) DOM.totalVolume.textContent = totalVolume.toFixed(0) + getVolumeTrend(totalVolume);
        if (user && DOM.totalSeerscore) DOM.totalSeerscore.textContent = user.seerscore || 0;
        const hottest = getHottestCategory(); if (DOM.hottestCategory) DOM.hottestCategory.innerHTML = `${hottest.icon} Hottest: <strong>${hottest.name}</strong> (${hottest.count} active)`;
        const isOracle = (walletAddress === CONFIG.ORACLE_WALLET); if (DOM.oracleIndicatorTop) DOM.oracleIndicatorTop.style.display = isOracle ? 'inline-flex' : 'none'; if (DOM.oracleIndicatorProfile) DOM.oracleIndicatorProfile.style.display = isOracle ? 'inline-block' : 'none';
        // Notification check
        const myResolvedBets = predictions.filter(p => p.status === 'resolved' && (p.bets || []).some(b => b.user === walletAddress) && !p.notified);
        if (myResolvedBets.length > 0) { showNotification(`${myResolvedBets.length} prediction${myResolvedBets.length > 1 ? 's' : ''} resolved!`); myResolvedBets.forEach(p => p.notified = true); }
        if (DOM.loadMoreBtn && predictions.length >= 100) DOM.loadMoreBtn.style.display = 'block'; else if (DOM.loadMoreBtn) DOM.loadMoreBtn.style.display = 'none';
        updateHypeMessage();
    } catch (err) { console.error('Refresh error:', err); }
}
