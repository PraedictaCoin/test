// ============================================================
// PRAEDICTA – Initialization (init.js) - FINAL v8
// ============================================================

function initTheme() {
    const saved = localStorage.getItem('praedicta_theme');
    if (saved === 'light') document.body.classList.add('light');
    else if (saved === 'dark') document.body.classList.remove('light');
    else if (window.matchMedia('(prefers-color-scheme: light)').matches) document.body.classList.add('light');
}
function toggleTheme() { document.body.classList.toggle('light'); localStorage.setItem('praedicta_theme', document.body.classList.contains('light') ? 'light' : 'dark'); }

function init() {
    initTheme(); loadFilters(); cleanOldHoroscopeCache(); initEventListeners();

    if (window.matchMedia) {
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        darkModeQuery.addEventListener('change', (e) => { const saved = localStorage.getItem('praedicta_theme'); if (!saved) { if (e.matches) document.body.classList.remove('light'); else document.body.classList.add('light'); } });
    }

    if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('/test/sw.js').then(r => console.log('SW:', r.scope)).catch(e => console.error('SW:', e)); });
    if (window.solana?.isConnected) setTimeout(() => DOM.connectBtn?.click(), 100);

    // Predictions real-time sync
    supabaseClient.channel('predictions-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => { 
            loadPredictions().then(p => { currentPredictions = p; renderPraedictions(); }).catch(e => console.debug('Realtime sync skipped:', e.message)); 
        }).subscribe();

    // Order book real-time sync
    supabaseClient.channel('orderbook-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
            console.debug('Order update:', payload.eventType);
            // Reload from server to sync order book
            if (payload.new && payload.new.prediction_id) {
                callSecureRpc('get_orderbook', { predictionId: payload.new.prediction_id }).then(result => {
                    if (result && !result.error) {
                        // Update local order book
                        const id = payload.new.prediction_id;
                        if (!mockMarkets[id]) getMarket(id);
                        // Merge server orders into local book
                        if (result.yesBids) result.yesBids.forEach((o) => {
                            const exists = mockMarkets[id].yesBids.find(b => b.id === o.id);
                            if (!exists && o.status === 'open') mockMarkets[id].yesBids.push({ ...o, user: o.user_wallet });
                        });
                        if (result.noBids) result.noBids.forEach((o) => {
                            const exists = mockMarkets[id].noBids.find(b => b.id === o.id);
                            if (!exists && o.status === 'open') mockMarkets[id].noBids.push({ ...o, user: o.user_wallet });
                        });
                        saveOrderBooks();
                        renderPraedictions();
                    }
                }).catch(e => console.debug('Order sync failed:', e.message));
            }
        }).subscribe();

    // Fill notifications
    supabaseClient.channel('fills-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fills' }, (payload) => {
            const fill = payload.new;
            if (fill && (fill.yes_user === walletAddress || fill.no_user === walletAddress)) {
                addNotification(`⚡ Order filled: ${fill.amount} PRAE @ ${parseFloat(fill.price).toFixed(4)}`, 'win');
            }
        }).subscribe();

    let autoRefreshInterval;
    function startAutoRefresh() { autoRefreshInterval = setInterval(async () => { updateCountdowns(); if (document.visibilityState === 'visible' && document.querySelector('.tab-content.active')?.id === 'tab-praedictions') { try { currentPredictions = await loadPredictions(); renderPraedictions(); if (DOM.totalActive) DOM.totalActive.textContent = currentPredictions.filter(p => p.status === 'active').length; const tv = Object.values(mockMarkets).reduce((s,m) => s+Math.abs((m.yesShares||0)-50)+Math.abs((m.noShares||0)-50), 0); if (DOM.totalVolume) DOM.totalVolume.textContent = tv.toFixed(0); const hot = getHottestCategory(); if (DOM.hottestCategory) DOM.hottestCategory.innerHTML = `${hot.icon} Hottest: <strong>${hot.name}</strong> (${hot.count})`; } catch(e) { console.debug('Auto-refresh failed:', e.message); } } }, 30000); }
    function stopAutoRefresh() { if (autoRefreshInterval) clearInterval(autoRefreshInterval); }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { startAutoRefresh(); refreshAll(); } else stopAutoRefresh(); });
    startAutoRefresh();

    window.addEventListener('focus', () => { if (!walletAddress && window.solana?.isConnected) { showToast("Reconnecting...", 'info'); setTimeout(() => DOM.connectBtn?.click(), 500); } });

    document.addEventListener('keydown', e => { if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return; switch(e.key.toLowerCase()) { case '1': document.querySelector('[data-tab="praedictions"]')?.click(); break; case '2': document.querySelector('[data-tab="profile"]')?.click(); break; case '3': document.querySelector('[data-tab="leaderboard"]')?.click(); break; case '4': document.querySelector('[data-tab="support"]')?.click(); break; case 'b': toggleBlindVoting(); break; case 't': toggleTheme(); break; } });

    let touchStart = 0;
    document.addEventListener('touchstart', e => { touchStart = e.touches[0].clientY; });
    document.addEventListener('touchend', e => { if (window.scrollY === 0 && e.changedTouches[0].clientY - touchStart > 80) { refreshAll(); showToast('🔄 Refreshed!', 'info'); } });
    window.addEventListener('scroll', () => { const btn = document.getElementById('backToTop'); if (btn) btn.style.display = window.scrollY > 500 ? 'block' : 'none'; });

    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; setTimeout(() => { if (deferredPrompt && !localStorage.getItem('pwa_installed')) { const t = document.createElement('div'); t.className = 'toast toast-info'; t.style.cssText = 'bottom:80px;cursor:pointer;'; t.textContent = '📱 Install app?'; t.addEventListener('click', async () => { if (deferredPrompt) { await deferredPrompt.prompt(); const r = await deferredPrompt.userChoice; if (r.outcome === 'accepted') localStorage.setItem('pwa_installed', 'true'); deferredPrompt = null; } t.remove(); }); document.body.appendChild(t); setTimeout(() => t.remove(), 15000); } }, 30000); });
    window.addEventListener('appinstalled', () => { localStorage.setItem('pwa_installed', 'true'); });
    window.addEventListener('beforeunload', () => { if (analyticsData.bets > 0 || analyticsData.creations > 0) try { localStorage.setItem('praedicta_analytics', JSON.stringify(analyticsData)); } catch(e) { console.debug('Analytics save failed:', e); } });
    window.addEventListener('error', e => { console.error('Global error:', e.error?.message || e.message); });
    window.addEventListener('unhandledrejection', e => { console.error('Unhandled rejection:', e.reason?.message || e.reason); });

    initMicroInteractions(); updateLiveCounter();

    const checkWalletInterval = setInterval(() => { if (walletAddress) { checkSurpriseDrop(); checkMilestones(); renderQuickStart(); clearInterval(checkWalletInterval); } }, 1000);
    setTimeout(() => clearInterval(checkWalletInterval), 30000);

    const origRenderProfile = renderProfile;
    renderProfile = async function(...args) { await origRenderProfile.apply(this, args); renderQuickStart(); };
}

init();
