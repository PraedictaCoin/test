// ============================================================
// PRAEDICTA – Utility Functions (utils.js) - COMPLETE FINAL
// ============================================================

let cachedDayKey = ''; let cachedDayKeyDate = 0;
function getUTCDayKey() { const now = Date.now(); if (now - cachedDayKeyDate < 60000) return cachedDayKey; cachedDayKeyDate = now; cachedDayKey = new Date().toISOString().slice(0, 10); return cachedDayKey; }

function escapeHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function sanitize(str, maxLen = CONFIG.MAX_DESC_LENGTH) { if (!str) return ''; return str.trim().slice(0, maxLen).replace(/[<>]/g, ''); }
function isValidReaction(emoji) { return CONFIG.ALLOWED_EMOJIS.includes(emoji); }

let toastCount = 0;
function showToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    t.style.bottom = `${20 + toastCount * 60}px`;
    document.body.appendChild(t);
    toastCount++;
    setTimeout(() => { t.remove(); toastCount = Math.max(0, toastCount - 1); }, 4000);
}

function setLoading(btn, on) { if (!btn) return; const loader = btn.querySelector('.loader'); const txt = btn.querySelector('span:first-child'); if (loader) loader.style.display = on ? 'inline-block' : 'none'; if (txt) txt.style.display = on ? 'none' : 'inline'; }

function formatDateWithoutSeconds(iso) { if (!iso) return 'No deadline'; const d = new Date(iso); return d.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' }); }

const randomCompliment = () => COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];

function getProphetTitle(seerscore) { for (const tier of PROPHET_TITLES) { if (seerscore >= tier.min) return tier; } return PROPHET_TITLES[PROPHET_TITLES.length - 1]; }

function getControversyLabel(yesPrice) { const diff = Math.abs(yesPrice - 0.5); if (diff < 0.03) return { text: '⚡ SPLIT OPINION', class: 'badge-controversy' }; if (diff < 0.10) return { text: '🔥 Heated Debate', class: 'badge-flash' }; if (diff < 0.20) return { text: '🤔 Leaning', class: 'badge-challenge' }; if (diff > 0.40) return { text: '📊 Near Consensus', class: 'badge-active' }; return null; }

function getTimeBadge(resolutionDate) { if (!resolutionDate) return null; const remaining = new Date(resolutionDate) - Date.now(); if (remaining < 0) return null; if (remaining < 30 * 60 * 1000) return { text: '⏰ 30min left!', class: 'badge-flash' }; if (remaining < 60 * 60 * 1000) return { text: '⏰ Closing soon', class: 'badge-challenge' }; if (remaining < 3 * 60 * 60 * 1000) return { text: '⌛ Today', class: 'badge-mystery' }; return null; }

function getHottestCategory() { const cats = {}; currentPredictions.filter(p => p.status === 'active').forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; }); const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]); if (sorted.length === 0) return { name: 'None', count: 0, icon: '📭' }; const [cat, count] = sorted[0]; return { name: cat === 'crypto' ? 'Finance' : cat, count, icon: CATEGORY_ICONS[cat] || '📁' }; }

function saveBalance() { if (walletAddress) { try { localStorage.setItem(`prae_balance_${walletAddress}`, userPRAEBalance.toString()); } catch (e) {} } }
function loadBalance() { if (!walletAddress) return; try { const stored = localStorage.getItem(`prae_balance_${walletAddress}`); if (stored) { const parsed = parseFloat(stored); if (!isNaN(parsed) && parsed >= 0) { userPRAEBalance = parsed; return; } } } catch (e) {} userPRAEBalance = CONFIG.DEFAULT_BALANCE; }

function getLunarPhase() { const d = new Date(); let year = d.getFullYear(), month = d.getMonth() + 1, day = d.getDate(); if (month < 3) { year--; month += 12; } const a = Math.floor(year / 100); const b = 2 - a + Math.floor(a / 4); const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5; let c = (jd - 2451550.1) / 29.530588853; c = c - Math.floor(c); if (c < 0) c += 1; const phase = Math.round(c * 8) % 8; const phases = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']; const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent']; return { emoji: phases[phase], name: names[phase] }; }

function rotateVoice() { const idx = Math.floor(Math.random() * ORACLE_VOICES.length); const message = '🦉 ' + ORACLE_VOICES[idx]; if (DOM.voiceMessage) DOM.voiceMessage.textContent = message; if (DOM.profileHoroscope) DOM.profileHoroscope.textContent = message; }
rotateVoice();

function getWeeklyMessage() { const weekNumber = Math.floor((Date.now() - new Date(2024, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)); return WEEKLY_MESSAGES[weekNumber % WEEKLY_MESSAGES.length]; }
if (DOM.weeklyOracleMessage) DOM.weeklyOracleMessage.textContent = getWeeklyMessage();

function updateHypeMessage() { if (!DOM.hypeMessage) return; DOM.hypeMessage.textContent = HYPE_MESSAGES[Math.floor(Math.random() * HYPE_MESSAGES.length)]; }

function applyBlindVoting(container = document) { container.querySelectorAll('.vote-stats').forEach(el => { if (blindVotingEnabled) { el.style.filter = 'blur(8px)'; el.style.transition = 'filter 0.3s ease'; el.style.userSelect = 'none'; } else { el.style.filter = 'none'; el.style.userSelect = ''; } }); }
function toggleBlindVoting() { blindVotingEnabled = !blindVotingEnabled; applyBlindVoting(); if (DOM.resolvedContainer) applyBlindVoting(DOM.resolvedContainer); if (DOM.expiredContainer) applyBlindVoting(DOM.expiredContainer); if (DOM.revealVotesBtn) { DOM.revealVotesBtn.textContent = blindVotingEnabled ? '👁️ Show Votes' : '👁️ Hide Votes'; DOM.revealVotesBtn.classList.toggle('active-filter', blindVotingEnabled); } showToast(blindVotingEnabled ? '🙈 Votes hidden – click to reveal' : '👁️ Votes visible', 'info'); }

function updateCountdowns() { document.querySelectorAll('[id^="countdown-"]').forEach(el => { const id = el.id.replace('countdown-', ''); const prediction = currentPredictions.find(p => p.id === id); if (!prediction?.resolution_date) return; const remaining = new Date(prediction.resolution_date) - Date.now(); if (remaining <= 0) { el.textContent = '⏰ Deadline passed'; return; } const days = Math.floor(remaining / 86400000); const hours = Math.floor((remaining % 86400000) / 3600000); const mins = Math.floor((remaining % 3600000) / 60000); el.textContent = `⏰ ${days > 0 ? days + 'd ' : ''}${hours}h ${mins}m remaining`; }); }

async function fetchHoroscopeForZodiac(sign) { if (!sign || !signToNumber[sign]) return null; const today = getUTCDayKey(); const cacheKey = `horoscope_${sign}_${today}`; if (sessionHoroscopeCache[cacheKey]) return sessionHoroscopeCache[cacheKey]; try { const cached = JSON.parse(localStorage.getItem(cacheKey)); if (cached) { sessionHoroscopeCache[cacheKey] = cached; return cached; } } catch (e) {} const { data, error } = await supabaseClient.from('daily_horoscopes').select('horoscope, lucky_number, mood').eq('sign', sign).eq('date', today).maybeSingle(); const result = (error || !data) ? { description: "The stars are quiet today.", luckyNumber: 7, mood: "reflective" } : { description: data.horoscope, luckyNumber: parseInt(data.lucky_number) || 7, mood: data.mood || "inspired" }; try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch (e) {} sessionHoroscopeCache[cacheKey] = result; return result; }

function isValidSourceUrl(url) { if (!url) return false; if (!url.startsWith('http://') && !url.startsWith('https://')) return false; try { const parsed = new URL(url); const hostname = parsed.hostname.toLowerCase(); if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return false; if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') return false; if (parsed.protocol === 'data:' || parsed.protocol === 'javascript:' || parsed.protocol === 'vbscript:') return false; const validTlds = ['.com', '.org', '.net', '.io', '.gov', '.edu', '.news', '.co', '.app', '.page', '.blog', '.finance', '.markets']; if (!validTlds.some(tld => hostname.endsWith(tld))) return false; const suspicious = ['<script', 'javascript:', 'onerror=', 'onload=', 'data:', '%3C', '%3E', '&#x']; if (suspicious.some(p => url.toLowerCase().includes(p))) return false; if (url.length > 500) return false; return true; } catch { return false; } }

function saveFilters() { try { localStorage.setItem('praedicta_filters', JSON.stringify(currentFilter)); } catch (e) {} }
function loadFilters() { try { const stored = localStorage.getItem('praedicta_filters'); if (stored) { const parsed = JSON.parse(stored); if (parsed.category) currentFilter.category = parsed.category; if (parsed.status) currentFilter.status = parsed.status; if (parsed.search) currentFilter.search = parsed.search; if (parsed.sort) currentFilter.sort = parsed.sort; if (parsed.tags) currentFilter.tags = parsed.tags; } } catch (e) {} }

async function fetchWithRetry(fn, maxRetries = 3) { for (let i = 0; i < maxRetries; i++) { try { return await fn(); } catch (err) { if (i === maxRetries - 1) throw err; await new Promise(r => setTimeout(r, 1000 * (i + 1))); } } }

function showNotification(message) { if (!DOM.notificationBadge || !DOM.notificationText) return; DOM.notificationBadge.style.display = 'block'; DOM.notificationText.textContent = '🔔 ' + message; setTimeout(() => { if (DOM.notificationBadge) DOM.notificationBadge.style.display = 'none'; }, 10000); }

let _lastVolume = 0;
function getVolumeTrend(volume) { if (_lastVolume === 0) { _lastVolume = volume; return ''; } const trend = volume > _lastVolume ? ' 📈' : volume < _lastVolume ? ' 📉' : ''; _lastVolume = volume; return trend; }

window.addEventListener('online', () => { if (DOM.offlineBanner) DOM.offlineBanner.style.display = 'none'; refreshAll(); });
window.addEventListener('offline', () => { if (DOM.offlineBanner) DOM.offlineBanner.style.display = 'block'; });

function cleanOldHoroscopeCache() { const today = getUTCDayKey(); try { const keys = Object.keys(localStorage); keys.forEach(key => { if (key.startsWith('horoscope_') && !key.includes(today)) localStorage.removeItem(key); }); } catch (e) {} }

function isValidPrediction(title) {
    if (!title || title.length < 10) return { valid: false, reason: "Title too short. Be more specific." };
    if (title.length > 200) return { valid: false, reason: "Title too long." };
    const hasVerb = /\b(will|going|shall|must|can|could|would|should|reach|hit|pass|break|win|lose|beat|rise|fall|drop|gain|increase|decrease|announce|launch|release|publish|elect|appoint|resign|born|marry|divorce|merge|acquire|bankrupt|default|cut|raise|hold|keep|cross|exceed|below|above|over|under)\b/i.test(title);
    if (!hasVerb) return { valid: false, reason: "Must contain a future event (will, reach, win, etc)." };
    const words = title.split(/\s+/);
    if (words.length < 4) return { valid: false, reason: "Too short. Include subject, event, and timeframe." };
    if (title === title.toUpperCase() && title.length > 30) return { valid: false, reason: "Please don't use ALL CAPS." };
    if (/(.)\1{4,}/.test(title)) return { valid: false, reason: "Please remove repeated characters." };
    const lettersOnly = title.replace(/[^a-zA-Z]/g, '');
    if (lettersOnly.length < 5) return { valid: false, reason: "Must contain actual words." };
    const hasTimeframe = /\b(today|tomorrow|this week|this month|this year|next|by|before|after|in \d{4}|on \w+day|january|february|march|april|may|june|july|august|september|october|november|december|q[1-4]|20\d{2})\b/i.test(title);
    if (!hasTimeframe) return { valid: false, reason: "Include a timeframe (by July, this week, in 2026, etc)." };
    return { valid: true };
}

function isBlockedTopic(title, description) {
    const blockedWords = ["assassination", "murder", "kill", "terrorist", "bombing", "massacre", "shooting", "genocide", "torture", "execution", "suicide", "porn", "xxx", "nsfw", "onlyfans", "sex tape", "nude", "racist", "nazi", "holocaust", "hate crime", "drug", "cocaine", "heroin", "meth", "fentanyl", "pump and dump", "ponzi", "pyramid scheme"];
    const combined = (title + " " + description).toLowerCase();
    for (const word of blockedWords) { if (combined.includes(word)) return { blocked: true, reason: `Topic not allowed: "${word}"` }; }
    return { blocked: false };
}

function isValidDisplayName(name) {
    if (!name) return { valid: true };
    if (name.length < 2) return { valid: false, reason: "Name too short (min 2 characters)" };
    if (name.length > 20) return { valid: false, reason: "Name too long (max 20 characters)" };
    const blockedPatterns = [/admin/i, /oracle/i, /praedicta/i, /mod/i, /support/i, /staff/i, /official/i, /system/i, /null/i, /undefined/i];
    for (const pattern of blockedPatterns) { if (pattern.test(name.trim())) return { valid: false, reason: "This name is not allowed" }; }
    const validPattern = /^[\p{L}\p{N}\s\p{Emoji_Presentation}\p{Emoji}._-]+$/u;
    if (!validPattern.test(name)) return { valid: false, reason: "Name contains invalid characters" };
    return { valid: true };
}

function detectAutoSource(title) {
    const t = title.toLowerCase();
    if (t.includes('btc') || t.includes('bitcoin')) return { source: 'redstone_btc', label: 'Bitcoin Price' };
    if (t.includes('eth') || t.includes('ethereum')) return { source: 'redstone_eth', label: 'Ethereum Price' };
    if (t.includes('sol') && !t.includes('solid') && !t.includes('solar')) return { source: 'redstone_sol', label: 'Solana Price' };
    if (t.includes('doge')) return { source: 'redstone_doge', label: 'Dogecoin Price' };
    if (t.includes('tesla') || t.includes('tsla')) return { source: 'redstone_tsla', label: 'Tesla Stock' };
    if (t.includes('apple') || t.includes('aapl')) return { source: 'redstone_aapl', label: 'Apple Stock' };
    if (t.includes('nvidia') || t.includes('nvda')) return { source: 'redstone_nvda', label: 'Nvidia Stock' };
    if (t.includes('gold')) return { source: 'redstone_gold', label: 'Gold Price' };
    const weatherMatch = t.match(/(temp|temperature|rain|weather|wind|snow|°c|°f)\s*(in|at|for)?\s*([a-zäöüß\s]+)/i);
    if (weatherMatch) { const city = weatherMatch[3].trim(); const metric = t.includes('rain') ? 'rain' : t.includes('wind') ? 'wind' : t.includes('snow') ? 'snow' : 'temp'; return { source: `weather_${metric}:${city}`, label: `${city} Weather`, detail: city }; }
    if (t.match(/(win|won|lose|lost|beat|defeat|champion|final|match|game)\s/i)) return { source: 'sports_', label: 'Sports Result', needsDetail: true };
    if (t.match(/(movie|film|box office|oscar)/i)) return { source: 'movie_', label: 'Box Office', needsDetail: true };
    if (t.match(/(forex|exchange rate|usd|eur)/i)) return { source: 'forex_', label: 'Forex Rate', needsDetail: true };
    if (t.match(/(earthquake|quake|magnitude)/i)) return { source: 'quake_', label: 'Earthquake', needsDetail: true };
    if (t.match(/(spacex|launch|rocket)/i)) return { source: 'spacex_', label: 'SpaceX', needsDetail: true };
    return null;
}

function confirmBet(amount, outcome, payout) { return confirm(`Bet ${amount} PRAE on ${outcome.toUpperCase()}?\n\nPotential payout: ~${payout} shares\n\nThis action cannot be undone.`); }

function trackReferral() { const params = new URLSearchParams(window.location.search); const ref = params.get('ref'); if (ref && ref !== walletAddress && walletAddress) { try { supabaseClient.from('users').update({ referred_by: ref }).eq('address', walletAddress); } catch (e) {} } }

function showSkeleton() { if (DOM.skeletonContainer) DOM.skeletonContainer.style.display = 'grid'; if (DOM.praedictionsContainer) DOM.praedictionsContainer.style.display = 'none'; }
function hideSkeleton() { if (DOM.skeletonContainer) DOM.skeletonContainer.style.display = 'none'; if (DOM.praedictionsContainer) DOM.praedictionsContainer.style.display = 'grid'; }

function timeAgo(iso) {
    if (!iso) return '';
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return formatDateWithoutSeconds(iso);
}

let originalTitle = document.title;
function flashTitle(text) { document.title = text; setTimeout(() => { document.title = originalTitle; }, 3000); }

function loadNotificationPrefs() {
    try {
        const prefs = JSON.parse(localStorage.getItem('praedicta_notif_prefs') || '{}');
        if (DOM.notifResolved) DOM.notifResolved.checked = prefs.resolved !== false;
        if (DOM.notifWon) DOM.notifWon.checked = prefs.won !== false;
        if (DOM.notifStreak) DOM.notifStreak.checked = prefs.streak !== false;
        if (DOM.notifLeaderboard) DOM.notifLeaderboard.checked = prefs.leaderboard !== false;
        if (DOM.notifSound) DOM.notifSound.checked = prefs.sound !== false;
        if (DOM.notifTwoFactor) DOM.notifTwoFactor.checked = prefs.twoFactor === true;
    } catch (e) { console.debug('Load notif prefs failed:', e); }
}

function saveNotificationPrefs() {
    try {
        const prefs = {
            resolved: DOM.notifResolved?.checked ?? true, won: DOM.notifWon?.checked ?? true,
            streak: DOM.notifStreak?.checked ?? true, leaderboard: DOM.notifLeaderboard?.checked ?? true,
            sound: DOM.notifSound?.checked ?? true, twoFactor: DOM.notifTwoFactor?.checked ?? false
        };
        localStorage.setItem('praedicta_notif_prefs', JSON.stringify(prefs));
    } catch (e) { console.debug('Save notif prefs failed:', e); }
}

function shouldNotify(type) { try { const prefs = JSON.parse(localStorage.getItem('praedicta_notif_prefs') || '{}'); return prefs[type] !== false; } catch (e) { return true; } }

function exportAnalytics() {
    if (!walletAddress) return showToast("Connect wallet first", 'error');
    const allBets = currentPredictions.flatMap(p => (p.bets || []).filter(b => b.user === walletAddress));
    const myPredictions = currentPredictions.filter(p => p.creator === walletAddress);
    const resolvedBets = currentPredictions.filter(p => p.status === 'resolved' && (p.bets || []).some(b => b.user === walletAddress));
    const wonBets = resolvedBets.filter(p => { const b = p.bets.find(b => b.user === walletAddress); return b && b.outcome === p.resolved_outcome; });
    const analytics = { exportDate: new Date().toISOString(), wallet: walletAddress, summary: { totalBets: allBets.length, totalCreated: myPredictions.length, totalResolved: resolvedBets.length, totalWon: wonBets.length, accuracy: resolvedBets.length > 0 ? ((wonBets.length / resolvedBets.length) * 100).toFixed(1) + '%' : 'N/A', praeBalance: userPRAEBalance.toFixed(2), totalWagered: allBets.reduce((s, b) => s + (b.amount || 0), 0).toFixed(2) }, betHistory: allBets.map(b => ({ outcome: b.outcome, amount: b.amount })), createdPredictions: myPredictions.map(p => ({ id: p.id, title: p.title, category: p.category, status: p.status, created: p.created_at })) };
    const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `praedicta-analytics-${walletAddress.slice(0, 8)}-${getUTCDayKey()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast("📊 Analytics exported!", 'success');
}

function renderAdvancedChart(market, id) {
    const history = market.priceHistory; if (!history || history.length < 4) return '';
    const candles = []; const periodSize = Math.max(1, Math.floor(history.length / 20));
    for (let i = 0; i < history.length; i += periodSize) { const slice = history.slice(i, Math.min(i + periodSize, history.length)); if (slice.length === 0) continue; candles.push({ open: slice[0].price, close: slice[slice.length - 1].price, high: Math.max(...slice.map(h => h.price)), low: Math.min(...slice.map(h => h.price)), time: slice[0].time }); }
    if (candles.length < 2) return '';
    const width = Math.min(candles.length * 14, 300), height = 60, padding = 4, chartWidth = width - padding * 2, chartHeight = height - padding * 2;
    const allPrices = candles.flatMap(c => [c.high, c.low]), max = Math.max(...allPrices), min = Math.min(...allPrices), range = max - min || 0.01;
    const candleWidth = Math.max(2, (chartWidth / candles.length) * 0.7), spacing = chartWidth / candles.length;
    let svg = `<svg width="${width}" height="${height}" style="display:block;">`;
    candles.forEach((c, i) => { const x = padding + i * spacing + spacing / 2; const yHigh = padding + ((max - c.high) / range) * chartHeight, yLow = padding + ((max - c.low) / range) * chartHeight; const yOpen = padding + ((max - c.open) / range) * chartHeight, yClose = padding + ((max - c.close) / range) * chartHeight; const isBullish = c.close >= c.open, color = isBullish ? 'var(--success-color)' : 'var(--error-color)'; const bodyTop = Math.min(yOpen, yClose), bodyHeight = Math.max(1, Math.abs(yClose - yOpen)); svg += `<line x1="${x}" y1="${yHigh}" x2="${x}" y2="${yLow}" stroke="${color}" stroke-width="1"/>`; svg += `<rect x="${x - candleWidth/2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" fill="${color}" rx="0.5"/>`; });
    svg += `<text x="0" y="8" fill="var(--text-muted)" font-size="6">${max.toFixed(4)}</text><text x="0" y="${height-2}" fill="var(--text-muted)" font-size="6">${min.toFixed(4)}</text></svg>`;
    const firstPrice = candles[0].close, lastPrice = candles[candles.length - 1].close, change = lastPrice - firstPrice, changePercent = ((change / firstPrice) * 100);
    return `<div style="margin-top:8px; padding:8px; background:var(--card-bg); border-radius:8px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;"><span style="font-size:.7rem; color:var(--text-muted);">Price Chart</span><span style="font-size:.7rem; color:${change >= 0 ? 'var(--success-color)' : 'var(--error-color)'};">${change >= 0 ? '📈' : '📉'} ${change >= 0 ? '+' : ''}${change.toFixed(4)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)</span></div>${svg}<div style="display:flex; justify-content:space-between; font-size:.55rem; color:var(--text-muted); margin-top:2px;"><span>O:${candles[0].open.toFixed(4)}</span><span>H:${max.toFixed(4)}</span><span>L:${min.toFixed(4)}</span><span>C:${lastPrice.toFixed(4)}</span></div></div>`;
}

const TOURNAMENTS = { weekly: { cost: 10, label: 'Weekly Cup', pool: 500, icon: '📅' }, monthly: { cost: 25, label: 'Monthly Championship', pool: 2000, icon: '🏆' }, special: { cost: 0, label: 'Special Event', pool: 'varies', icon: '🎪' } };
const SPONSOR_TIERS = { bronze: { cost: 500, label: 'Bronze', icon: '🥉' }, silver: { cost: 2000, label: 'Silver', icon: '🥈' }, gold: { cost: 10000, label: 'Gold', icon: '🥇' } };

async function joinTournament(type) {
    if (!walletAddress) return showToast("Connect wallet first", 'error');
    const tournament = TOURNAMENTS[type]; if (!tournament) return;
    if (userPRAEBalance < tournament.cost) return showToast(`Need ${tournament.cost} PRAE to join. You have ${userPRAEBalance.toFixed(0)}`, 'error');
    if (!confirm(`Join ${tournament.label}?\n\nEntry: ${tournament.cost} PRAE\nPrize Pool: ${tournament.pool} PRAE`)) return;
    try { const result = await callSecureRpc('join_tournament', { tournamentType: type, wallet: walletAddress }); if (result.success) { userPRAEBalance -= tournament.cost; saveBalance(); showToast(`🏆 Joined ${tournament.label}!`, 'success'); } } catch (err) { showToast("Tournaments coming soon! 🏆", 'info'); }
}

async function becomeSponsor(tier) {
    if (!walletAddress) return showToast("Connect wallet first", 'error');
    const sponsor = SPONSOR_TIERS[tier]; if (!sponsor) return;
    if (userPRAEBalance < sponsor.cost) return showToast(`Need ${sponsor.cost} PRAE. You have ${userPRAEBalance.toFixed(0)}`, 'error');
    if (!confirm(`Become a ${sponsor.label} Sponsor for ${sponsor.cost} PRAE?`)) return;
    try { const result = await callSecureRpc('become_sponsor', { tier: tier, wallet: walletAddress }); if (result.success) { userPRAEBalance -= sponsor.cost; saveBalance(); showToast(`🤝 Thank you for sponsoring!`, 'success'); } } catch (err) { showToast("Sponsorships coming soon! 🤝", 'info'); }
}

async function handleAvatarUpload(event) {
    const file = event.target.files?.[0]; if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)) return showToast("Please upload PNG, JPEG, GIF, or WebP", 'error');
    if (file.size > 5 * 1024 * 1024) return showToast("Image must be under 5MB", 'error');
    const reader = new FileReader(); reader.onload = (e) => { if (DOM.avatarPreview) DOM.avatarPreview.style.display = 'block'; if (DOM.avatarPreviewImg) DOM.avatarPreviewImg.src = e.target.result; }; reader.readAsDataURL(file);
    try {
        const compressed = await compressImage(file, 200, 200); const fileName = `avatars/${walletAddress}_${Date.now()}.${file.type.split('/')[1]}`;
        const { error } = await supabaseClient.storage.from('avatars').upload(fileName, compressed, { cacheControl: '3600', upsert: true, contentType: file.type });
        if (error) throw error;
        const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(fileName);
        await callSecureRpc('update_profile', { display_name: null, avatar: urlData.publicUrl, avatar_type: 'image' });
        showToast("📷 Avatar updated!", 'success'); await refreshAll();
    } catch (err) { try { const base64 = await fileToBase64(file); await callSecureRpc('update_profile', { avatar: base64, avatar_type: 'base64' }); showToast("📷 Avatar saved locally!", 'success'); await refreshAll(); } catch (e) { showToast("Upload failed", 'error'); } }
}

function compressImage(file, maxWidth, maxHeight) { return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); let { width, height } = img; if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; } if (height > maxHeight) { width = (maxHeight / height) * width; height = maxHeight; } canvas.width = width; canvas.height = height; canvas.getContext('2d').drawImage(img, 0, 0, width, height); canvas.toBlob((blob) => { if (blob) resolve(blob); else reject(new Error('Compression failed')); }, 'image/jpeg', 0.8); }; img.onerror = reject; img.src = URL.createObjectURL(file); }); }
function fileToBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }

let twoFactorVerified = false; let twoFactorExpiresAt = null; const TWO_FACTOR_DURATION = 30 * 60 * 1000;
function is2FAEnabled() { try { return JSON.parse(localStorage.getItem('praedicta_notif_prefs') || '{}').twoFactor === true; } catch (e) { return false; } }
function is2FAVerified() { return twoFactorVerified && twoFactorExpiresAt && Date.now() < twoFactorExpiresAt; }
async function require2FA(actionName) { if (!is2FAEnabled()) return true; if (is2FAVerified()) return true; const code = prompt(`🔐 2FA Required: ${actionName}\n\nEnter the 6-digit code sent to your email:`); if (!code || code.length !== 6) { showToast("2FA required", 'error'); return false; } try { await callSecureRpc('verify_email_code', { token: code, wallet: walletAddress }); twoFactorVerified = true; twoFactorExpiresAt = Date.now() + TWO_FACTOR_DURATION; showToast("✅ 2FA verified for 30 minutes", 'success'); return true; } catch (e) { showToast("Invalid 2FA code", 'error'); return false; } }
async function send2FACode() { try { const user = await loadUser(walletAddress); if (!user?.email) return showToast("No email on file", 'error'); await callSecureRpc('send_verification_email', { email: user.email, wallet: walletAddress }); showToast("📧 2FA code sent!", 'success'); } catch (e) { showToast("Failed to send code", 'error'); } }

// ============================================================
// Guided Onboarding Tour
// ============================================================

function startGuidedTour() {
    if (localStorage.getItem('tour_completed')) return;
    const steps = [
        { selector: '#praedictionsContainer', title: '🌌 Praedictions', text: 'Browse predictions about future events. Tap cards to expand for details.', position: 'bottom' },
        { selector: '.create-praediction', title: '✨ Create', text: 'Stake 7 PRAE and predict the future. 46+ APIs auto-resolve outcomes.', position: 'top' },
        { selector: '#tab-leaderboard', title: '🏆 Compete', text: 'Climb the leaderboard. Earn Prophet titles from 🌱 Novice to 🦉 Oracle.', position: 'bottom' },
        { selector: '#flipCoinBtn', title: '🪙 Daily Bonus', text: 'Flip the coin daily for free PRAE. Build your streak!', position: 'top' }
    ];
    let currentStep = 0, overlay, tooltip;
    function showStep(index) { if (index >= steps.length) { endTour(); return; } const step = steps[index], element = document.querySelector(step.selector); if (!element) { showStep(index + 1); return; } if (tooltip) tooltip.remove(); if (overlay) overlay.remove(); overlay = document.createElement('div'); overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9998;'; overlay.addEventListener('click', () => showStep(index + 1)); document.body.appendChild(overlay); element.style.position = 'relative'; element.style.zIndex = '9999'; element.style.boxShadow = '0 0 30px var(--accent)'; element.scrollIntoView({ behavior: 'smooth', block: 'center' }); const rect = element.getBoundingClientRect(); tooltip = document.createElement('div'); tooltip.style.cssText = 'position:fixed;z-index:10000;background:var(--bg);border:2px solid var(--accent);border-radius:16px;padding:20px;max-width:320px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);'; let left = rect.left + rect.width/2 - 160, top = step.position === 'top' ? rect.top - 180 : rect.bottom + 20; if (left < 20) left = 20; if (left > window.innerWidth - 340) left = window.innerWidth - 340; if (top < 20) top = 20; if (top > window.innerHeight - 200) top = window.innerHeight - 200; tooltip.style.left = left + 'px'; tooltip.style.top = top + 'px'; tooltip.innerHTML = `<div style="font-size:1.5rem;margin-bottom:8px;">${step.title}</div><p style="color:var(--text-muted);margin-bottom:16px;">${step.text}</p><div style="display:flex;gap:8px;justify-content:center;"><span style="font-size:.7rem;color:var(--text-muted);">${index + 1}/${steps.length}</span><button onclick="this.closest('div').remove();const o=document.querySelector('[style*=\\'z-index:9998\\']');if(o)o.remove();const e=document.querySelector('[style*=\\'box-shadow:0 0 30px\\']');if(e){e.style.removeProperty('box-shadow');e.style.removeProperty('position');e.style.removeProperty('z-index')};startGuidedTour_step(${index + 1})" style="padding:8px 20px;border-radius:20px;background:var(--accent);color:var(--bg);border:none;cursor:pointer;font-size:.8rem;">${index === steps.length - 1 ? '✨ Finish' : 'Next →'}</button></div>`; document.body.appendChild(tooltip); }
    window.startGuidedTour_step = function(index) { const e = document.querySelector('[style*="box-shadow: 0 0 30px"]'); if (e) { e.style.removeProperty('box-shadow'); e.style.removeProperty('position'); e.style.removeProperty('z-index'); } showStep(index); };
    function endTour() { if (overlay) overlay.remove(); if (tooltip) tooltip.remove(); const e = document.querySelector('[style*="box-shadow: 0 0 30px"]'); if (e) { e.style.removeProperty('box-shadow'); e.style.removeProperty('position'); e.style.removeProperty('z-index'); } localStorage.setItem('tour_completed', 'true'); showToast('🎉 You\'re ready! Start predicting!', 'success'); }
    showStep(0);
}

// ============================================================
// Live Activity Counter
// ============================================================

function updateLiveCounter() { const activeCount = currentPredictions.filter(p => p.status === 'active').length; const betCount = currentPredictions.reduce((s, p) => s + (p.bets || []).length, 0); onlineUsers = Math.max(new Set(currentPredictions.flatMap(p => (p.bets || []).map(b => b.user))).size, Math.floor(Math.random() * 20) + 5); const counter = document.getElementById('liveCounter'); if (counter) { counter.innerHTML = `🔴 <strong>${onlineUsers}</strong> online · <strong>${activeCount}</strong> active · <strong>${betCount}</strong> bets`; counter.style.display = 'block'; } }
setInterval(updateLiveCounter, 15000);

// ============================================================
// Smart Notifications
// ============================================================

function checkSmartNotifications() { if (!walletAddress) return; const myActive = currentPredictions.filter(p => p.status === 'active' && (p.bets || []).some(b => b.user === walletAddress)); myActive.forEach(p => { if (!p.resolution_date) return; const remaining = new Date(p.resolution_date) - Date.now(); if (remaining > 0 && remaining < 3600000 && !p.endingSoonNotified) { p.endingSoonNotified = true; addNotification(`⏰ "${p.title.slice(0, 40)}..." resolves in ${Math.floor(remaining/60000)} minutes!`, 'alert'); } }); const lastFlip = JSON.parse(localStorage.getItem('prae_last_flip') || '{}'); const today = getUTCDayKey(); if (lastFlip[walletAddress] !== today) { const hoursLeft = 24 - new Date().getHours(); if (hoursLeft <= 4) addNotification(`⚠️ Flip the coin in ${hoursLeft}h or lose your streak!`, 'streak'); } }
setInterval(checkSmartNotifications, 60000);

// ============================================================
// Surprise & Delight
// ============================================================

function checkSurpriseDrop() { if (!walletAddress) return; const today = getUTCDayKey(), lastCheck = localStorage.getItem('prae_last_surprise_check'); if (lastCheck === today) return; if (Math.random() < 0.15) { const drops = [{ amount: 5, message: '🌟 The Oracle smiles upon you! +5 PRAE!' },{ amount: 3, message: '🍀 A lucky wind blows your way! +3 PRAE!' },{ amount: 10, message: '🦉 The Oracle has chosen you! +10 PRAE!' },{ amount: 1, message: '💫 A small token. +1 PRAE!' }]; const drop = drops[Math.floor(Math.random() * drops.length)]; if (drop.amount > 0) { userPRAEBalance += drop.amount; saveBalance(); } spawnConfetti(); const modal = document.createElement('div'); modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:5000;display:flex;align-items:center;justify-content:center;'; modal.innerHTML = `<div style="background:var(--bg);border:2px solid var(--oracle-color);border-radius:24px;padding:32px;max-width:400px;width:90%;text-align:center;"><div style="font-size:4rem;">🎁</div><h2 style="color:var(--oracle-color);">Oracle Blessing!</h2><p style="font-size:1.1rem;color:var(--text);">${drop.message}</p><button onclick="this.closest('div[style*=z-index\\\\:5000]').remove();refreshAll();" style="margin-top:16px;padding:12px 32px;border-radius:20px;background:var(--accent);color:var(--bg);border:none;cursor:pointer;font-weight:600;">🙏 Thank the Oracle</button></div>`; modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); }); document.body.appendChild(modal); } localStorage.setItem('prae_last_surprise_check', today); }

// ============================================================
// Prediction Streak Calendar
// ============================================================

function renderStreakCalendar() { const container = document.getElementById('streakCalendar'); if (!container || !walletAddress) return; const days = []; const now = new Date(); for (let i = 89; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); const dateKey = d.toISOString().slice(0, 10); const dayPredictions = currentPredictions.filter(p => { const bet = (p.bets || []).find(b => b.user === walletAddress); return bet && p.created_at?.slice(0, 10) === dateKey; }); const dayCorrect = dayPredictions.filter(p => { const b = p.bets.find(b => b.user === walletAddress); return b && p.status === 'resolved' && b.outcome === p.resolved_outcome; }); let level = 0; if (dayPredictions.length > 0) { const acc = dayCorrect.length / dayPredictions.length; if (acc >= 0.8) level = 4; else if (acc >= 0.6) level = 3; else if (acc >= 0.4) level = 2; else level = 1; } days.push({ date: dateKey, level, count: dayPredictions.length, correct: dayCorrect.length }); } const colors = ['var(--card-bg)', '#FF4444', '#FF8888', '#10B981', '#7C3AED']; let html = '<div style="margin-top:16px;"><h4 style="color:var(--accent);margin-bottom:8px;">📅 Prediction Streak (90 days)</h4><div style="display:flex;gap:2px;flex-wrap:wrap;">'; days.forEach(d => { html += `<span title="${d.date}: ${d.count} bets, ${d.correct} correct" style="width:12px;height:12px;border-radius:2px;background:${colors[d.level]};cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.5)'" onmouseout="this.style.transform='scale(1)'"></span>`; }); html += '</div><div style="display:flex;gap:8px;font-size:.6rem;color:var(--text-muted);align-items:center;margin-top:4px;"><span>Less</span>'; colors.forEach((c, i) => { if (i > 0) html += `<span style="width:10px;height:10px;border-radius:2px;background:${c};"></span>`; }); html += '<span>More</span></div></div>'; container.innerHTML = html; }

// ============================================================
// Portfolio View
// ============================================================

function calculatePortfolio() { if (!walletAddress) return null; const now = Date.now(); if (portfolioCache && portfolioCacheTime > now - 30000) return portfolioCache; const myBets = currentPredictions.flatMap(p => (p.bets || []).filter(b => b.user === walletAddress).map(b => ({ ...b, predictionId: p.id, title: p.title, status: p.status, category: p.category, resolutionDate: p.resolution_date, resolvedOutcome: p.resolved_outcome }))); const activePositions = myBets.filter(b => b.status === 'active'), resolvedPositions = myBets.filter(b => b.status === 'resolved'); let totalInvested = 0, totalCurrentValue = 0, totalWon = 0, totalLost = 0; activePositions.forEach(b => { totalInvested += b.amount || 0; const market = getMarket(b.predictionId); const price = getYesPrice(market); totalCurrentValue += b.outcome === 'yes' ? (b.amount || 0) * price : (b.amount || 0) * (1 - price); }); resolvedPositions.forEach(b => { totalInvested += b.amount || 0; if (b.outcome === b.resolvedOutcome) totalWon += (b.amount || 0) * 2; else totalLost += b.amount || 0; }); const pnl = totalWon - totalLost; const categoryDist = {}; myBets.forEach(b => { categoryDist[b.category] = (categoryDist[b.category] || 0) + (b.amount || 0); }); const dailyAccuracy = {}; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0, 10); const dayBets = resolvedPositions.filter(b => b.resolutionDate?.startsWith(key)); const dayCorrect = dayBets.filter(b => b.outcome === b.resolvedOutcome); dailyAccuracy[key] = dayBets.length > 0 ? Math.round((dayCorrect.length / dayBets.length) * 100) : null; } portfolioCache = { totalInvested, totalCurrentValue, pnl, pnlPercent: totalInvested > 0 ? ((pnl / totalInvested) * 100).toFixed(1) : '0', totalWon, totalLost, activeCount: activePositions.length, resolvedCount: resolvedPositions.length, winRate: resolvedPositions.length > 0 ? Math.round((resolvedPositions.filter(b => b.outcome === b.resolvedOutcome).length / resolvedPositions.length) * 100) : 0, categoryDist, dailyAccuracy, activePositions: activePositions.slice(0, 10), resolvedPositions: resolvedPositions.slice(0, 10) }; portfolioCacheTime = now; return portfolioCache; }

function renderPortfolio() { const container = document.getElementById('portfolioView'); if (!container || !walletAddress) return; const portfolio = calculatePortfolio(); if (!portfolio) { container.innerHTML = '<div class="empty-state"><p>Connect wallet to see portfolio</p></div>'; return; } const pnlColor = portfolio.pnl >= 0 ? 'var(--success-color)' : 'var(--error-color)', pnlIcon = portfolio.pnl >= 0 ? '📈' : '📉'; let html = `<div class="card"><h3 style="color:var(--accent);text-align:center;">💼 Your Portfolio</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0;text-align:center;"><div class="stat"><div class="stat-value">${portfolio.totalInvested.toFixed(0)}</div><div>Invested</div></div><div class="stat"><div class="stat-value" style="color:${pnlColor};">${pnlIcon} ${portfolio.pnl.toFixed(0)}</div><div>P&L (${portfolio.pnlPercent}%)</div></div><div class="stat"><div class="stat-value">${portfolio.winRate}%</div><div>Win Rate</div></div></div><h4 style="color:var(--accent);">📊 Active (${portfolio.activeCount})</h4><div style="max-height:200px;overflow-y:auto;margin-bottom:16px;">`; if (portfolio.activePositions.length === 0) html += '<div style="color:var(--text-muted);text-align:center;padding:12px;">No active positions</div>'; else portfolio.activePositions.forEach(b => { const market = getMarket(b.predictionId); const price = getYesPrice(market); const cv = b.outcome === 'yes' ? b.amount * price : b.amount * (1 - price); const ch = cv - b.amount; html += `<div style="padding:8px;border-bottom:1px solid var(--border);font-size:.8rem;"><div style="display:flex;justify-content:space-between;"><strong>${escapeHtml((b.title || '').slice(0, 40))}</strong><span style="color:${b.outcome === 'yes' ? 'var(--success-color)' : 'var(--error-color)'};">${b.outcome.toUpperCase()}</span></div><div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--text-muted);"><span>${b.amount} PRAE</span><span style="color:${ch >= 0 ? 'var(--success-color)' : 'var(--error-color)'};">${ch >= 0 ? '+' : ''}${ch.toFixed(1)}</span></div></div>`; }); html += `</div><h4 style="color:var(--accent);">📊 Categories</h4>`; const totalCat = Object.values(portfolio.categoryDist).reduce((s, v) => s + v, 0) || 1; Object.entries(portfolio.categoryDist).slice(0, 5).forEach(([cat, amount]) => { const pct = ((amount / totalCat) * 100).toFixed(0); html += `<div style="margin-bottom:4px;"><div style="display:flex;justify-content:space-between;font-size:.7rem;"><span>${CATEGORY_ICONS[cat] || '📁'} ${cat}</span><span>${amount.toFixed(0)} (${pct}%)</span></div><div style="background:var(--border);border-radius:4px;height:4px;"><div style="background:var(--accent);border-radius:4px;height:100%;width:${pct}%;"></div></div></div>`; }); html += `<h4 style="color:var(--accent);margin-top:12px;">📈 7-Day Accuracy</h4><div style="display:flex;gap:2px;align-items:flex-end;height:40px;">`; Object.entries(portfolio.dailyAccuracy).forEach(([date, acc]) => { const h = acc !== null ? Math.max(4, (acc / 100) * 40) : 2; const c = acc !== null ? (acc >= 60 ? 'var(--success-color)' : acc >= 40 ? 'var(--oracle-color)' : 'var(--error-color)') : 'var(--border)'; html += `<div title="${date}: ${acc !== null ? acc + '%' : 'No data'}" style="flex:1;background:${c};border-radius:2px 2px 0 0;height:${h}px;min-width:8px;"></div>`; }); html += '</div></div>'; container.innerHTML = html; }

// ============================================================
// Weekly Recap
// ============================================================

function generateWeeklyRecap() { if (!walletAddress) return null; const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); const weekPredictions = currentPredictions.filter(p => { const myBet = (p.bets || []).find(b => b.user === walletAddress); return myBet && new Date(p.created_at) > weekAgo; }); const weekResolved = weekPredictions.filter(p => p.status === 'resolved'), weekCorrect = weekResolved.filter(p => { const b = p.bets.find(b => b.user === walletAddress); return b && b.outcome === p.resolved_outcome; }); const weekCreated = currentPredictions.filter(p => p.creator === walletAddress && new Date(p.created_at) > weekAgo); const weekInvested = weekPredictions.reduce((s, p) => { const b = p.bets.find(b => b.user === walletAddress); return s + (b?.amount || 0); }, 0); const weekWon = weekCorrect.reduce((s, p) => s + ((p.bets || []).find(b => b.user === walletAddress)?.amount || 0) * 2, 0); const accuracy = weekResolved.length > 0 ? Math.round((weekCorrect.length / weekResolved.length) * 100) : 0; const bestCategory = {}; weekPredictions.forEach(p => { const b = p.bets.find(b => b.user === walletAddress); if (b && p.status === 'resolved' && b.outcome === p.resolved_outcome) bestCategory[p.category] = (bestCategory[p.category] || 0) + 1; }); const topCategory = Object.entries(bestCategory).sort((a, b) => b[1] - a[1])[0]; return { predictions: weekPredictions.length, created: weekCreated.length, resolved: weekResolved.length, correct: weekCorrect.length, accuracy, invested: weekInvested, won: weekWon, profit: weekWon - weekInvested, topCategory: topCategory ? { name: topCategory[0], icon: CATEGORY_ICONS[topCategory[0]] || '📁', wins: topCategory[1] } : null, streak: getWinStreak() }; }

function showWeeklyRecap() { const recap = generateWeeklyRecap(); if (!recap || recap.predictions === 0) { showToast("Make some predictions first!", 'info'); return; } const profitColor = recap.profit >= 0 ? 'var(--success-color)' : 'var(--error-color)', profitIcon = recap.profit >= 0 ? '📈' : '📉'; const modal = document.createElement('div'); modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:5000;display:flex;align-items:center;justify-content:center;'; modal.innerHTML = `<div style="background:var(--bg);border:2px solid var(--accent);border-radius:24px;padding:32px;max-width:420px;width:90%;text-align:center;"><div style="font-size:3rem;">📊</div><h2 style="color:var(--accent);">Your Week in PRAEDICTA</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0;"><div class="stat"><div class="stat-value">${recap.predictions}</div><div>Predictions</div></div><div class="stat"><div class="stat-value">${recap.created}</div><div>Created</div></div><div class="stat"><div class="stat-value">${recap.accuracy}%</div><div>Accuracy</div></div><div class="stat"><div class="stat-value" style="color:${profitColor};">${profitIcon} ${recap.profit.toFixed(0)}</div><div>PRAE</div></div></div><div style="padding:12px;background:var(--accent-glow);border-radius:12px;">✅ ${recap.correct}/${recap.resolved} correct · 🔥 ${recap.streak} day streak${recap.topCategory ? `<br>🏆 Best: ${recap.topCategory.icon} ${recap.topCategory.name}` : ''}</div><div style="display:flex;gap:8px;margin-top:16px;"><button onclick="navigator.clipboard.writeText('📊 My week on PRAEDICTA: ${recap.predictions} predictions, ${recap.accuracy}% accuracy, ${recap.profit >= 0 ? '+' : ''}${recap.profit.toFixed(0)} PRAE profit!')" style="flex:1;padding:8px;border-radius:20px;background:var(--accent-glow);color:var(--accent);border:1px solid var(--accent);cursor:pointer;font-size:.75rem;">📋 Share</button><button onclick="this.closest('div[style*=z-index\\\\:5000]').remove()" style="flex:1;padding:8px;border-radius:20px;background:var(--accent);color:var(--bg);border:none;cursor:pointer;font-size:.75rem;">Close</button></div></div>`; modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); }); document.body.appendChild(modal); }

// ============================================================
// AI Oracle Insights
// ============================================================

function generateOracleInsight(prediction) { const market = getMarket(prediction.id); const yesPrice = getYesPrice(market); const bets = prediction.bets || []; const totalBets = bets.length; const volatility = Math.abs(yesPrice - 0.5); const timeLeft = prediction.resolution_date ? new Date(prediction.resolution_date) - Date.now() : 0; const insights = []; if (yesPrice > 0.8) insights.push('🔮 Heavy YES confidence. Contrarian value on NO?'); else if (yesPrice < 0.2) insights.push('🔮 Strong NO sentiment. Crowds can be wrong.'); else if (volatility < 0.05) insights.push('⚡ Perfect 50/50 split! This could go either way.'); if (totalBets > 50) insights.push('📊 High interest. Collective wisdom is watching.'); else if (totalBets < 5) insights.push('👁️ Early stage. Being first has advantages.'); if (timeLeft > 0 && timeLeft < 3600000) insights.push('⏰ Closing soon! Last chance to act.'); else if (timeLeft > 7 * 86400000) insights.push('📅 Long-term. Patience is a virtue.'); if (insights.length < 3) insights.push(['🦉 The Oracle has watched this one...','🌙 The moon favors bold predictions.','💫 Fortune favors the prepared mind.','🎯 Precision matters more than volume.'][Math.floor(Math.random() * 4)]); return insights; }

function renderOracleInsight(prediction) { const insights = generateOracleInsight(prediction); if (insights.length === 0) return ''; return `<div style="margin-top:8px;padding:12px;background:linear-gradient(135deg,var(--accent-glow),rgba(245,158,11,0.1));border-radius:12px;border:1px solid var(--oracle-color);"><div style="font-size:.7rem;color:var(--oracle-color);font-weight:600;margin-bottom:6px;">🤖 Oracle Insight</div><div style="font-size:.7rem;color:var(--text-muted);line-height:1.6;">${insights.map(i => `<div style="margin-bottom:4px;">${i}</div>`).join('')}</div></div>`; }

// ============================================================
// Advanced Search & Filters
// ============================================================

function applyAdvancedFilters() { const sortBy = document.getElementById('filterSortBy')?.value || 'newest'; const minVolume = parseFloat(document.getElementById('filterMinVolume')?.value) || 0; const maxVolume = parseFloat(document.getElementById('filterMaxVolume')?.value) || Infinity; const selectedTags = Array.from(document.querySelectorAll('.filter-tag.active-filter')).map(el => el.dataset.tag); currentFilter.sort = sortBy; currentFilter.minVolume = minVolume; currentFilter.maxVolume = maxVolume; currentFilter.tags = selectedTags; saveFilters(); renderPraedictions(); }
function sortPredictions(predictions, sortBy) { switch(sortBy) { case 'newest': return predictions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); case 'oldest': return predictions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); case 'volume': return predictions.sort((a, b) => (b.bets || []).reduce((s, x) => s + (x.amount || 0), 0) - (a.bets || []).reduce((s, x) => s + (x.amount || 0), 0)); case 'controversial': return predictions.sort((a, b) => { const aDiff = Math.abs(getYesPrice(getMarket(a.id)) - 0.5); const bDiff = Math.abs(getYesPrice(getMarket(b.id)) - 0.5); return aDiff - bDiff; }); case 'ending-soon': return predictions.sort((a, b) => new Date(a.resolution_date) - new Date(b.resolution_date)); case 'bettors': return predictions.sort((a, b) => new Set((b.bets || []).map(x => x.user)).size - new Set((a.bets || []).map(x => x.user)).size); default: return predictions; } }

// ============================================================
// Micro-interactions
// ============================================================

function initMicroInteractions() { document.addEventListener('mousemove', (e) => { document.querySelectorAll('.praediction-card:hover').forEach(card => { const rect = card.getBoundingClientRect(); const x = e.clientX - rect.left, y = e.clientY - rect.top; card.style.transform = `translateY(-4px) perspective(1000px) rotateX(${(y - rect.height/2) / (rect.height/2) * -3}deg) rotateY(${(x - rect.width/2) / (rect.width/2) * 3}deg)`; }); }); document.addEventListener('mouseleave', (e) => { const card = e.target.closest('.praediction-card'); if (card) card.style.transform = ''; }, true); document.addEventListener('click', (e) => { const btn = e.target.closest('.btn, .btn-praedict, .btn-suggest, .quick-bet-btn'); if (!btn) return; const ripple = document.createElement('span'); const rect = btn.getBoundingClientRect(); const size = Math.max(rect.width, rect.height); ripple.style.cssText = `position:absolute;width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px;background:rgba(255,255,255,0.3);border-radius:50%;transform:scale(0);animation:ripple 0.6s ease-out;pointer-events:none;`; btn.style.position = 'relative'; btn.style.overflow = 'hidden'; btn.appendChild(ripple); setTimeout(() => ripple.remove(), 600); }); const style = document.createElement('style'); style.textContent = `@keyframes ripple{to{transform:scale(4);opacity:0}}@keyframes toastBounce{0%{transform:translateX(100px);opacity:0}60%{transform:translateX(-10px);opacity:1}100%{transform:translateX(0);opacity:1}}.toast{animation:toastBounce 0.5s ease-out!important}.stat-value{transition:transform 0.3s ease}.stat-value:hover{transform:scale(1.1)}`; document.head.appendChild(style); }

// ============================================================
// Quick Start Widget & Milestones
// ============================================================

const ONBOARDING_TASKS = [
    { id: 'flip', title: 'Flip the coin', desc: 'Get your daily bonus', icon: '🪙', reward: '+0.1 PRAE', check: () => { const f = JSON.parse(localStorage.getItem('prae_last_flip')||'{}'); return f[walletAddress] === getUTCDayKey(); } },
    { id: 'first_prediction', title: 'Make first prediction', desc: 'Stake 7 PRAE', icon: '✨', reward: '+10 SeerScore', check: () => currentPredictions.some(p => p.creator === walletAddress) },
    { id: 'first_bet', title: 'Bet on a prediction', desc: 'Buy YES or NO', icon: '💰', reward: '+5 SeerScore', check: () => currentPredictions.some(p => (p.bets||[]).some(b => b.user === walletAddress) && p.creator !== walletAddress) },
    { id: 'three_bets', title: 'Bet on 3 predictions', desc: 'Diversify', icon: '📊', reward: '+15 SeerScore', check: () => new Set(currentPredictions.filter(p => (p.bets||[]).some(b => b.user === walletAddress)).map(p => p.id)).size >= 3 },
    { id: 'streak_3', title: 'Reach 3-day streak', desc: 'Flip 3 days in a row', icon: '🔥', reward: '1.25x multiplier', check: () => getWinStreak() >= 3 },
    { id: 'profile_name', title: 'Set Seer name', desc: 'Customize profile', icon: '👤', reward: '+5 SeerScore', check: async () => { const u = await loadUser(walletAddress); return !!u?.display_name; } },
    { id: 'first_win', title: 'Win first prediction', desc: 'Get one right', icon: '🏆', reward: '+20 SeerScore', check: () => currentPredictions.some(p => { const b = (p.bets||[]).find(b => b.user === walletAddress); return b && p.status === 'resolved' && b.outcome === p.resolved_outcome; }) }
];

function renderQuickStart() { const container = document.getElementById('quickStartWidget'); if (!container || !walletAddress) return; let completedCount = 0; let tasksHtml = ''; ONBOARDING_TASKS.forEach(async (task) => { const done = await Promise.resolve(task.check()); if (done) completedCount++; tasksHtml += `<div style="display:flex;align-items:center;gap:8px;padding:8px;background:${done ? 'var(--accent-glow)' : 'var(--card-bg)'};border-radius:12px;margin-bottom:4px;opacity:${done ? '0.6' : '1'};"><span style="font-size:1.2rem;">${done ? '✅' : task.icon}</span><div style="flex:1;"><div style="font-size:.8rem;${done ? 'text-decoration:line-through;' : ''}">${task.title}</div><div style="font-size:.65rem;color:var(--text-muted);">${done ? 'Complete!' : task.desc}</div></div><span style="font-size:.65rem;color:var(--accent);">${task.reward}</span></div>`; }); const allDone = completedCount === ONBOARDING_TASKS.length; container.innerHTML = `<div class="card" style="border:1px solid var(--oracle-color);"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h3 style="color:var(--accent);">🌱 Your Journey</h3><span style="font-size:.8rem;color:var(--oracle-color);">${completedCount}/${ONBOARDING_TASKS.length}</span></div>${allDone ? '<div style="text-align:center;padding:12px;color:var(--oracle-color);">🎉 All complete! You\'re a true Seer!</div>' : ''}<div style="max-height:300px;overflow-y:auto;">${tasksHtml}</div></div>`; container.style.display = 'block'; }

function checkMilestones() { if (!walletAddress) return; const milestones = [ { id: 'first_pred', check: () => currentPredictions.some(p => p.creator === walletAddress), title: '🌱 A new Seer is born!', text: 'You made your first prediction!' }, { id: 'first_win', check: () => currentPredictions.some(p => { const b = (p.bets||[]).find(b => b.user === walletAddress); return b && p.status === 'resolved' && b.outcome === p.resolved_outcome; }), title: '🏆 First Victory!', text: 'Your foresight proves true!' }, { id: 'ten_bets', check: () => currentPredictions.reduce((s,p) => s + (p.bets||[]).filter(b => b.user === walletAddress).length, 0) >= 10, title: '💰 Seasoned Bettor', text: '10 bets placed!' }, { id: 'streak_7', check: () => getWinStreak() >= 7, title: '🔥 Unstoppable!', text: '7-day streak!' }, { id: 'profit_100', check: () => { let won = 0; currentPredictions.forEach(p => { const b = (p.bets||[]).find(b => b.user === walletAddress); if (b && p.status === 'resolved' && b.outcome === p.resolved_outcome) won += (b.amount||0)*2; }); return won >= 100; }, title: '💎 Profit Master', text: '100 PRAE earned!' } ]; const shown = JSON.parse(localStorage.getItem('prae_shown_milestones') || '{}'); milestones.forEach(m => { if (!shown[m.id] && m.check()) { shown[m.id] = true; localStorage.setItem('prae_shown_milestones', JSON.stringify(shown)); spawnConfetti(); const modal = document.createElement('div'); modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:6000;display:flex;align-items:center;justify-content:center;'; modal.innerHTML = `<div style="background:var(--bg);border:2px solid var(--oracle-color);border-radius:24px;padding:40px;max-width:400px;width:90%;text-align:center;"><div style="font-size:5rem;margin-bottom:16px;">${m.title.split(' ')[0]}</div><h2 style="color:var(--oracle-color);">${m.title}</h2><p style="color:var(--text);margin-bottom:16px;">${m.text}</p><button onclick="this.closest('div[style*=z-index\\\\:6000]').remove()" style="padding:12px 40px;border-radius:20px;background:var(--accent);color:var(--bg);border:none;cursor:pointer;font-weight:600;">Continue →</button></div>`; modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); }); document.body.appendChild(modal); } }); }
setInterval(() => { if (walletAddress) checkMilestones(); }, 30000);

// ============================================================
// Notification Center
// ============================================================

function addNotification(message, type = 'info', action = null) { const notif = { id: Date.now() + Math.random(), message, type, time: Date.now(), read: false, action }; notifications.unshift(notif); if (notifications.length > MAX_NOTIFS) notifications.pop(); unreadNotifs++; updateNotifBadge(); renderNotifList(); if (type === 'win') showToast(message, 'success'); else if (type === 'alert') showToast(message, 'error'); }

function updateNotifBadge() { if (DOM.notifBadge) { if (unreadNotifs > 0) { DOM.notifBadge.textContent = unreadNotifs > 99 ? '99+' : unreadNotifs; DOM.notifBadge.style.display = 'flex'; } else { DOM.notifBadge.style.display = 'none'; } } }

function toggleNotifCenter() { if (!DOM.notifCenter) return; const isVisible = DOM.notifCenter.style.display === 'block'; DOM.notifCenter.style.display = isVisible ? 'none' : 'block'; if (!isVisible) { notifications.forEach(n => n.read = true); unreadNotifs = 0; updateNotifBadge(); renderNotifList(); } }

function renderNotifList() { if (!DOM.notifList) return; if (notifications.length === 0) { DOM.notifList.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-muted);">No notifications yet</div>'; return; } const typeIcons = { win: '🏆', alert: '⚠️', info: 'ℹ️', streak: '🔥', leaderboard: '📈', system: '🦉' }; DOM.notifList.innerHTML = notifications.map(n => `<div style="padding:10px 0;border-bottom:1px solid var(--border);cursor:pointer;opacity:${n.read ? '0.6' : '1'};" onclick="${n.action || ''}"><div style="display:flex;gap:8px;align-items:flex-start;"><span style="font-size:1rem;">${typeIcons[n.type] || '📢'}</span><div style="flex:1;"><div style="font-size:.8rem;">${n.message}</div><div style="font-size:.65rem;color:var(--text-muted);margin-top:2px;">${timeAgo(new Date(n.time).toISOString())}</div></div>${!n.read ? '<span style="width:8px;height:8px;background:var(--accent);border-radius:50%;margin-top:4px;"></span>' : ''}</div></div>`).join(''); }

function clearAllNotifs() { notifications = []; unreadNotifs = 0; updateNotifBadge(); renderNotifList(); }

document.addEventListener('click', (e) => { if (DOM.notifCenter && DOM.notifCenter.style.display === 'block') { if (!e.target.closest('#notifCenter') && !e.target.closest('#notifCenterBtn')) { DOM.notifCenter.style.display = 'none'; } } });
