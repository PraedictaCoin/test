// ============================================================
// PRAEDICTA – Initialization (init.js) - FINAL v9
// ============================================================

function initTheme() { 
    var saved = localStorage.getItem('praedicta_theme'); 
    if (saved === 'light') document.body.classList.add('light'); 
    else if (saved === 'dark') document.body.classList.remove('light'); 
    else if (window.matchMedia('(prefers-color-scheme: light)').matches) document.body.classList.add('light'); 
}

function toggleTheme() { 
    document.body.classList.toggle('light'); 
    localStorage.setItem('praedicta_theme', document.body.classList.contains('light') ? 'light' : 'dark'); 
}

function init() {
    initTheme(); 
    if (typeof loadFilters === 'function') loadFilters(); 
    if (typeof cleanOldHoroscopeCache === 'function') cleanOldHoroscopeCache(); 
    initEventListeners();
    
    // System theme detection
    if (window.matchMedia) {
        var dmq = window.matchMedia('(prefers-color-scheme: dark)');
        dmq.addEventListener('change', function(e) {
            var saved = localStorage.getItem('praedicta_theme');
            if (!saved) {
                if (e.matches) document.body.classList.remove('light');
                else document.body.classList.add('light');
            }
        });
    }
    
    // Service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/test/sw.js')
                .then(function(r) { console.log('SW:', r.scope); })
                .catch(function(e) { console.error('SW:', e); });
        });
    }
    
    if (window.solana && window.solana.isConnected) {
        setTimeout(function() { 
            if (DOM.connectBtn) DOM.connectBtn.click(); 
        }, 100);
    }
    
    // Daily challenge reset
    try {
        var savedChallenge = JSON.parse(localStorage.getItem('prae_daily_challenge') || '{}');
        if (savedChallenge.date && savedChallenge.date !== getUTCDayKey()) {
            dailyChallengeCompleted = false;
            if (!savedChallenge.completed) dailyChallengeStreak = 0;
        }
    } catch(e) {}
    
    // Real-time subscriptions
    supabaseClient.channel('predictions-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, function() {
            loadPredictions().then(function(p) { 
                currentPredictions = p; 
                renderPraedictions(); 
            }).catch(function(e) { 
                console.debug('Realtime:', e.message); 
            });
        }).subscribe();
    
    supabaseClient.channel('orderbook-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, function(payload) {
            if (payload.new && payload.new.prediction_id) {
                syncOrderBookFromServer(payload.new.prediction_id);
            }
        }).subscribe();
    
    supabaseClient.channel('fills-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fills' }, function(payload) {
            var fill = payload.new;
            if (fill && (fill.yes_user === walletAddress || fill.no_user === walletAddress)) {
                addNotification('⚡ Order filled: ' + fill.amount + ' PRAE @ ' + parseFloat(fill.price).toFixed(4), 'win');
            }
        }).subscribe();
    
    if (typeof startConsolidatedInterval === 'function') startConsolidatedInterval();
    initMicroInteractions(); 
    updateLiveCounter();
    
    var checkWalletInterval = setInterval(function() { 
        if (walletAddress) { 
            if (typeof checkSurpriseDrop === 'function') checkSurpriseDrop(); 
            if (typeof checkMilestones === 'function') checkMilestones(); 
            clearInterval(checkWalletInterval); 
        } 
    }, 1000);
    setTimeout(function() { clearInterval(checkWalletInterval); }, 30000);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) { 
        var tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; 
        switch(e.key.toLowerCase()) { 
            case '1': var el = document.querySelector('[data-tab="praedictions"]'); if (el) el.click(); break; 
            case '2': var el = document.querySelector('[data-tab="profile"]'); if (el) el.click(); break; 
            case '3': var el = document.querySelector('[data-tab="leaderboard"]'); if (el) el.click(); break; 
            case '4': var el = document.querySelector('[data-tab="support"]'); if (el) el.click(); break; 
            case 'b': if (typeof toggleBlindVoting === 'function') toggleBlindVoting(); break; 
            case 't': toggleTheme(); break; 
        } 
    });
    
    // Mobile FAB
    var fab = document.getElementById('createFab');
    var form = document.querySelector('.create-praediction');
    if (window.innerWidth <= 768) {
        if (fab) fab.style.display = 'flex';
    } else {
        if (fab) fab.style.display = 'none';
        if (form) form.classList.add('expanded');
    }
    
    window.addEventListener('resize', function() {
        var fab = document.getElementById('createFab');
        var form = document.querySelector('.create-praediction');
        if (window.innerWidth <= 768) {
            if (fab) fab.style.display = 'flex';
        } else {
            if (fab) fab.style.display = 'none';
            if (form) form.classList.add('expanded');
        }
    });
    
    // PWA install
    var deferredPrompt;
    window.addEventListener('beforeinstallprompt', function(e) { 
        e.preventDefault(); 
        deferredPrompt = e; 
        setTimeout(function() { 
            if (deferredPrompt && !localStorage.getItem('pwa_installed')) { 
                var t = document.createElement('div'); 
                t.className = 'toast toast-info'; 
                t.style.cssText = 'bottom:80px;cursor:pointer;'; 
                t.textContent = '📱 Install app?'; 
                t.addEventListener('click', async function() { 
                    if (deferredPrompt) { 
                        await deferredPrompt.prompt(); 
                        var r = await deferredPrompt.userChoice; 
                        if (r.outcome === 'accepted') localStorage.setItem('pwa_installed', 'true'); 
                        deferredPrompt = null; 
                    } 
                    t.remove(); 
                }); 
                document.body.appendChild(t); 
                setTimeout(function() { t.remove(); }, 15000); 
            } 
        }, 30000); 
    });
    
    window.addEventListener('appinstalled', function() { 
        localStorage.setItem('pwa_installed', 'true'); 
    });
    
    window.addEventListener('beforeunload', function() { 
        if (analyticsData.bets > 0 || analyticsData.creations > 0) {
            try { localStorage.setItem('praedicta_analytics', JSON.stringify(analyticsData)); } catch(e) {} 
        }
        if (typeof stopAllIntervals === 'function') stopAllIntervals(); 
        if (crossTabChannel) crossTabChannel.close(); 
        if (localStorageDirty && typeof saveOrderBooks === 'function') { 
            try { saveOrderBooks(); } catch(e) {} 
        } 
    });
    
    window.addEventListener('error', function(e) { 
        console.error('Error:', (e.error && e.error.message) || e.message); 
    });
    
    window.addEventListener('unhandledrejection', function(e) { 
        console.error('Rejection:', (e.reason && e.reason.message) || e.reason); 
    });
}

init();
