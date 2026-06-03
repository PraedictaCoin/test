// ============================================================
// PRAEDICTA – Event Listeners (events.js) - COMPLETE FINAL
// ============================================================

function initOracleAsk() {
    if (!DOM.askOracleBtn) return;
    DOM.askOracleBtn.addEventListener('click', () => {
        if (oracleAsked) return showToast("🦉 You may only ask once per login.", 'info');
        const question = sanitize(DOM.oracleQuestion?.value || '', 200);
        if (!question) return showToast("Ask a question first.", 'error');
        oracleAsked = true;
        const answer = ORACLE_ANSWERS[Math.floor(Math.random() * ORACLE_ANSWERS.length)];
        if (DOM.oracleAnswer) DOM.oracleAnswer.textContent = `"${escapeHtml(question)}"\n\n🔮 ${answer}`;
        if (DOM.oracleLimit) DOM.oracleLimit.textContent = 'You have asked your question for this session.';
    });
}

function initEventListeners() {
    DOM.themeToggleSmall?.addEventListener('click', toggleTheme);
    DOM.connectBtn?.addEventListener('click', connectWallet);
    DOM.disconnectBtn?.addEventListener('click', disconnectWallet);
    DOM.playToggle?.addEventListener('click', () => { useRealMarket = !useRealMarket; DOM.playToggle.textContent = useRealMarket ? '⛓️ Real Market' : '🎮 Play Money'; refreshAll(); });
    document.getElementById('closeTutorialBtn')?.addEventListener('click', () => { DOM.tutorialOverlay.style.display = 'none'; });
    DOM.createBtn?.addEventListener('click', createPrediction);
    DOM.filterSearch?.addEventListener('input', e => { clearTimeout(searchDebounce); searchDebounce = setTimeout(() => { currentFilter.search = e.target.value; saveFilters(); renderPraedictions(); }, 200); });
    DOM.filterCategory?.addEventListener('change', e => { currentFilter.category = e.target.value; saveFilters(); renderPraedictions(); });
    DOM.leaderboardCategoryFilter?.addEventListener('change', async e => { await renderLeaderboard(leaderboardPeriod, e.target.value || null); });
    DOM.revealVotesBtn?.addEventListener('click', toggleBlindVoting);
    DOM.loadMoreBtn?.addEventListener('click', loadMorePredictions);
    DOM.copyWalletBtn?.addEventListener('click', () => { if (walletAddress) navigator.clipboard.writeText(walletAddress).then(() => showToast("Wallet address copied!", 'success')); });

    // Creator bet selection
    DOM.creatorBetYes?.addEventListener('click', () => {
        creatorBetOutcome = 'yes';
        DOM.creatorBetYes.classList.add('selected'); DOM.creatorBetNo.classList.remove('selected');
        if (DOM.creatorBetDisplay) { DOM.creatorBetDisplay.innerHTML = '✅ You believe <strong>YES</strong> – 7 PRAE will be staked'; DOM.creatorBetDisplay.style.color = 'var(--accent)'; }
    });
    DOM.creatorBetNo?.addEventListener('click', () => {
        creatorBetOutcome = 'no';
        DOM.creatorBetNo.classList.add('selected'); DOM.creatorBetYes.classList.remove('selected');
        if (DOM.creatorBetDisplay) { DOM.creatorBetDisplay.innerHTML = '❌ You believe <strong>NO</strong> – 7 PRAE will be staked'; DOM.creatorBetDisplay.style.color = '#FF8888'; }
    });

    // Edit prediction
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.edit-prediction-btn');
        if (!btn) return; const id = btn.dataset.id;
        const prediction = currentPredictions.find(p => p.id === id);
        if (!prediction) return;
        const newTitle = prompt("Edit title:", prediction.title);
        if (!newTitle || newTitle === prediction.title) return;
        try { await callSecureRpc('update_prediction', { predictionId: id, title: sanitize(newTitle, 200) }); prediction.title = sanitize(newTitle, 200); renderPraedictions(); showToast("Prediction updated!", 'success'); } catch (err) { showToast("Edit failed", 'error'); }
    });

    // Auto-detect resolver when typing title
    DOM.title?.addEventListener('input', () => {
        const detected = detectAutoSource(DOM.title.value);
        if (detected) {
            DOM.autoSource.value = detected.source;
            if (detected.detail && DOM.autoSourceDetail) { DOM.autoSourceDetail.value = detected.detail; DOM.autoSourceDetail.style.display = 'block'; }
            DOM.autoSource.style.opacity = '0.6'; DOM.autoSource.style.pointerEvents = 'none';
            if (DOM.sourceUrl) { DOM.sourceUrl.placeholder = 'Auto-resolve selected - no URL needed'; DOM.sourceUrl.style.opacity = '0.5'; DOM.sourceUrl.required = false; }
            showToast(`🤖 Auto-resolve: ${detected.label}`, 'info');
        } else {
            DOM.autoSource.style.opacity = '1'; DOM.autoSource.style.pointerEvents = 'auto';
            if (DOM.sourceUrl) { DOM.sourceUrl.placeholder = 'Proof URL (required)'; DOM.sourceUrl.style.opacity = '1'; DOM.sourceUrl.required = true; }
            if (DOM.autoSourceDetail) DOM.autoSourceDetail.style.display = 'none';
        }
    });

    // Show/hide detail input
    DOM.autoSource?.addEventListener('change', () => {
        const val = DOM.autoSource.value;
        const needsDetail = val.startsWith('weather_') || val === 'sports_' || val === 'wiki_';
        if (DOM.autoSourceDetail) DOM.autoSourceDetail.style.display = needsDetail ? 'block' : 'none';
    });

        // Quick weather bet
        DOM.quickWeather?.addEventListener('click', () => {
            const city = prompt("City name:", "Berlin");
            const temp = prompt("Temperature in °C:", "30");
            if (city && temp) {
                DOM.title.value = `Temperature in ${city} will be above ${temp}°C tomorrow`;
                DOM.description.value = `Open-Meteo weather data for ${city}`;
                DOM.category.value = 'weather';
                DOM.autoSource.value = `weather_temp:${city}`;
                if (DOM.autoSourceDetail) { DOM.autoSourceDetail.value = city; DOM.autoSourceDetail.style.display = 'block'; }
                DOM.targetValue.value = temp; DOM.sourceUrl.value = 'https://open-meteo.com/';
                const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(23, 59, 0, 0);
                DOM.resolutionDate.value = tomorrow.toISOString().slice(0, 16);
                showToast("🌤️ Weather bet filled! Choose YES or NO.", 'success');
            }
        });

        // Quick bet buttons
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-bet-btn');
            if (!btn) return;
            e.stopPropagation();
            const id = btn.dataset.id;
            const outcome = btn.dataset.outcome;
            const amount = parseInt(btn.dataset.amount);
            const amountInput = document.getElementById(`amount-${id}`);
            if (amountInput) amountInput.value = amount;
            const buyBtn = document.querySelector(`.buy-btn[data-id="${id}"][data-outcome="${outcome}"]`);
            if (buyBtn) buyBtn.click();
        });

            // Click username to view profile
            document.addEventListener('click', async (e) => {
                const nameEl = e.target.closest('.user-profile-link');
                if (!nameEl) return;
                const address = nameEl.dataset.address;
                if (!address) return;
                showUserProfile(address);
            });

            // Dispute resolution
            document.addEventListener('click', async (e) => {
                const btn = e.target.closest('.dispute-btn');
                if (!btn) return;
                const id = btn.dataset.id;
                const reason = prompt("Why do you dispute this resolution? Provide evidence:");
                if (!reason) return;
                const prediction = currentPredictions.find(p => p.id === id);
                if (!prediction) return;
                prediction.disputes = prediction.disputes || [];
                prediction.disputes.push({ user: walletAddress, reason, time: Date.now() });
                try {
                    await supabaseClient.from('predictions').update({ disputes: prediction.disputes }).eq('id', id);
                    showToast("⚠️ Dispute filed. Oracle will review.", 'info');
                    renderPraedictions();
                } catch (err) { showToast("Failed to file dispute", 'error'); }
            });

            // Category carousel
            document.querySelectorAll('.category-carousel-btn').forEach(btn => { btn.addEventListener('click', function() { document.querySelectorAll('.category-carousel-btn').forEach(b => b.classList.remove('active-filter')); this.classList.add('active-filter'); currentFilter.category = this.dataset.category; saveFilters(); renderPraedictions(); }); });
            // Status filters
            document.querySelectorAll('.status-filter-btn[data-status]').forEach(btn => { btn.addEventListener('click', function() { document.querySelectorAll('.status-filter-btn[data-status]').forEach(b => b.classList.remove('active-filter')); this.classList.add('active-filter'); currentFilter.status = this.dataset.status; saveFilters(); renderPraedictions(); }); });
            // Tabs
            document.querySelectorAll('.tab-btn').forEach(btn => { btn.addEventListener('click', async function() { const tab = this.dataset.tab; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); this.classList.add('active'); document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active')); document.getElementById(`tab-${tab}`)?.classList.add('active'); if (tab === 'profile') await renderProfile(); else if (tab === 'leaderboard') await renderLeaderboard(leaderboardPeriod); else if (tab === 'halloffame') await renderHallOfFame(); }); });
            // Profile
            DOM.saveProfileBtn?.addEventListener('click', async () => { const name = sanitize(DOM.displayNameInput.value, 20); const avatar = DOM.avatarSelect.value; const nameCheck = isValidDisplayName(name); if (!nameCheck.valid) return showToast(nameCheck.reason, 'error'); if (!name && !avatar) return showToast("Enter a name", 'error'); setLoading(DOM.saveProfileBtn, true); try { await callSecureRpc('update_profile', { display_name: name || null, avatar: avatar || null }); showToast("Profile updated!", 'success'); await refreshAll(); } catch (e) { if (e.message?.includes('already taken')) showToast("Name already taken", 'error'); else if (e.message?.includes('not allowed')) showToast("Name not allowed", 'error'); else showToast(e.message || 'Update failed', 'error'); } finally { setLoading(DOM.saveProfileBtn, false); } });
            DOM.saveZodiacBtn?.addEventListener('click', async () => { const sign = DOM.zodiacSelect.value; if (!sign) return; setLoading(DOM.saveZodiacBtn, true); try { await callSecureRpc('zodiac', { sign }); showToast("Zodiac saved!", 'success'); await renderProfile(); } catch (e) { showToast(e.message || 'Save failed', 'error'); } finally { setLoading(DOM.saveZodiacBtn, false); } });
            DOM.copyReferralBtn?.addEventListener('click', () => { const link = DOM.referralLink?.textContent; if (link) navigator.clipboard.writeText(link).then(() => showToast("Referral link copied!", 'success')); });
            DOM.donateBtn?.addEventListener('click', () => { window.open('https://ko-fi.com/yourusername', '_blank', 'noopener'); });
            DOM.flipCoinBtn?.addEventListener('click', async () => { if (!walletAddress) return; try { const result = await callSecureRpc('flip_coin'); if (result.data?.error) { showToast("🪙 Already flipped today!", 'info'); DOM.flipCoinBtn.textContent = '🪙 Flip Coin (done for today)'; return; } const today = getUTCDayKey(); const stored = JSON.parse(localStorage.getItem('prae_last_flip') || '{}'); stored[walletAddress] = today; localStorage.setItem('prae_last_flip', JSON.stringify(stored)); DOM.flipCoinBtn.textContent = '🪙 Flip Coin (done for today)'; if (result.data?.won) { userPRAEBalance += 0.1; saveBalance(); showToast("You won 0.1 PRAE! 🎉", 'success'); sounds.win(); } else { showToast("Better luck next time.", 'info'); } await renderProfile(); } catch (e) { showToast("Flip failed", 'error'); } });

            // Show My Praedictions
            DOM.showMyPraedictionsBtn?.addEventListener('click', () => { const c = DOM.myPraedictionsList; if (!c) return; if (c.style.display === 'none' || !c.style.display) { const myCreated = currentPredictions.filter(p => p.creator === walletAddress); const myBets = currentPredictions.filter(p => (p.bets || []).some(b => b.user === walletAddress) && p.creator !== walletAddress); let html = ''; if (myCreated.length > 0) { html += '<h4 style="color:var(--accent);">✨ Created by you</h4>'; html += myCreated.map(p => `<div style="background:var(--card-bg);border-radius:12px;padding:12px;margin-bottom:8px;"><strong>${escapeHtml(p.title)}</strong><br><span style="font-size:.8rem;color:var(--text-muted);">Status: ${p.status.toUpperCase()}</span></div>`).join(''); } if (myBets.length > 0) { html += '<h4 style="color:var(--accent);margin-top:12px;">💰 Your bets</h4>'; html += myBets.map(p => { const bet = p.bets.find(b => b.user === walletAddress); return `<div style="background:var(--card-bg);border-radius:12px;padding:12px;margin-bottom:8px;"><strong>${escapeHtml(p.title)}</strong><br><span style="font-size:.8rem;color:var(--text-muted);">${bet.outcome.toUpperCase()} • ${p.status}</span></div>`; }).join(''); } c.innerHTML = html || '<div class="empty-state"><div class="empty-state-icon">📋</div><p>No praedictions yet.</p></div>'; c.style.display = 'block'; } else { c.style.display = 'none'; } });

            document.getElementById('deleteAccountLink')?.addEventListener('click', async e => { e.preventDefault(); if (!confirm("⚠️ Clear all local data?\n\nType CLEAR to confirm.")) return; const input = prompt("Type CLEAR to confirm:"); if (input !== 'CLEAR') return showToast("Cancelled", 'info'); localStorage.clear(); disconnectWallet(); showToast("Local data cleared.", 'info'); });
            document.querySelectorAll('[data-period]').forEach(btn => { btn.addEventListener('click', async function() { document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active-filter')); this.classList.add('active-filter'); await renderLeaderboard(this.dataset.period, DOM.leaderboardCategoryFilter?.value || null); }); });
            initOracleAsk();
}

// Show public user profile
async function showUserProfile(address) {
    const user = await loadUser(address);
    if (!user) return showToast("User not found", 'error');

    const allBets = currentPredictions.flatMap(p => (p.bets || []).filter(b => b.user === address));
    const resolvedBets = currentPredictions.filter(p => p.status === 'resolved' && (p.bets || []).some(b => b.user === address));
    const wonBets = resolvedBets.filter(p => { const b = p.bets.find(b => b.user === address); return b && b.outcome === p.resolved_outcome; });
    const accuracy = resolvedBets.length > 0 ? ((wonBets.length / resolvedBets.length) * 100).toFixed(0) : '-';
    const displayName = user.display_name || `${address.slice(0,6)}...${address.slice(-4)}`;
    const avatar = user.avatar || '👤';
    const prophetTitle = getProphetTitle(user.seerscore || 0);

    const badges = [];
    if (allBets.length >= 1) badges.push('🌱 First Bet');
    if (allBets.length >= 10) badges.push('💰 10 Bets');
    if (allBets.length >= 50) badges.push('💎 50 Bets');
    if (wonBets.length >= 1) badges.push('🎯 First Win');
    if (wonBets.length >= 10) badges.push('🏆 10 Wins');
    if (accuracy > 60) badges.push('📈 Sharp');
    if (accuracy > 80) badges.push('🔮 Oracle Eye');
    if ((user.login_streak || 0) >= 7) badges.push('🔥 7-Day Streak');
    if ((user.seerscore || 0) >= 500) badges.push('👑 Prophet');

    const profileHTML = `
    <div style="text-align:center;padding:20px;">
    <div style="font-size:3rem;">${avatar}</div>
    <h3 style="color:var(--accent);">${escapeHtml(displayName)}</h3>
    <div style="color:var(--oracle-color);">${prophetTitle.emoji} ${prophetTitle.title}</div>
    <div style="margin-top:8px;font-size:.8rem;color:var(--text-muted);">${address.slice(0,6)}...${address.slice(-4)}</div>
    <div style="display:flex;justify-content:center;gap:20px;margin-top:12px;">
    <div><strong>${allBets.length}</strong><br><span style="font-size:.7rem;color:var(--text-muted);">Bets</span></div>
    <div><strong>${accuracy}%</strong><br><span style="font-size:.7rem;color:var(--text-muted);">Accuracy</span></div>
    <div><strong>${user.seerscore || 0}</strong><br><span style="font-size:.7rem;color:var(--text-muted);">Score</span></div>
    </div>
    ${badges.length > 0 ? `<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">${badges.map(b => `<span style="font-size:.7rem;padding:3px 8px;border-radius:12px;background:var(--accent-glow);color:var(--accent);">${b}</span>`).join('')}</div>` : ''}
    <button onclick="this.parentElement.parentElement.remove()" style="margin-top:12px;padding:8px 20px;border-radius:20px;background:var(--accent);color:var(--bg);border:none;cursor:pointer;">Close</button>
    </div>`;

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:5000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `<div style="background:var(--bg);border:1px solid var(--accent);border-radius:20px;max-width:400px;width:90%;">${profileHTML}</div>`;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

// Share win function
function showWinShare(prediction, amount) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-success';
    toast.style.cssText = 'bottom:80px; cursor:pointer; max-width:300px; z-index:2000;';
    toast.innerHTML = `<div style="text-align:center;"><div style="font-size:1.5rem;">🏆</div><div><strong>You won ${amount} PRAE!</strong></div><div style="font-size:.7rem;margin:4px 0;">"${escapeHtml(prediction.title).slice(0, 50)}..."</div><button onclick="navigator.clipboard.writeText('🏆 I just won ${amount} PRAE on PRAEDICTA!\\n\\n\"${prediction.title.replace(/"/g, '')}\"\\n\\nJoin me: ${window.location.origin}/test/')" style="font-size:.7rem;padding:4px 12px;border-radius:20px;background:var(--accent);color:var(--bg);border:none;cursor:pointer;">📋 Share Win</button></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 8000);
}
