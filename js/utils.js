// ============================================================
// PRAEDICTA – Utility Functions (utils.js)
// ============================================================

let cachedDayKey = '';
let cachedDayKeyDate = 0;
function getUTCDayKey() { const now = Date.now(); if (now - cachedDayKeyDate < 60000) return cachedDayKey; cachedDayKeyDate = now; cachedDayKey = new Date().toISOString().slice(0, 10); return cachedDayKey; }

function escapeHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function sanitize(str, maxLen = CONFIG.MAX_DESC_LENGTH) { if (!str) return ''; return str.trim().slice(0, maxLen).replace(/[<>]/g, ''); }
function isValidReaction(emoji) { return CONFIG.ALLOWED_EMOJIS.includes(emoji); }

function showToast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 5000); }
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

function toggleBlindVoting() { blindVotingEnabled = !blindVotingEnabled; applyBlindVoting(); if (DOM.resolvedContainer) applyBlindVoting(DOM.resolvedContainer); if (DOM.expiredContainer) applyBlindVoting(DOM.expiredContainer); if (DOM.revealVotesBtn) { DOM.revealVotesBtn.textContent = blindVotingEnabled ? '👁️ Show Votes' : '👁️ Hide Votes'; DOM.revealVotesBtn.classList.toggle('active-filter', blindVotingEnabled); } showToast(blindVotingEnabled ? '🙈 Votes hidden – click to reveal' : '👁️ Votes visible'); }

function updateCountdowns() { document.querySelectorAll('[id^="countdown-"]').forEach(el => { const id = el.id.replace('countdown-', ''); const prediction = currentPredictions.find(p => p.id === id); if (!prediction?.resolution_date) return; const remaining = new Date(prediction.resolution_date) - Date.now(); if (remaining <= 0) { el.textContent = '⏰ Deadline passed'; return; } const days = Math.floor(remaining / 86400000); const hours = Math.floor((remaining % 86400000) / 3600000); const mins = Math.floor((remaining % 3600000) / 60000); el.textContent = `⏰ ${days > 0 ? days + 'd ' : ''}${hours}h ${mins}m remaining`; }); }

// Moved from profile.js - data fetching utility
async function fetchHoroscopeForZodiac(sign) { if (!sign || !signToNumber[sign]) return null; const today = getUTCDayKey(); const cacheKey = `horoscope_${sign}_${today}`; if (sessionHoroscopeCache[cacheKey]) return sessionHoroscopeCache[cacheKey]; try { const cached = JSON.parse(localStorage.getItem(cacheKey)); if (cached) { sessionHoroscopeCache[cacheKey] = cached; return cached; } } catch (e) {} const { data, error } = await supabaseClient.from('daily_horoscopes').select('horoscope, lucky_number, mood').eq('sign', sign).eq('date', today).maybeSingle(); const result = (error || !data) ? { description: "The stars are quiet today.", luckyNumber: 7, mood: "reflective" } : { description: data.horoscope, luckyNumber: parseInt(data.lucky_number) || 7, mood: data.mood || "inspired" }; try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch (e) {} sessionHoroscopeCache[cacheKey] = result; return result; }
