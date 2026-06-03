// ============================================================
// PRAEDICTA – Initialization (init.js)
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
    setInterval(updateCountdowns, 60000);

    // Auto-reconnect when tab regains focus
    window.addEventListener('focus', () => {
        if (!walletAddress && window.solana?.isConnected) {
            showToast("Wallet found! Reconnecting...");
            setTimeout(() => DOM.connectBtn?.click(), 500);
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (document.activeElement?.tagName === 'INPUT' ||
            document.activeElement?.tagName === 'TEXTAREA' ||
            document.activeElement?.tagName === 'SELECT') return;
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

    // PWA Install prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        setTimeout(() => {
            if (deferredPrompt && !localStorage.getItem('pwa_installed')) {
                const installToast = document.createElement('div');
                installToast.className = 'toast';
                installToast.style.cssText = 'bottom:80px; cursor:pointer; background:var(--accent); color:var(--bg);';
                installToast.textContent = '📱 Install this app? Tap here!';
                installToast.addEventListener('click', async () => {
                    if (deferredPrompt) {
                        await deferredPrompt.prompt();
                        const result = await deferredPrompt.userChoice;
                        if (result.outcome === 'accepted') localStorage.setItem('pwa_installed', 'true');
                        deferredPrompt = null;
                    }
                    installToast.remove();
                });
                document.body.appendChild(installToast);
                setTimeout(() => installToast.remove(), 15000);
            }
        }, 30000);
    });

    window.addEventListener('appinstalled', () => {
        localStorage.setItem('pwa_installed', 'true');
        deferredPrompt = null;
    });
}

init();
