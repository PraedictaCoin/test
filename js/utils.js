// ============================================================
// PRAEDICTA – Utility Functions (utils.js) - COMPLETE
// ============================================================

let cachedDayKey = ''; let cachedDayKeyDate = 0;
function getUTCDayKey() { const now = Date.now(); if (now - cachedDayKeyDate < 60000) return cachedDayKey; cachedDayKeyDate = now; cachedDayKey = new Date().toISOString().slice(0, 10); return cachedDayKey; }

function escapeHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function sanitize(str, maxLen = CONFIG.MAX_DESC_LENGTH) { if (!str) return ''; return str.trim().slice(0, maxLen).replace(/[<>]/g, ''); }
function isValidReaction(emoji) { return CONFIG.ALLOWED_EMOJIS.includes(emoji); }

// Toast with colors and stacking
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
function loadFilters() { try { const stored = localStorage.getItem('praedicta_filters'); if (stored) { const parsed = JSON.parse(stored); if (parsed.category) currentFilter.category = parsed.category; if (parsed.status) currentFilter.status = parsed.status; if (parsed.search) currentFilter.search = parsed.search; } } catch (e) {} }

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

// Confirmation dialog
function confirmBet(amount, outcome, payout) { return confirm(`Bet ${amount} PRAE on ${outcome.toUpperCase()}?\n\nPotential payout: ~${payout} shares\n\nThis action cannot be undone.`); }

// Referral tracking
function trackReferral() { const params = new URLSearchParams(window.location.search); const ref = params.get('ref'); if (ref && ref !== walletAddress && walletAddress) { try { supabaseClient.from('users').update({ referred_by: ref }).eq('address', walletAddress); } catch (e) {} } }

// Skeleton loading
function showSkeleton() { if (DOM.skeletonContainer) DOM.skeletonContainer.style.display = 'grid'; if (DOM.praedictionsContainer) DOM.praedictionsContainer.style.display = 'none'; }
function hideSkeleton() { if (DOM.skeletonContainer) DOM.skeletonContainer.style.display = 'none'; if (DOM.praedictionsContainer) DOM.praedictionsContainer.style.display = 'grid'; }

// Time ago format
function timeAgo(iso) {
    if (!iso) return '';
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return formatDateWithoutSeconds(iso);
}

// Tab title flash
let originalTitle = document.title;
function flashTitle(text) {
    document.title = text;
    setTimeout(() => { document.title = originalTitle; }, 3000);
}



