// ============================================================
// PRAEDICTA – Initialization
// ============================================================

function initTheme() { if (localStorage.getItem('praedicta_theme') === 'light') document.body.classList.add('light'); }
function toggleTheme() { document.body.classList.toggle('light'); localStorage.setItem('praedicta_theme', document.body.classList.contains('light') ? 'light' : 'dark'); }

function init() {
    initTheme();
    initEventListeners();
    if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/test/sw.js').then(reg => console.log('SW registered:', reg.scope)).catch(err => console.error('SW failed:', err)); }); }
    if (window.solana?.isConnected) setTimeout(() => DOM.connectBtn?.click(), 100);
    setInterval(updateCountdowns, 60000);
}

init();
