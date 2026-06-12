// ============================================================
// PRAEDICTA – Initialization (init.js)
// ============================================================

// Polyfill for element.closest
if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
        var el = this;
        do {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
    };
}

function initTheme() { 
    var saved = localStorage.getItem('praedicta_theme'); 
    if (saved === 'light') document.body.classList.add('light'); 
    else if (saved === 'dark') document.body.classList.remove('light'); 
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) document.body.classList.add('light'); 
}

function toggleTheme() { 
    document.body.classList.toggle('light'); 
    localStorage.setItem('praedicta_theme', document.body.classList.contains('light') ? 'light' : 'dark'); 
}

function init() {
    initTheme();
    if (typeof loadFilters === 'function') loadFilters();
    if (typeof cleanOldHoroscopeCache === 'function') cleanOldHoroscopeCache();
    if (typeof initEventListeners === 'function') initEventListeners();
    
    // System theme detection
    if (window.matchMedia) {
        var dmq = window.matchMedia('(prefers-color-scheme: dark)');
        if (dmq.addEventListener) {
            dmq.addEventListener('change', function(e) {
                var saved = localStorage.getItem('praedicta_theme');
                if (!saved) {
                    if (e.matches) document.body.classList.remove('light');
                    else document.body.classList.add('light');
                }
            });
        }
    }
    
    // Service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/test/sw.js')
                .then(function(r) { console.log('SW registered'); })
                .catch(function(e) { console.log('SW failed', e); });
        });
    }
    
    // Auto-connect if Phantom is already connected
    if (window.solana && window.solana.isConnected) {
        setTimeout(function() { 
            var btn = document.getElementById('connectBtn');
            if (btn) btn.click(); 
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
    
    // Supabase real-time subscriptions
    if (typeof supabaseClient !== 'undefined') {
        try {
            supabaseClient.channel('predictions-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, function() {
                    if (typeof loadPredictions === 'function') {
                        loadPredictions().then(function(p) { 
                            currentPredictions = p; 
                            if (typeof renderPraedictions === 'function') renderPraedictions(); 
                        }).catch(function(e) {});
                    }
                }).subscribe();
        } catch(e) {}
    }
    
    if (typeof startConsolidatedInterval === 'function') startConsolidatedInterval();
    if (typeof initMicroInteractions === 'function') initMicroInteractions();
    if (typeof updateLiveCounter === 'function') updateLiveCounter();
    
    // Check wallet for surprise drops and milestones
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
        var tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return; 
        var key = e.key.toLowerCase();
        var el;
        if (key === '1') { el = document.querySelector('[data-tab="praedictions"]'); if (el) el.click(); }
        else if (key === '2') { el = document.querySelector('[data-tab="profile"]'); if (el) el.click(); }
        else if (key === '3') { el = document.querySelector('[data-tab="leaderboard"]'); if (el) el.click(); }
        else if (key === '4') { el = document.querySelector('[data-tab="support"]'); if (el) el.click(); }
        else if (key === 'b') { if (typeof toggleBlindVoting === 'function') toggleBlindVoting(); }
        else if (key === 't') { toggleTheme(); }
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
        var f = document.getElementById('createFab');
        var fm = document.querySelector('.create-praediction');
        if (window.innerWidth <= 768) {
            if (f) f.style.display = 'flex';
        } else {
            if (f) f.style.display = 'none';
            if (fm) fm.classList.add('expanded');
        }
    });
    
    // PWA install prompt
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
                t.addEventListener('click', function() { 
                    if (deferredPrompt) { 
                        deferredPrompt.prompt(); 
                        deferredPrompt.userChoice.then(function(r) { 
                            if (r.outcome === 'accepted') localStorage.setItem('pwa_installed', 'true'); 
                            deferredPrompt = null; 
                        }); 
                    } 
                    t.remove(); 
                }); 
                document.body.appendChild(t); 
                setTimeout(function() { if (t.parentNode) t.remove(); }, 15000); 
            } 
        }, 30000); 
    });
    
    window.addEventListener('appinstalled', function() { 
        localStorage.setItem('pwa_installed', 'true'); 
    });
    
    window.addEventListener('beforeunload', function() { 
        if (typeof analyticsData !== 'undefined' && (analyticsData.bets > 0 || analyticsData.creations > 0)) {
            try { localStorage.setItem('praedicta_analytics', JSON.stringify(analyticsData)); } catch(e) {} 
        }
        if (typeof stopAllIntervals === 'function') stopAllIntervals(); 
        if (typeof crossTabChannel !== 'undefined' && crossTabChannel) crossTabChannel.close(); 
    });
    
    // Global error handlers
    window.addEventListener('error', function(e) { 
        var msg = e.message || (e.error && e.error.message) || 'Unknown error';
        console.log('Error:', msg); 
    });
}

// Start the app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
