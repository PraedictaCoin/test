// ============================================================
// PRAEDICTA – Initialization (init.js) - FINAL
// ============================================================

function initTheme() { if (localStorage.getItem('praedicta_theme') === 'light') document.body.classList.add('light'); }
function toggleTheme() { document.body.classList.toggle('light'); localStorage.setItem('praedicta_theme', document.body.classList.contains('light') ? 'light' : 'dark'); }

function init() {
    initTheme();
    loadFilters();
    cleanOldHoroscopeCache();
    initEventListeners();

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/test/sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.error('SW failed:', err));
        });
    }

    if (window.solana?.isConnected) setTimeout(() => DOM.connectBtn?.click(), 100);

    // Supabase Realtime subscription
    supabaseClient
    .channel('predictions-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => {
        loadPredictions().then(p => { currentPredictions = p; renderPraedictions(); }).catch(() => {});
    })
    .subscribe();

    // Auto-refresh predictions
    let autoRefreshInterval;
    function startAutoRefresh() {
        autoRefreshInterval = setInterval(async () => {
            updateCountdowns();
            if (document.visibilityState === 'visible') {
                const activeTab = document.querySelector('.tab-content.active');
                if (activeTab?.id === 'tab-praedictions') {
                    try {
                        currentPredictions = await loadPredictions();
                        renderPraedictions();
                        if (DOM.totalActive) DOM.totalActive.textContent = currentPredictions.filter(p => p.status === 'active').length;
                        const totalVolume = Object.values(mockMarkets).reduce((s, m) => s + Math.abs((m.yesShares || 0) - 50) + Math.abs((m.noShares || 0) - 50), 0);
                        if (DOM.totalVolume) DOM.totalVolume.textContent = totalVolume.toFixed(0);
                        const hottest = getHottestCategory();
                        if (DOM.hottestCategory) DOM.hottestCategory.innerHTML = `${hottest.icon} Hottest: <strong>${hottest.name}</strong> (${hottest.count} active)`;
                    } catch (e) {}
                }
            }
        }, 30000);
    }
    function stopAutoRefresh() { if (autoRefreshInterval) clearInterval(autoRefreshInterval); }
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') { startAutoRefresh(); refreshAll(); }
        else stopAutoRefresh();
    });
        startAutoRefresh();

        // Auto-reconnect
        window.addEventListener('focus', () => {
            if (!walletAddress && window.solana?.isConnected) {
                showToast("Wallet found! Reconnecting...", 'info');
                setTimeout(() => DOM.connectBtn?.click(), 500);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'SELECT') return;
            switch(e.key.toLowerCase()) {
                case '1': document.querySelector('[data-tab="praedictions"]')?.click(); break;
                case '2': document.querySelector('[data-tab="profile"]')?.click(); break;
                case '3': document.querySelector('[data-tab="oracle"]')?.click(); break;
                case '4': document.querySelector('[data-tab="leaderboard"]')?.click(); break;
                case '5': document.querySelector('[data-tab="halloffame"]')?.click(); break;
                case 'b': toggleBlindVoting(); break;
                case 't': toggleTheme(); break;
                case 'escape': if (DOM.tutorialOverlay?.style.display === 'flex') DOM.tutorialOverlay.style.display = 'none'; break;
            }
        });

        // PWA Install
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault(); deferredPrompt = e;
            setTimeout(() => {
                if (deferredPrompt && !localStorage.getItem('pwa_installed')) {
                    const toast = document.createElement('div');
                    toast.className = 'toast toast-info';
                    toast.style.cssText = 'bottom:80px; cursor:pointer;';
                    toast.textContent = '📱 Install this app? Tap here!';
                    toast.addEventListener('click', async () => {
                        if (deferredPrompt) { await deferredPrompt.prompt(); const r = await deferredPrompt.userChoice; if (r.outcome === 'accepted') localStorage.setItem('pwa_installed', 'true'); deferredPrompt = null; }
                        toast.remove();
                    });
                    document.body.appendChild(toast);
                    setTimeout(() => toast.remove(), 15000);
                }
            }, 30000);
        });
        window.addEventListener('appinstalled', () => { localStorage.setItem('pwa_installed', 'true'); });

        // Analytics persistence
        window.addEventListener('beforeunload', () => {
            if (analyticsData.bets > 0 || analyticsData.creations > 0) {
                try { localStorage.setItem('praedicta_analytics', JSON.stringify(analyticsData)); } catch(e) {}
            }
        });

        // Global error handlers
        window.addEventListener('error', (e) => { console.error('Global error:', e.error); });
        window.addEventListener('unhandledrejection', (e) => { console.error('Unhandled:', e.reason); });
}

init();
