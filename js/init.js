// ============================================================
// PRAEDICTA – Initialization (init.js) - FINAL v9
// ============================================================

function initTheme() { const saved = localStorage.getItem('praedicta_theme'); if (saved === 'light') document.body.classList.add('light'); else if (saved === 'dark') document.body.classList.remove('light'); else if (window.matchMedia('(prefers-color-scheme: light)').matches) document.body.classList.add('light'); }
function toggleTheme() { document.body.classList.toggle('light'); localStorage.setItem('praedicta_theme', document.body.classList.contains('light') ? 'light' : 'dark'); }

function initTheme(); 
if (typeof loadFilters === 'function') loadFilters(); 
if (typeof cleanOldHoroscopeCache === 'function') cleanOldHoroscopeCache(); 
initEventListeners();
    
    // System theme detection
    if (window.matchMedia) { const dmq = window.matchMedia('(prefers-color-scheme: dark)'); dmq.addEventListener('change', (e) => { const saved = localStorage.getItem('praedicta_theme'); if (!saved) { if (e.matches) document.body.classList.remove('light'); else document.body.classList.add('light'); } }); }
    
    // Service worker
    if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('/test/sw.js').then(r => console.log('SW:', r.scope)).catch(e => console.error('SW:', e)); });
    if (window.solana?.isConnected) setTimeout(() => DOM.connectBtn?.click(), 100);
    
    // Daily challenge reset
    const savedChallenge = JSON.parse(localStorage.getItem('prae_daily_challenge') || '{}');
    if (savedChallenge.date && savedChallenge.date !== getUTCDayKey()) {
        dailyChallengeCompleted = false;
        if (!savedChallenge.completed) dailyChallengeStreak = 0;
    }
    
    // Real-time subscriptions
    supabaseClient.channel('predictions-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, () => { loadPredictions().then(p => { currentPredictions = p; renderPraedictions(); }).catch(e => console.debug('Realtime:', e.message)); }).subscribe();
    supabaseClient.channel('orderbook-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => { if (payload.new && payload.new.prediction_id) { syncOrderBookFromServer(payload.new.prediction_id); } }).subscribe();
    supabaseClient.channel('fills-changes').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fills' }, (payload) => { const fill = payload.new; if (fill && (fill.yes_user === walletAddress || fill.no_user === walletAddress)) { addNotification(`⚡ Order filled: ${fill.amount} PRAE @ ${parseFloat(fill.price).toFixed(4)}`, 'win'); } }).subscribe();
    
    startConsolidatedInterval();
    prefetchPredictions();
    initMicroInteractions(); updateLiveCounter();
    
    const checkWalletInterval = setInterval(() => { if (walletAddress) { checkSurpriseDrop(); checkMilestones(); clearInterval(checkWalletInterval); } }, 1000);
    setTimeout(() => clearInterval(checkWalletInterval), 30000);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', e => { if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return; switch(e.key.toLowerCase()) { case '1': document.querySelector('[data-tab="praedictions"]')?.click(); break; case '2': document.querySelector('[data-tab="profile"]')?.click(); break; case '3': document.querySelector('[data-tab="leaderboard"]')?.click(); break; case '4': document.querySelector('[data-tab="support"]')?.click(); break; case 'b': toggleBlindVoting(); break; case 't': toggleTheme(); break; } });
    
    // Mobile FAB
    if (window.innerWidth <= 768) { const fab = document.getElementById('createFab'); if (fab) fab.style.display = 'flex'; } else { const fab = document.getElementById('createFab'); if (fab) fab.style.display = 'none'; const form = document.querySelector('.create-praediction'); if (form) form.classList.add('expanded'); }
    window.addEventListener('resize', () => { const fab = document.getElementById('createFab'); if (window.innerWidth <= 768) { if (fab) fab.style.display = 'flex'; } else { if (fab) fab.style.display = 'none'; const form = document.querySelector('.create-praediction'); if (form) form.classList.add('expanded'); } });
    
    // PWA install
    let deferredPrompt; window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; setTimeout(() => { if (deferredPrompt && !localStorage.getItem('pwa_installed')) { const t = document.createElement('div'); t.className = 'toast toast-info'; t.style.cssText = 'bottom:80px;cursor:pointer;'; t.textContent = '📱 Install app?'; t.addEventListener('click', async () => { if (deferredPrompt) { await deferredPrompt.prompt(); const r = await deferredPrompt.userChoice; if (r.outcome === 'accepted') localStorage.setItem('pwa_installed', 'true'); deferredPrompt = null; } t.remove(); }); document.body.appendChild(t); setTimeout(() => t.remove(), 15000); } }, 30000); });
    window.addEventListener('appinstalled', () => { localStorage.setItem('pwa_installed', 'true'); });
    window.addEventListener('beforeunload', () => { if (analyticsData.bets > 0 || analyticsData.creations > 0) try { localStorage.setItem('praedicta_analytics', JSON.stringify(analyticsData)); } catch(e) {} stopAllIntervals(); if (crossTabChannel) crossTabChannel.close(); if (localStorageDirty) { try { saveOrderBooks(); } catch(e) {} } });
    window.addEventListener('error', e => { console.error('Error:', e.error?.message || e.message); });
    window.addEventListener('unhandledrejection', e => { console.error('Rejection:', e.reason?.message || e.reason); });
}

init();
