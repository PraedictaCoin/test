// ============================================================
// PRAEDICTA – Initialization (init.js) - FINAL v5
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
    if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('/test/sw.js').then(r => console.log('SW:', r.scope)).catch(e => console.error('SW:', e)); });
    if (window.solana?.isConnected) setTimeout(() => DOM.connectBtn?.click(), 100);

    supabaseClient.channel('predictions-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => { loadPredictions().then(p => { currentPredictions = p; renderPraedictions(); }).catch(() => {}); }).subscribe();

    let autoRefreshInterval;
    function startAutoRefresh() { autoRefreshInterval = setInterval(async () => { updateCountdowns(); if (document.visibilityState === 'visible' && document.querySelector('.tab-content.active')?.id === 'tab-praedictions') { try { currentPredictions = await loadPredictions(); renderPraedictions(); if (DOM.totalActive) DOM.totalActive.textContent = currentPredictions.filter(p => p.status === 'active').length; const tv = Object.values(mockMarkets).reduce((s,m) => s+Math.abs((m.yesShares||0)-50)+Math.abs((m.noShares||0)-50), 0); if (DOM.totalVolume) DOM.totalVolume.textContent = tv.toFixed(0); const hot = getHottestCategory(); if (DOM.hottestCategory) DOM.hottestCategory.innerHTML = `${hot.icon} Hottest: <strong>${hot.name}</strong> (${hot.count})`; } catch(e) {} } }, 30000); }
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
    window.addEventListener('beforeunload', () => { if (analyticsData.bets > 0 || analyticsData.creations > 0) try { localStorage.setItem('praedicta_analytics', JSON.stringify(analyticsData)); } catch(e) {} });
    window.addEventListener('error', e => { console.error('Error:', e.error); });
    window.addEventListener('unhandledrejection', e => { console.error('Rejection:', e.reason); });
}

init();
