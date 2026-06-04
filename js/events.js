// ============================================================
// PRAEDICTA – Event Listeners (events.js) - FINAL v8
// ============================================================

function initOracleAsk() {
    DOM.oracleBtn?.addEventListener('click', () => {
        if (oracleAsked) return showToast("🦉 Once per login.", 'info');
        const question = prompt("What do you wish to know?");
        if (!question) return; oracleAsked = true;
        const answer = ORACLE_ANSWERS[Math.floor(Math.random() * ORACLE_ANSWERS.length)];
        showToast(`🔮 ${answer}`, 'info');
    });
}

function initEventListeners() {
    DOM.themeToggleSmall?.addEventListener('click', toggleTheme);
    DOM.connectBtn?.addEventListener('click', connectWallet);
    DOM.disconnectBtn?.addEventListener('click', disconnectWallet);
    DOM.playToggle?.addEventListener('click', () => { useRealMarket = !useRealMarket; DOM.playToggle.textContent = useRealMarket ? '⛓️ Real' : '🎮 Play'; refreshAll(); });
    document.getElementById('closeTutorialBtn')?.addEventListener('click', () => { DOM.tutorialOverlay.style.display = 'none'; });
    DOM.createBtn?.addEventListener('click', createPrediction);
    DOM.filterSearch?.addEventListener('input', e => { clearTimeout(searchDebounce); searchDebounce = setTimeout(() => { currentFilter.search = e.target.value; saveFilters(); renderPraedictions(); }, 200); });
    DOM.filterSearch?.addEventListener('keydown', e => { if (e.key === 'Enter') { const fc = document.querySelector('.praediction-card'); if (fc) fc.scrollIntoView({ behavior: 'smooth' }); } });
    DOM.filterCategory?.addEventListener('change', e => { currentFilter.category = e.target.value; saveFilters(); renderPraedictions(); });
    DOM.leaderboardCategoryFilter?.addEventListener('change', async e => { await renderLeaderboard(leaderboardPeriod, e.target.value || null); });
    DOM.revealVotesBtn?.addEventListener('click', toggleBlindVoting);
    DOM.loadMoreBtn?.addEventListener('click', loadMorePredictions);
    DOM.copyWalletBtn?.addEventListener('click', () => { if (walletAddress) navigator.clipboard.writeText(walletAddress).then(() => showToast("Copied!", 'success')); });

    DOM.creatorBetYes?.addEventListener('click', () => { creatorBetOutcome = 'yes'; DOM.creatorBetYes.classList.add('selected'); DOM.creatorBetNo.classList.remove('selected'); if (DOM.creatorBetDisplay) { DOM.creatorBetDisplay.innerHTML = '✅ You believe <strong>YES</strong> – 7 PRAE staked'; DOM.creatorBetDisplay.style.color = 'var(--accent)'; } });
    DOM.creatorBetNo?.addEventListener('click', () => { creatorBetOutcome = 'no'; DOM.creatorBetNo.classList.add('selected'); DOM.creatorBetYes.classList.remove('selected'); if (DOM.creatorBetDisplay) { DOM.creatorBetDisplay.innerHTML = '❌ You believe <strong>NO</strong> – 7 PRAE staked'; DOM.creatorBetDisplay.style.color = '#FF8888'; } });

    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.edit-prediction-btn'); if (!btn) return;
        const id = btn.dataset.id, p = currentPredictions.find(p => p.id === id); if (!p) return;
        const nt = prompt("Edit title:", p.title); if (!nt || nt === p.title) return;
        try { await callSecureRpc('update_prediction', { predictionId: id, title: sanitize(nt, 200) }); p.title = sanitize(nt, 200); renderPraedictions(); showToast("Updated!", 'success'); } catch (err) { showToast("Failed", 'error'); }
    });
    document.addEventListener('click', (e) => { const btn = e.target.closest('.quick-bet-btn'); if (!btn) return; e.stopPropagation(); const id = btn.dataset.id, o = btn.dataset.outcome, a = parseInt(btn.dataset.amount); const ai = document.getElementById(`amount-${id}`); if (ai) ai.value = a; const bb = document.querySelector(`.buy-btn[data-id="${id}"][data-outcome="${o}"]`); if (bb) bb.click(); });
    document.addEventListener('click', async (e) => { const el = e.target.closest('.user-profile-link'); if (!el) return; const addr = el.dataset.address; if (!addr) return; showUserProfile(addr); });
    document.addEventListener('click', async (e) => { const btn = e.target.closest('.dispute-btn'); if (!btn) return; const id = btn.dataset.id, reason = prompt("Why dispute? Evidence:"); if (!reason) return; const p = currentPredictions.find(p => p.id === id); if (!p) return; p.disputes = p.disputes || []; p.disputes.push({ user: walletAddress, reason, time: Date.now() }); try { await supabaseClient.from('predictions').update({ disputes: p.disputes }).eq('id', id); showToast("⚠️ Dispute filed.", 'info'); renderPraedictions(); } catch (err) { showToast("Failed", 'error'); } });
    document.addEventListener('click', (e) => { const btn = e.target.closest('.copy-trade-btn'); if (!btn) return; const id = btn.dataset.id, o = btn.dataset.outcome, a = parseInt(btn.dataset.amount)||CONFIG.MIN_BET; const ai = document.getElementById(`amount-${id}`); if (ai) ai.value = a; const bb = document.querySelector(`.buy-btn[data-id="${id}"][data-outcome="${o}"]`); if (bb) bb.click(); });
    document.addEventListener('dblclick', (e) => { const inp = e.target.closest('.buy-amount'); if (!inp) return; const id = inp.id.split('-')[1], m = getMarket(id), p = getYesPrice(m); inp.value = getMaxBet(userPRAEBalance, p); updatePayout({ target: inp }); showToast(`Max: ${getMaxBet(userPRAEBalance, p)} PRAE`, 'info'); });

    let swipeX = 0;
    document.addEventListener('touchstart', e => { if (e.target.closest('.praediction-card')) swipeX = e.touches[0].clientX; });
    document.addEventListener('touchend', e => { const d = e.changedTouches[0].clientX - swipeX; if (Math.abs(d) < 60) return; const card = e.target.closest('.praediction-card'); if (!card) return; const bb = card.querySelector(d > 0 ? '.buy-btn[data-outcome="yes"]' : '.buy-btn[data-outcome="no"]'); if (bb) bb.click(); });

    DOM.title?.addEventListener('input', () => { const d = detectAutoSource(DOM.title.value); if (d) { DOM.autoSource.value = d.source; if (d.detail && DOM.autoSourceDetail) { DOM.autoSourceDetail.value = d.detail; DOM.autoSourceDetail.style.display = 'block'; } DOM.autoSource.style.opacity = '0.6'; DOM.autoSource.style.pointerEvents = 'none'; if (DOM.sourceUrl) { DOM.sourceUrl.placeholder = 'Auto-resolve - no URL needed'; DOM.sourceUrl.style.opacity = '0.5'; } showToast(`🤖 ${d.label}`, 'info'); } else { DOM.autoSource.style.opacity = '1'; DOM.autoSource.style.pointerEvents = 'auto'; if (DOM.sourceUrl) { DOM.sourceUrl.placeholder = 'Proof URL (required)'; DOM.sourceUrl.style.opacity = '1'; } if (DOM.autoSourceDetail) DOM.autoSourceDetail.style.display = 'none'; } });
    DOM.autoSource?.addEventListener('change', () => { const v = DOM.autoSource.value; if (DOM.autoSourceDetail) DOM.autoSourceDetail.style.display = (v.startsWith('weather_') || v === 'sports_' || v === 'wiki_') ? 'block' : 'none'; });
    DOM.quickWeather?.addEventListener('click', () => { const city = prompt("City:", "Berlin"), temp = prompt("°C:", "30"); if (city && temp) { DOM.title.value = `${city} above ${temp}°C tomorrow`; DOM.category.value = 'weather'; DOM.autoSource.value = `weather_temp:${city}`; if (DOM.autoSourceDetail) { DOM.autoSourceDetail.value = city; DOM.autoSourceDetail.style.display = 'block'; } DOM.targetValue.value = temp; const t = new Date(); t.setDate(t.getDate()+1); t.setHours(23,59,0,0); DOM.resolutionDate.value = t.toISOString().slice(0,16); showToast("🌤️ Filled!", 'success'); } });

    document.querySelectorAll('.category-carousel-btn').forEach(b => { b.addEventListener('click', function() { document.querySelectorAll('.category-carousel-btn').forEach(x => x.classList.remove('active-filter')); this.classList.add('active-filter'); currentFilter.category = this.dataset.category; saveFilters(); renderPraedictions(); }); });
    document.querySelectorAll('.status-filter-btn[data-status]').forEach(b => { b.addEventListener('click', function() { document.querySelectorAll('.status-filter-btn[data-status]').forEach(x => x.classList.remove('active-filter')); this.classList.add('active-filter'); currentFilter.status = this.dataset.status; saveFilters(); renderPraedictions(); }); });
    document.querySelectorAll('.tab-btn').forEach(b => { b.addEventListener('click', async function() { const tab = this.dataset.tab; document.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active')); this.classList.add('active'); document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active')); document.getElementById(`tab-${tab}`)?.classList.add('active'); if (tab === 'profile') await renderProfile(); else if (tab === 'leaderboard') await renderLeaderboard(leaderboardPeriod); else if (tab === 'halloffame') await renderHallOfFame(); }); });
    DOM.saveProfileBtn?.addEventListener('click', async () => { const name = sanitize(DOM.displayNameInput.value, 20), av = DOM.avatarSelect.value; const nc = isValidDisplayName(name); if (!nc.valid) return showToast(nc.reason, 'error'); if (!name && !av) return showToast("Enter a name", 'error'); setLoading(DOM.saveProfileBtn, true); try { await callSecureRpc('update_profile', { display_name: name||null, avatar: av||null }); showToast("Updated!", 'success'); await refreshAll(); } catch (e) { showToast(e.message?.includes('taken')?'Name taken':e.message||'Failed', 'error'); } finally { setLoading(DOM.saveProfileBtn, false); } });
    DOM.saveZodiacBtn?.addEventListener('click', async () => { const s = DOM.zodiacSelect.value; if (!s) return; setLoading(DOM.saveZodiacBtn, true); try { await callSecureRpc('zodiac', { sign: s }); showToast("Saved!", 'success'); await renderProfile(); } catch (e) { showToast("Failed", 'error'); } finally { setLoading(DOM.saveZodiacBtn, false); } });
    DOM.copyReferralBtn?.addEventListener('click', () => { const l = DOM.referralLink?.textContent; if (l) navigator.clipboard.writeText(l).then(() => showToast("Copied!", 'success')); });
    DOM.donateBtn?.addEventListener('click', () => { window.open('https://ko-fi.com/yourusername', '_blank', 'noopener'); });
    DOM.flipCoinBtn?.addEventListener('click', async () => { if (!walletAddress) return; try { const r = await callSecureRpc('flip_coin'); if (r.data?.error) { showToast("Already flipped!", 'info'); DOM.flipCoinBtn.textContent = '🪙 Done'; return; } const t = getUTCDayKey(), s = JSON.parse(localStorage.getItem('prae_last_flip')||'{}'); s[walletAddress] = t; localStorage.setItem('prae_last_flip', JSON.stringify(s)); DOM.flipCoinBtn.textContent = '🪙 Done'; if (r.data?.won) { userPRAEBalance += 0.1; saveBalance(); showToast("+0.1 PRAE! 🎉", 'success'); sounds.win(); } else showToast("Better luck next time.", 'info'); await renderProfile(); } catch (e) { showToast("Failed", 'error'); } });
    DOM.showMyPraedictionsBtn?.addEventListener('click', () => { const c = DOM.myPraedictionsList; if (!c) return; if (c.style.display === 'none' || !c.style.display) { const mc = currentPredictions.filter(p => p.creator === walletAddress), mb = currentPredictions.filter(p => (p.bets||[]).some(b => b.user === walletAddress) && p.creator !== walletAddress); let h = ''; if (mc.length > 0) { h += '<h4 style="color:var(--accent);">✨ Created</h4>'; h += mc.map(p => `<div style="background:var(--card-bg);border-radius:12px;padding:12px;margin-bottom:8px;"><strong>${escapeHtml(p.title)}</strong><br><span style="font-size:.8rem;color:var(--text-muted);">${p.status.toUpperCase()}</span></div>`).join(''); } if (mb.length > 0) { h += '<h4 style="color:var(--accent);margin-top:12px;">💰 Bets</h4>'; h += mb.map(p => { const b = p.bets.find(b => b.user === walletAddress); return `<div style="background:var(--card-bg);border-radius:12px;padding:12px;margin-bottom:8px;"><strong>${escapeHtml(p.title)}</strong><br><span style="font-size:.8rem;color:var(--text-muted);">${b.outcome.toUpperCase()} · ${p.status}</span></div>`; }).join(''); } c.innerHTML = h || '<div class="empty-state"><div class="empty-state-icon">📋</div><p>No praedictions yet.</p></div>'; c.style.display = 'block'; } else c.style.display = 'none'; });
    document.getElementById('deleteAccountLink')?.addEventListener('click', async e => { e.preventDefault(); if (!confirm("Clear data? Type CLEAR")) return; if (prompt("Type CLEAR:") !== 'CLEAR') return showToast("Cancelled", 'info'); localStorage.clear(); disconnectWallet(); showToast("Cleared.", 'info'); });
    document.querySelectorAll('[data-period]').forEach(b => { b.addEventListener('click', async function() { document.querySelectorAll('[data-period]').forEach(x => x.classList.remove('active-filter')); this.classList.add('active-filter'); await renderLeaderboard(this.dataset.period, DOM.leaderboardCategoryFilter?.value||null); }); });
    initOracleAsk();
}

async function showUserProfile(address) {
    const user = await loadUser(address); if (!user) return showToast("Not found", 'error');
    const allBets = currentPredictions.flatMap(p => (p.bets||[]).filter(b => b.user === address));
    const resolvedBets = currentPredictions.filter(p => p.status === 'resolved' && (p.bets||[]).some(b => b.user === address));
    const wonBets = resolvedBets.filter(p => { const b = p.bets.find(b => b.user === address); return b && b.outcome === p.resolved_outcome; });
    const acc = resolvedBets.length > 0 ? ((wonBets.length/resolvedBets.length)*100).toFixed(0) : '-';
    const dn = user.display_name || `${address.slice(0,6)}...${address.slice(-4)}`;
    const pt = getProphetTitle(user.seerscore || 0);
    const badges = []; if (allBets.length>=1) badges.push('🌱 First'); if (allBets.length>=10) badges.push('💰 10'); if (allBets.length>=50) badges.push('💎 50'); if (wonBets.length>=1) badges.push('🎯 Win'); if (wonBets.length>=10) badges.push('🏆 10W'); if (+acc>60) badges.push('📈 Sharp'); if (+acc>80) badges.push('🔮 Eye'); if ((user.login_streak||0)>=7) badges.push('🔥 7Day'); if ((user.seerscore||0)>=500) badges.push('👑 Prophet');
    const modal = document.createElement('div'); modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:5000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `<div style="background:var(--bg);border:1px solid var(--accent);border-radius:20px;max-width:400px;width:90%;padding:24px;text-align:center;"><div style="font-size:3rem;">${user.avatar||'👤'}</div><h3 style="color:var(--accent);">${escapeHtml(dn)}</h3><div style="color:var(--oracle-color);">${pt.emoji} ${pt.title}</div><div style="margin-top:8px;font-size:.8rem;color:var(--text-muted);">${address.slice(0,6)}...${address.slice(-4)}</div><div style="display:flex;justify-content:center;gap:20px;margin-top:12px;"><div><strong>${allBets.length}</strong><br><span style="font-size:.7rem;color:var(--text-muted);">Bets</span></div><div><strong>${acc}%</strong><br><span style="font-size:.7rem;color:var(--text-muted);">Acc</span></div><div><strong>${user.seerscore||0}</strong><br><span style="font-size:.7rem;color:var(--text-muted);">Score</span></div></div>${badges.length>0?`<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">${badges.map(b=>`<span style="font-size:.7rem;padding:3px 8px;border-radius:12px;background:var(--accent-glow);color:var(--accent);">${b}</span>`).join('')}</div>`:''}<button onclick="this.closest('div[style*=z-index\\:5000]').remove()" style="margin-top:12px;padding:8px 20px;border-radius:20px;background:var(--accent);color:var(--bg);border:none;cursor:pointer;">Close</button></div>`;
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
}

function showWinShare(prediction, amount) {
    const toast = document.createElement('div'); toast.className = 'toast toast-success'; toast.style.cssText = 'bottom:80px;cursor:pointer;max-width:300px;z-index:2000;';
    toast.innerHTML = `<div style="text-align:center;"><div style="font-size:1.5rem;">🏆</div><div><strong>+${amount} PRAE!</strong></div><div style="font-size:.7rem;margin:4px 0;">"${escapeHtml(prediction.title).slice(0,50)}..."</div><button onclick="navigator.clipboard.writeText('🏆 I won ${amount} PRAE on PRAEDICTA!\\n\\n${prediction.title}\\n\\n${window.location.origin}/test/')" style="font-size:.7rem;padding:4px 12px;border-radius:20px;background:var(--accent);color:var(--bg);border:none;cursor:pointer;">📋 Share</button></div>`;
    document.body.appendChild(toast); setTimeout(() => toast.remove(), 8000);
}
