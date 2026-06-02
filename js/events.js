// ============================================================
// PRAEDICTA – Event Listeners
// ============================================================

function initOracleAsk() { if (!DOM.askOracleBtn) return; DOM.askOracleBtn.addEventListener('click', () => { if (oracleAsked) return showToast("🦉 You may only ask once per login."); const question = sanitize(DOM.oracleQuestion?.value || '', 200); if (!question) return showToast("Ask a question first."); oracleAsked = true; const answer = ORACLE_ANSWERS[Math.floor(Math.random() * ORACLE_ANSWERS.length)]; if (DOM.oracleAnswer) DOM.oracleAnswer.textContent = `"${escapeHtml(question)}"\n\n🔮 ${answer}`; if (DOM.oracleLimit) DOM.oracleLimit.textContent = 'You have asked your question for this session.'; }); }

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
    DOM.copyWalletBtn?.addEventListener('click', () => { if (walletAddress) navigator.clipboard.writeText(walletAddress).then(() => showToast("Wallet address copied!")); });

    // Creator bet selection with visual feedback
    DOM.creatorBetYes?.addEventListener('click', () => {
        creatorBetOutcome = 'yes';
        DOM.creatorBetYes.classList.add('selected');
        DOM.creatorBetNo.classList.remove('selected');
        if (DOM.creatorBetDisplay) {
            DOM.creatorBetDisplay.innerHTML = '✅ You believe <strong>YES</strong> – 7 PRAE will be staked';
            DOM.creatorBetDisplay.style.color = 'var(--accent)';
        }
    });

    DOM.creatorBetNo?.addEventListener('click', () => {
        creatorBetOutcome = 'no';
        DOM.creatorBetNo.classList.add('selected');
        DOM.creatorBetYes.classList.remove('selected');
        if (DOM.creatorBetDisplay) {
            DOM.creatorBetDisplay.innerHTML = '❌ You believe <strong>NO</strong> – 7 PRAE will be staked';
            DOM.creatorBetDisplay.style.color = '#FF8888';
        }
    });

    document.querySelectorAll('.category-carousel-btn').forEach(btn => { btn.addEventListener('click', function() { document.querySelectorAll('.category-carousel-btn').forEach(b => b.classList.remove('active-filter')); this.classList.add('active-filter'); currentFilter.category = this.dataset.category; saveFilters(); renderPraedictions(); }); });
    document.querySelectorAll('.status-filter-btn[data-status]').forEach(btn => { btn.addEventListener('click', function() { document.querySelectorAll('.status-filter-btn[data-status]').forEach(b => b.classList.remove('active-filter')); this.classList.add('active-filter'); currentFilter.status = this.dataset.status; saveFilters(); renderPraedictions(); }); });
    document.querySelectorAll('.tab-btn').forEach(btn => { btn.addEventListener('click', async function() { const tab = this.dataset.tab; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); this.classList.add('active'); document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active')); document.getElementById(`tab-${tab}`)?.classList.add('active'); if (tab === 'profile') await renderProfile(); else if (tab === 'leaderboard') await renderLeaderboard(leaderboardPeriod); else if (tab === 'halloffame') await renderHallOfFame(); }); });
    DOM.saveProfileBtn?.addEventListener('click', async () => { const name = sanitize(DOM.displayNameInput.value, 20); const avatar = DOM.avatarSelect.value; if (!name && !avatar) return showToast("Enter a name"); setLoading(DOM.saveProfileBtn, true); try { await callSecureRpc('update_profile', { display_name: name || null, avatar: avatar || null }); showToast("Profile updated!"); await refreshAll(); } catch (e) { showToast(e.message || 'Update failed'); } finally { setLoading(DOM.saveProfileBtn, false); } });
    DOM.saveZodiacBtn?.addEventListener('click', async () => { const sign = DOM.zodiacSelect.value; if (!sign) return; setLoading(DOM.saveZodiacBtn, true); try { await callSecureRpc('zodiac', { sign }); showToast("Zodiac saved!"); await renderProfile(); } catch (e) { showToast(e.message || 'Save failed'); } finally { setLoading(DOM.saveZodiacBtn, false); } });
    DOM.copyReferralBtn?.addEventListener('click', () => { const link = DOM.referralLink?.textContent; if (link) navigator.clipboard.writeText(link).then(() => showToast("Copied!")); });
    DOM.donateBtn?.addEventListener('click', () => { window.open('https://ko-fi.com/yourusername', '_blank', 'noopener'); });
    DOM.flipCoinBtn?.addEventListener('click', async () => { if (!walletAddress) return; try { const result = await callSecureRpc('flip_coin'); if (result.data?.error) { showToast("🪙 Already flipped today!"); DOM.flipCoinBtn.textContent = '🪙 Flip Coin (done for today)'; return; } const today = getUTCDayKey(); const stored = JSON.parse(localStorage.getItem('prae_last_flip') || '{}'); stored[walletAddress] = today; localStorage.setItem('prae_last_flip', JSON.stringify(stored)); DOM.flipCoinBtn.textContent = '🪙 Flip Coin (done for today)'; if (result.data?.won) { userPRAEBalance += 0.1; saveBalance(); showToast("You won 0.1 PRAE! 🎉"); } else { showToast("Better luck next time."); } await renderProfile(); } catch (e) { showToast("Flip failed"); } });
    DOM.showMyPraedictionsBtn?.addEventListener('click', () => { const c = DOM.myPraedictionsList; if (!c) return; if (c.style.display === 'none' || !c.style.display) { const myCreated = currentPredictions.filter(p => p.creator === walletAddress); const myBets = currentPredictions.filter(p => (p.bets || []).some(b => b.user === walletAddress) && p.creator !== walletAddress); let html = ''; if (myCreated.length > 0) { html += '<h4 style="color:var(--accent);">✨ Created by you</h4>'; html += myCreated.map(p => `<div style="background:var(--card-bg);border-radius:12px;padding:12px;margin-bottom:8px;"><strong>${escapeHtml(p.title)}</strong><br><span style="font-size:.8rem;color:var(--text-muted);">Status: ${p.status.toUpperCase()}</span></div>`).join(''); } if (myBets.length > 0) { html += '<h4 style="color:var(--accent);margin-top:12px;">💰 Your bets</h4>'; html += myBets.map(p => { const bet = p.bets.find(b => b.user === walletAddress); return `<div style="background:var(--card-bg);border-radius:12px;padding:12px;margin-bottom:8px;"><strong>${escapeHtml(p.title)}</strong><br><span style="font-size:.8rem;color:var(--text-muted);">${bet.outcome.toUpperCase()} • ${p.status}</span></div>`; }).join(''); } c.innerHTML = html || 'No praedictions yet.'; c.style.display = 'block'; } else { c.style.display = 'none'; } });
    document.getElementById('deleteAccountLink')?.addEventListener('click', async e => { e.preventDefault(); if (!confirm("Permanently delete all your data?")) return; setLoading(e.target, true); try { await callSecureRpc('delete'); showToast("Account deleted. Reloading..."); localStorage.clear(); window.location.reload(); } catch (err) { showToast("Deletion failed: " + err.message); } finally { setLoading(e.target, false); } });
    document.querySelectorAll('[data-period]').forEach(btn => { btn.addEventListener('click', async function() { document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active-filter')); this.classList.add('active-filter'); await renderLeaderboard(this.dataset.period, DOM.leaderboardCategoryFilter?.value || null); }); });
    initOracleAsk();
}
