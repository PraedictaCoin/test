// ============================================================
// PRAEDICTA – Prediction Market App.js (v7 – Final)
// ============================================================

// ── Configuration ──────────────────────────────────────────
const CONFIG = {
    SUPABASE_URL: "https://akjxouwzsbewihvrdzyn.supabase.co",
    SUPABASE_ANON_KEY: "sb_publishable_IQveUOwzJBKD1ZKSgPV_Lw_Kb0LooKn",
    SECURE_RPC_URL: "https://akjxouwzsbewihvrdzyn.supabase.co/functions/v1/secure_rpc",
    ORACLE_WALLET: "FYCSFKujPbtAASg42J1riNfxYEJBUM5Sv88uBAnnSs3o",
    PRAE_MINT: "7C2Y5NebLFG37wMbB85TbMqYERTSkq9tEi58wv28MCzt",
    MIN_BET: 7,
    FREE_CREATIONS_DAILY: 3,
    FEE_PER_TRADE: 0.005,
    DEFAULT_BALANCE: 1000,
    MAX_TITLE_LENGTH: 200,
    MAX_DESC_LENGTH: 1000,
    SESSION_DURATION_MINUTES: 15,
    ALLOWED_EMOJIS: ['🔥', '😱', '🤔', '👀'],
    MAX_CACHED_MARKETS: 200,
    MAX_COIN_FLIPS: 3
};

const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// ── State ──────────────────────────────────────────────────
let walletAddress = null;
let walletPublicKey = null;
let currentPredictions = [];
let actionCooldown = false;
let currentFilter = { category: 'all', status: 'active', search: '' };
let sessionHoroscopeCache = {};
let leaderboardPeriod = 'all';
let searchDebounce;
let sessionToken = null;
let sessionExpiresAt = null;
let userPRAEBalance = CONFIG.DEFAULT_BALANCE;
let useRealMarket = false;
let oracleAsked = false;
let previousLeaderboard = [];
let blindVotingEnabled = false;

// ── Constants ──────────────────────────────────────────────
const signToNumber = { aries:1, taurus:2, gemini:3, cancer:4, leo:5, virgo:6, libra:7, scorpio:8, sagittarius:9, capricorn:10, aquarius:11, pisces:12 };
const signSymbols = { aries:"♈", taurus:"♉", gemini:"♊", cancer:"♋", leo:"♌", virgo:"♍", libra:"♎", scorpio:"♏", sagittarius:"♐", capricorn:"♑", aquarius:"♒", pisces:"♓" };
const CATEGORY_ICONS = { worldevents:"🌍", politics:"🏛️", crypto:"💰", people:"👤", sports:"⚽", wildcard:"🎲" };
const COMPLIMENTS = ["The Oracle nods approvingly.","Your insight shines!","A true Seer move.","The stars whisper your name.","Wisdom flows through you.","You move before the noise.","A praediction well made.","The crowd feels your presence.","Destiny favours the bold.","Your vote has shifted the tides."];
const ORACLE_VOICES = ["The veil is thin today…","Beware the false prophet.","A whisper from the beyond: YES.","The stars tremble.","In the shadows, a truth awaits.","The Oracle stirs…","A forgotten prediction will come true.","Patience, Seer. The answer is near.","The wind carries a warning.","A great shift is coming.","The Oracle sees all.","Your next vote may change fate.","A dark horse rises in the East.","The numbers whisper a secret.","Tonight, the moon favours the bold."];
const WEEKLY_MESSAGES = ["This week, the stars favour bold predictions. Dare to see what others cannot.","The Oracle senses a shift in the crypto winds. Trust your gut, Seer.","A quiet week for world events – but a wildcard may surprise you.","The moon waxes full this week. Your intuition will be at its peak.","A dark horse rises. Keep your eyes on the underdog.","The Oracle sees a great reveal coming. Be ready.","Patience, Seer. The biggest truths reveal themselves slowly.","This week, the veil between worlds is thin. Your visions may be prophetic.","Beware of false patterns. The noise will try to mislead you.","A week of clarity. The answers you seek are already within."];
const HYPE_MESSAGES = ["🔥 The crowd is heating up!","👁️ A new Seer rises...","⚡ Flash prediction trending!","🌙 The moon guides the market...","💫 Wisdom flows through the collective...","🎯 The sharpest Seers are here!","🌟 A legend is being written..."];
const ORACLE_ANSWERS = ["The stars say... yes.","The veil is unclear. Ask again tomorrow.","A definite no awaits.","The Oracle sees great potential.","Beware - the path is treacherous.","The answer lies within you.","Signs point to a glorious yes.","The future is murky on this one.","All signs align – absolutely yes.","The Oracle remains silent on this matter."];
const STREAK_STORIES = {
    0: "Begin your journey, Seer...",
    1: "Day 1: The Oracle watches.",
    3: "Day 3: Your vision grows clearer.",
    7: "Day 7: The Oracle smiles upon you. 🎁 Gift unlocked!",
    14: "Day 14: A true Prophet emerges!",
    30: "Day 30: Legendary status approaches...",
    60: "Day 60: You are one with the Oracle.",
    100: "Day 100: Immortalized in the Hall of Fame."
};

const PROPHET_TITLES = [
    { min: 1000, title: 'Oracle', emoji: '🦉' },
    { min: 500, title: 'Prophet', emoji: '🔮' },
    { min: 250, title: 'High Seer', emoji: '👁️‍🗨️' },
    { min: 100, title: 'Seer', emoji: '👁️' },
    { min: 25, title: 'Acolyte', emoji: '📿' },
    { min: 0, title: 'Novice', emoji: '🌱' }
];

// ── DOM Cache ──────────────────────────────────────────────
const DOM = {};
function cacheDOM() {
    DOM.gate = document.getElementById('gate');
    DOM.mainApp = document.getElementById('mainApp');
    DOM.tutorialOverlay = document.getElementById('tutorialOverlay');
    DOM.voiceMessage = document.getElementById('voiceMessage');
    DOM.profileHoroscope = document.getElementById('profileHoroscope');
    DOM.praedictionsContainer = document.getElementById('praedictionsContainer');
    DOM.hypeMessage = document.getElementById('hypeMessage');
    DOM.leaderboardList = document.getElementById('leaderboardList');
    DOM.seerOfTheDay = document.getElementById('seerOfTheDay');
    DOM.weeklyOracleMessage = document.getElementById('weeklyOracleMessage');
    DOM.profileStats = document.getElementById('profileStats');
    DOM.walletDisplay = document.getElementById('walletDisplay');
    DOM.oracleIndicatorTop = document.getElementById('oracleIndicatorTop');
    DOM.oracleIndicatorProfile = document.getElementById('oracleIndicatorProfile');
    DOM.userZodiacDisplay = document.getElementById('userZodiacDisplay');
    DOM.zodiacRealHeadline = document.getElementById('zodiacRealHeadline');
    DOM.zodiacHoroscopeDisplay = document.getElementById('zodiacHoroscopeDisplay');
    DOM.zodiacSelectorWrapper = document.getElementById('zodiacSelectorWrapper');
    DOM.referralLink = document.getElementById('referralLink');
    DOM.totalActive = document.getElementById('totalActive');
    DOM.totalPraedicts = document.getElementById('totalPraedicts');
    DOM.totalSeerscore = document.getElementById('totalSeerscore');
    DOM.totalVolume = document.getElementById('totalVolume');
    DOM.crowdYes = document.getElementById('crowdYes');
    DOM.filterSearch = document.getElementById('filterSearch');
    DOM.filterCategory = document.getElementById('filterCategory');
    DOM.connectBtn = document.getElementById('connectBtn');
    DOM.disconnectBtn = document.getElementById('disconnectBtn');
    DOM.themeToggleSmall = document.getElementById('themeToggleSmall');
    DOM.createBtn = document.getElementById('createBtn');
    DOM.playToggle = document.getElementById('playToggle');
    DOM.showMyPraedictionsBtn = document.getElementById('showMyPraedictionsBtn');
    DOM.saveZodiacBtn = document.getElementById('saveZodiacBtn');
    DOM.saveProfileBtn = document.getElementById('saveProfileBtn');
    DOM.displayNameInput = document.getElementById('displayNameInput');
    DOM.avatarSelect = document.getElementById('avatarSelect');
    DOM.profileNameSection = document.getElementById('profileNameSection');
    DOM.copyReferralBtn = document.getElementById('copyReferralBtn');
    DOM.donateBtn = document.getElementById('donateBtn');
    DOM.myPraedictionsList = document.getElementById('myPraedictionsList');
    DOM.ageCheckbox = document.getElementById('ageCheckbox');
    DOM.gateMessage = document.getElementById('gateMessage');
    DOM.title = document.getElementById('title');
    DOM.description = document.getElementById('description');
    DOM.category = document.getElementById('category');
    DOM.resolutionDate = document.getElementById('resolutionDate');
    DOM.autoSource = document.getElementById('autoSource');
    DOM.targetValue = document.getElementById('targetValue');
    DOM.zodiacSelect = document.getElementById('zodiacSelect');
    DOM.lunarPhase = document.getElementById('lunarPhase');
    DOM.flipCoinBtn = document.getElementById('flipCoinBtn');
    DOM.streakRewards = document.getElementById('streakRewards');
    DOM.streakStory = document.getElementById('streakStory');
    DOM.revealVotesBtn = document.getElementById('revealVotesBtn');
    DOM.leaderboardCategoryFilter = document.getElementById('leaderboardCategoryFilter');
    DOM.dailyDigest = document.getElementById('dailyDigest');
    DOM.hallOfFameList = document.getElementById('hallOfFameList');
    DOM.freezeTimer = document.getElementById('freezeTimer');
    DOM.oracleQuestion = document.getElementById('oracleQuestion');
    DOM.askOracleBtn = document.getElementById('askOracleBtn');
    DOM.oracleAnswer = document.getElementById('oracleAnswer');
    DOM.oracleLimit = document.getElementById('oracleLimit');
    DOM.resolvedContainer = document.getElementById('resolvedContainer');
    DOM.expiredContainer = document.getElementById('expiredContainer');
    DOM.hottestCategory = document.getElementById('hottestCategory');
}
cacheDOM();

// ── Utility Functions ──────────────────────────────────────
let cachedDayKey = '';
let cachedDayKeyDate = 0;

function getUTCDayKey() {
    const now = Date.now();
    if (now - cachedDayKeyDate < 60000) return cachedDayKey;
    cachedDayKeyDate = now;
    cachedDayKey = new Date().toISOString().slice(0, 10);
    return cachedDayKey;
}

function escapeHtml(s) {
    if (!s) return '';
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function sanitize(str, maxLen = CONFIG.MAX_DESC_LENGTH) {
    if (!str) return '';
    return str.trim().slice(0, maxLen).replace(/[<>]/g, '');
}

function isValidReaction(emoji) {
    return CONFIG.ALLOWED_EMOJIS.includes(emoji);
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 5000);
}

function setLoading(btn, on) {
    if (!btn) return;
    const loader = btn.querySelector('.loader');
    const txt = btn.querySelector('span:first-child');
    if (loader) loader.style.display = on ? 'inline-block' : 'none';
    if (txt) txt.style.display = on ? 'none' : 'inline';
}

function formatDateWithoutSeconds(iso) {
    if (!iso) return 'No deadline';
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour:'2-digit', minute:'2-digit' });
}

const randomCompliment = () => COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];

function getProphetTitle(seerscore) {
    for (const tier of PROPHET_TITLES) {
        if (seerscore >= tier.min) return tier;
    }
    return PROPHET_TITLES[PROPHET_TITLES.length - 1];
}

function getControversyLabel(yesPrice) {
    const diff = Math.abs(yesPrice - 0.5);
    if (diff < 0.03) return { text: '⚡ SPLIT OPINION', class: 'badge-controversy' };
    if (diff < 0.10) return { text: '🔥 Heated Debate', class: 'badge-flash' };
    if (diff < 0.20) return { text: '🤔 Leaning', class: 'badge-challenge' };
    if (diff > 0.40) return { text: '📊 Near Consensus', class: 'badge-active' };
    return null;
}

function getTimeBadge(resolutionDate) {
    if (!resolutionDate) return null;
    const remaining = new Date(resolutionDate) - Date.now();
    if (remaining < 0) return null;
    if (remaining < 30 * 60 * 1000) return { text: '⏰ 30min left!', class: 'badge-flash' };
    if (remaining < 60 * 60 * 1000) return { text: '⏰ Closing soon', class: 'badge-challenge' };
    if (remaining < 3 * 60 * 60 * 1000) return { text: '⌛ Today', class: 'badge-mystery' };
    return null;
}

function getHottestCategory() {
    const cats = {};
    currentPredictions.filter(p => p.status === 'active').forEach(p => {
        cats[p.category] = (cats[p.category] || 0) + 1;
    });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return { name: 'None', count: 0, icon: '📭' };
    const [cat, count] = sorted[0];
    return { name: cat === 'crypto' ? 'Finance' : cat, count, icon: CATEGORY_ICONS[cat] || '📁' };
}

// ── Balance Persistence ────────────────────────────────────
function saveBalance() {
    if (walletAddress) {
        try {
            localStorage.setItem(`prae_balance_${walletAddress}`, userPRAEBalance.toString());
        } catch (e) { /* storage full */ }
    }
}

function loadBalance() {
    if (!walletAddress) return;
    try {
        const stored = localStorage.getItem(`prae_balance_${walletAddress}`);
        if (stored) {
            const parsed = parseFloat(stored);
            if (!isNaN(parsed) && parsed >= 0) {
                userPRAEBalance = parsed;
                return;
            }
        }
    } catch (e) { /* ignore */ }
    userPRAEBalance = CONFIG.DEFAULT_BALANCE;
}

// ── Blind Voting ──────────────────────────────────────────
function applyBlindVoting(container = document) {
    const voteStats = container.querySelectorAll('.vote-stats');
    voteStats.forEach(el => {
        if (blindVotingEnabled) {
            el.style.filter = 'blur(8px)';
            el.style.transition = 'filter 0.3s ease';
            el.style.userSelect = 'none';
        } else {
            el.style.filter = 'none';
            el.style.userSelect = '';
        }
    });
}

function toggleBlindVoting() {
    blindVotingEnabled = !blindVotingEnabled;
    applyBlindVoting();
    if (DOM.resolvedContainer) applyBlindVoting(DOM.resolvedContainer);
    if (DOM.expiredContainer) applyBlindVoting(DOM.expiredContainer);
    if (DOM.revealVotesBtn) {
        DOM.revealVotesBtn.textContent = blindVotingEnabled ? '👁️ Show Votes' : '👁️ Hide Votes';
        DOM.revealVotesBtn.classList.toggle('active-filter', blindVotingEnabled);
    }
    showToast(blindVotingEnabled ? '🙈 Votes hidden – click to reveal' : '👁️ Votes visible');
}

// ── Lunar Phase ────────────────────────────────────────────
function getLunarPhase() {
    const d = new Date();
    let year = d.getFullYear(), month = d.getMonth() + 1, day = d.getDate();
    if (month < 3) { year--; month += 12; }
    const a = Math.floor(year / 100);
    const b = 2 - a + Math.floor(a / 4);
    const jd = Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
    let c = (jd - 2451550.1) / 29.530588853;
    c = c - Math.floor(c);
    if (c < 0) c += 1;
    const phase = Math.round(c * 8) % 8;
    const phases = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
    const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    return { emoji: phases[phase], name: names[phase] };
}

// ── Horoscope ──────────────────────────────────────────────
async function fetchHoroscopeForZodiac(sign) {
    if (!sign || !signToNumber[sign]) return null;
    const today = getUTCDayKey();
    const cacheKey = `horoscope_${sign}_${today}`;
    
    if (sessionHoroscopeCache[cacheKey]) return sessionHoroscopeCache[cacheKey];
    
    try {
        const cached = JSON.parse(localStorage.getItem(cacheKey));
        if (cached) {
            sessionHoroscopeCache[cacheKey] = cached;
            return cached;
        }
    } catch (e) { /* ignore */ }

    const { data, error } = await supabaseClient
        .from('daily_horoscopes')
        .select('horoscope, lucky_number, mood')
        .eq('sign', sign)
        .eq('date', today)
        .maybeSingle();

    const result = (error || !data) 
        ? { description: "The stars are quiet today. Trust your own intuition.", luckyNumber: 7, mood: "reflective" }
        : { description: data.horoscope, luckyNumber: parseInt(data.lucky_number) || 7, mood: data.mood || "inspired" };

    try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch (e) { /* storage full */ }
    sessionHoroscopeCache[cacheKey] = result;
    return result;
}

// ── Oracle Voice ───────────────────────────────────────────
function rotateVoice() {
    const idx = Math.floor(Math.random() * ORACLE_VOICES.length);
    const message = '🦉 ' + ORACLE_VOICES[idx];
    if (DOM.voiceMessage) DOM.voiceMessage.textContent = message;
    if (DOM.profileHoroscope) DOM.profileHoroscope.textContent = message;
}
rotateVoice();

// ── Weekly Oracle Message ──────────────────────────────────
function getWeeklyMessage() {
    const weekNumber = Math.floor((Date.now() - new Date(2024, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return WEEKLY_MESSAGES[weekNumber % WEEKLY_MESSAGES.length];
}
if (DOM.weeklyOracleMessage) {
    DOM.weeklyOracleMessage.textContent = getWeeklyMessage();
}

// ── Hype Message Rotator ───────────────────────────────────
function updateHypeMessage() {
    if (!DOM.hypeMessage) return;
    DOM.hypeMessage.textContent = HYPE_MESSAGES[Math.floor(Math.random() * HYPE_MESSAGES.length)];
}

// ── Streak Display ─────────────────────────────────────────
function updateStreakDisplay(user) {
    if (!DOM.streakRewards || !user) return;
    const streak = user.login_streak || 0;
    const bonus = streak >= 7 ? '🎁 Bonus active!' : streak >= 3 ? '🔥 Warming up!' : 'Keep going...';
    const countEl = DOM.streakRewards.querySelector('#streakCount');
    const bonusEl = DOM.streakRewards.querySelector('#streakBonus');
    if (countEl) countEl.textContent = streak;
    if (bonusEl) bonusEl.textContent = bonus;
}

function updateStreakStory(user) {
    if (!DOM.streakStory || !user) return;
    const streak = user.login_streak || 0;
    const milestones = Object.keys(STREAK_STORIES).map(Number).sort((a, b) => a - b);
    let storyKey = 0;
    for (const m of milestones) {
        if (streak >= m) storyKey = m;
        else break;
    }
    DOM.streakStory.textContent = STREAK_STORIES[storyKey] || `Day ${streak}: Your legend continues...`;
}

function updateFreezeTimer(user) {
    if (!DOM.freezeTimer || !user) return;
    const nextFreeze = user.next_freeze_available;
    if (nextFreeze) {
        const remaining = new Date(nextFreeze) - Date.now();
        if (remaining > 0) {
            const hours = Math.floor(remaining / 3600000);
            const mins = Math.floor((remaining % 3600000) / 60000);
            DOM.freezeTimer.textContent = `❄️ Next freeze in: ${hours}h ${mins}m`;
        } else {
            DOM.freezeTimer.textContent = '❄️ Freeze available!';
        }
    } else {
        DOM.freezeTimer.textContent = '';
    }
}

// ── Market Simulation (Mock AMM) ───────────────────────────
const mockMarkets = {};
const MOCK_INITIAL_POOL = 1000;

function getMarket(id) {
    if (!mockMarkets[id]) {
        const keys = Object.keys(mockMarkets);
        if (keys.length >= CONFIG.MAX_CACHED_MARKETS) {
            delete mockMarkets[keys[0]];
        }
        mockMarkets[id] = { yesPool: MOCK_INITIAL_POOL, noPool: MOCK_INITIAL_POOL };
    }
    return mockMarkets[id];
}

function getYesPrice(yes, no) {
    return (yes + no === 0) ? 0.5 : no / (yes + no);
}

function buySharesMock(id, outcome, amount) {
    const market = getMarket(id);
    const price = outcome === 'yes' ? getYesPrice(market.yesPool, market.noPool) : 1 - getYesPrice(market.yesPool, market.noPool);
    const cost = amount * price;
    
    if (userPRAEBalance < cost) return { error: 'Insufficient PRAE balance.' };
    
    userPRAEBalance -= cost;
    saveBalance();
    
    if (outcome === 'yes') {
        market.yesPool += amount;
        market.noPool = (market.yesPool * market.noPool) / market.yesPool;
    } else {
        market.noPool += amount;
        market.yesPool = (market.yesPool * market.noPool) / market.noPool;
    }
    
    return { cost, shares: amount };
}

async function buySharesReal(id, outcome, amount) {
    showToast("⛓️ Real market coming soon! Switch to Play Money to test.");
    return { cost: 0, shares: 0 };
}

// ── Render Predictions ─────────────────────────────────────
function renderPraedictions() {
    const container = DOM.praedictionsContainer;
    if (!container) return;

    const filtered = currentPredictions.filter(p => {
        if (currentFilter.category !== 'all' && p.category !== currentFilter.category) return false;
        if (currentFilter.search && !p.title.toLowerCase().includes(currentFilter.search.toLowerCase())) return false;
        if (currentFilter.status !== 'all' && p.status !== currentFilter.status) return false;
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;grid-column:1/-1;color:var(--text-muted);">No praedictions match filters.</div>';
        if (DOM.resolvedContainer) DOM.resolvedContainer.innerHTML = '';
        if (DOM.expiredContainer) DOM.expiredContainer.innerHTML = '';
        return;
    }

    const activeOnly = filtered.filter(p => p.status === 'active');
    const expiredOnly = filtered.filter(p => p.status === 'expired');
    const resolvedOnly = filtered.filter(p => p.status === 'resolved');

    const isOracle = (walletAddress === CONFIG.ORACLE_WALLET);

    if (currentFilter.status === 'expired') {
        container.innerHTML = expiredOnly.length > 0
            ? expiredOnly.map(p => renderPredictionCard(p, isOracle)).join('')
            : '<div style="text-align:center;padding:40px;grid-column:1/-1;color:var(--text-muted);">No expired predictions.</div>';
        if (DOM.resolvedContainer) DOM.resolvedContainer.innerHTML = '';
    } else if (currentFilter.status === 'resolved') {
        container.innerHTML = resolvedOnly.length > 0
            ? resolvedOnly.map(p => renderPredictionCard(p, isOracle)).join('')
            : '<div style="text-align:center;padding:40px;grid-column:1/-1;color:var(--text-muted);">No resolved predictions.</div>';
        if (DOM.expiredContainer) DOM.expiredContainer.innerHTML = '';
    } else {
        container.innerHTML = activeOnly.length > 0
            ? activeOnly.map(p => renderPredictionCard(p, isOracle)).join('')
            : '<div style="text-align:center;padding:40px;grid-column:1/-1;color:var(--text-muted);">No active praedictions.</div>';
        
        if (DOM.expiredContainer) {
            DOM.expiredContainer.innerHTML = expiredOnly.length > 0
                ? '<h3 style="color:var(--accent);margin-bottom:12px;">🕒 Expired – Awaiting Resolution</h3>' + 
                  expiredOnly.map(p => renderPredictionCard(p, isOracle)).join('')
                : '';
        }
        
        if (DOM.resolvedContainer) {
            DOM.resolvedContainer.innerHTML = resolvedOnly.length > 0
                ? '<h3 style="color:var(--accent);margin-bottom:12px;">✅ Resolved Predictions</h3>' + 
                  resolvedOnly.map(p => renderPredictionCard(p, isOracle)).join('')
                : '';
        }
    }

    const allContainers = [container, DOM.resolvedContainer, DOM.expiredContainer].filter(Boolean);
    allContainers.forEach(cont => {
        cont.querySelectorAll('.buy-btn').forEach(btn => btn.addEventListener('click', buyClick));
        cont.querySelectorAll('.buy-amount').forEach(input => input.addEventListener('input', updatePayout));
        cont.querySelectorAll('.react-btn').forEach(btn => btn.addEventListener('click', reactClick));
        cont.querySelectorAll('.share-btn').forEach(btn => btn.addEventListener('click', shareClick));
        cont.querySelectorAll('.oracle-decide').forEach(btn => btn.addEventListener('click', oracleDecide));
        cont.querySelectorAll('.oracle-resolve').forEach(btn => btn.addEventListener('click', resolveClick));
    });

    if (blindVotingEnabled) {
        applyBlindVoting();
        if (DOM.resolvedContainer) applyBlindVoting(DOM.resolvedContainer);
        if (DOM.expiredContainer) applyBlindVoting(DOM.expiredContainer);
    }
}

function renderPredictionCard(p, isOracle) {
    const active = p.status === 'active';
    const market = getMarket(p.id);
    const yesPrice = getYesPrice(market.yesPool, market.noPool);
    const noPrice = 1 - yesPrice;
    const deadline = p.resolution_date ? formatDateWithoutSeconds(p.resolution_date) : 'No deadline';
    const canResolve = p.status === 'expired' && isOracle;

    const badgeClass = p.status === 'resolved' ? 'badge-resolved' : p.status === 'expired' ? 'badge-expired' : 'badge-active';
    const badgeText = p.status.toUpperCase();
    const catIcon = CATEGORY_ICONS[p.category] || '📁';
    const displayCat = p.category === 'crypto' ? 'Finance' : p.category;

    const controversy = active ? getControversyLabel(yesPrice) : null;
    const timeBadge = active ? getTimeBadge(p.resolution_date) : null;

    return `<div class="praediction-card ${controversy && controversy.class === 'badge-controversy' ? 'controversy' : ''}">
    <div class="praediction-title">${escapeHtml(p.title)}</div>
    <div class="praediction-desc">${escapeHtml(p.description)}</div>
    <div class="meta-row">
    <span>${catIcon} ${displayCat}</span>
    <span>📅 ${deadline}</span>
    <span class="badge ${badgeClass}">${badgeText}</span>
    ${controversy ? `<span class="badge ${controversy.class}">${controversy.text}</span>` : ''}
    ${timeBadge ? `<span class="badge ${timeBadge.class}">${timeBadge.text}</span>` : ''}
    </div>
    ${!active ? renderVoteStats(yesPrice, noPrice) : ''}
    ${active ? renderVoteStats(yesPrice, noPrice) : ''}
    ${active ? renderActiveActions(p, yesPrice) : renderResolvedStatus(p)}
    ${canResolve ? renderOracleResolveButtons(p) : ''}
    ${!active ? renderReactionBar(p) : ''}
    </div>`;
}

function renderVoteStats(yesPrice, noPrice) {
    return `<div class="vote-stats">
        <span>✅ YES: ${yesPrice.toFixed(4)} PRAE</span>
        <span>❌ NO: ${noPrice.toFixed(4)} PRAE</span>
    </div>`;
}

function renderActiveActions(p, yesPrice) {
    return `<div class="action-buttons">
        <input type="number" class="buy-amount" id="amount-${p.id}" value="${CONFIG.MIN_BET}" min="${CONFIG.MIN_BET}" step="1" inputmode="numeric" style="width:70px; background:var(--input-bg); border:1px solid var(--input-border); border-radius:40px; padding:8px; color:var(--text);" aria-label="Bet amount">
        <button class="btn-praedict buy-btn" data-id="${p.id}" data-outcome="yes" aria-label="Buy YES shares"><span>Buy YES</span><span class="loader" style="display:none;"></span></button>
        <button class="btn-praedict buy-btn" data-id="${p.id}" data-outcome="no" aria-label="Buy NO shares"><span>Buy NO</span><span class="loader" style="display:none;"></span></button>
        <button class="btn-suggest oracle-decide" data-id="${p.id}" aria-label="Let Oracle decide"><span>🦉 Oracle decide</span></button>
    </div>
    <div style="margin-top:8px; font-size:.7rem; color:var(--text-muted);">
        Potential payout: <span id="payout-${p.id}">${(CONFIG.MIN_BET / (yesPrice || 0.5)).toFixed(2)} YES</span>
    </div>
    ${renderReactionBar(p)}`;
}

function renderReactionBar(p) {
    const grouped = {};
    (p.reactions || []).forEach(r => {
        if (isValidReaction(r.emoji)) {
            grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
        }
    });

    return `<div class="reaction-bar" style="margin-top:12px; display:flex; gap:8px; align-items:center;">
    ${CONFIG.ALLOWED_EMOJIS.map(e => {
        const count = grouped[e] || 0;
        return `<button class="reaction-btn react-btn" data-id="${p.id}" data-emoji="${e}" aria-label="React ${e}" style="display:inline-flex;align-items:center;gap:3px;background:transparent;border:1px solid var(--accent-glow);border-radius:20px;padding:4px 10px;cursor:pointer;color:var(--text);font-size:.8rem;">${e} ${count > 0 ? `<span style="font-size:.7rem;color:var(--accent);">${count}</span>` : ''}</button>`;
    }).join('')}
    <button class="share-btn" data-url="${window.location.origin}#pred-${p.id}" aria-label="Share prediction" style="margin-left:auto;background:transparent;border:1px solid var(--accent-glow);border-radius:20px;padding:4px 10px;cursor:pointer;color:var(--text);font-size:.8rem;">🔗 Share</button>
    </div>`;
}

function renderResolvedStatus(p) {
    return `<div style="text-align:center;margin-top:12px;padding:8px;background:var(--accent-glow);border-radius:12px;">
        🏆 ${p.status === 'resolved' ? `RESOLVED: ${p.resolved_outcome === 'yes' ? '✅ YES' : '❌ NO'}` : '🕒 EXPIRED - awaiting resolution'}
    </div>`;
}

function renderOracleResolveButtons(p) {
    return `<div style="margin-top:12px;display:flex;gap:8px;">
        <button class="oracle-resolve" data-id="${p.id}" data-outcome="yes">✅ Resolve YES</button>
        <button class="oracle-resolve" data-id="${p.id}" data-outcome="no">❌ Resolve NO</button>
    </div>`;
}

function updatePayout(e) {
    const id = e.target.id.split('-')[1];
    const amount = parseFloat(e.target.value) || CONFIG.MIN_BET;
    const market = getMarket(id);
    const price = getYesPrice(market.yesPool, market.noPool);
    const el = document.getElementById(`payout-${id}`);
    if (el) el.textContent = `${(amount / (price || 0.5)).toFixed(2)} YES`;
}

// ── Trade Actions ──────────────────────────────────────────
async function buyClick(e) {
    if (actionCooldown) return;
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    const outcome = btn.dataset.outcome;
    const amountInput = document.getElementById(`amount-${id}`);
    const amount = parseFloat(amountInput?.value) || CONFIG.MIN_BET;

    if (amount < CONFIG.MIN_BET) return showToast(`Minimum bet is ${CONFIG.MIN_BET} PRAE.`);
    if (!['yes', 'no'].includes(outcome)) return;

    actionCooldown = true;
    setLoading(btn, true);

    try {
        const result = useRealMarket 
            ? await buySharesReal(id, outcome, amount)
            : buySharesMock(id, outcome, amount);

        if (result.error) {
            showToast(result.error);
        } else {
            showToast(`Bought ${result.shares.toFixed(2)} ${outcome.toUpperCase()} shares for ${result.cost.toFixed(2)} PRAE.`);
            await refreshAll();
        }
    } catch (err) {
        console.error('Buy error:', err);
        showToast('Transaction failed. Please try again.');
    } finally {
        setLoading(btn, false);
        actionCooldown = false;
    }
}

async function reactClick(e) {
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    const emoji = btn.dataset.emoji;

    if (!isValidReaction(emoji)) return;

    const prediction = currentPredictions.find(p => p.id === id);
    if (!prediction) return;

    prediction.reactions = prediction.reactions || [];

    // Check if THIS USER already reacted with ANY emoji on this prediction
    const userAlreadyReacted = prediction.reactions.some(r => r.user === walletAddress);
    if (userAlreadyReacted) {
        showToast("You already reacted to this prediction");
        return;
    }

    prediction.reactions.push({ user: walletAddress, emoji });

    // Save to Supabase
    try {
        await supabaseClient
        .from('predictions')
        .update({ reactions: prediction.reactions })
        .eq('id', id);
    } catch (err) {
        console.error('Failed to save reaction:', err);
    }

    // Update the card display
    updateReactionDisplay(prediction, btn.closest('.praediction-card'));
}

function updateReactionDisplay(prediction, card) {
    if (!card) return;
    const grouped = {};
    (prediction.reactions || []).filter(r => isValidReaction(r.emoji)).forEach(r => {
        grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
    });

    // Update each reaction button
    CONFIG.ALLOWED_EMOJIS.forEach(emoji => {
        const btn = card.querySelector(`.react-btn[data-emoji="${emoji}"]`);
        if (btn) {
            const count = grouped[emoji] || 0;
            btn.innerHTML = count > 0 ? `${emoji} <span style="font-size:.7rem;color:var(--accent);">${count}</span>` : emoji;
        }
    });
}
function shareClick(e) {
    navigator.clipboard.writeText(e.target.dataset.url).then(() => showToast("Link copied!"));
}

async function oracleDecide(e) {
    const id = e.currentTarget.dataset.id;
    const outcome = Math.random() < 0.5 ? 'yes' : 'no';
    const amount = CONFIG.MIN_BET;

    const result = useRealMarket 
        ? await buySharesReal(id, outcome, amount)
        : buySharesMock(id, outcome, amount);

    if (result.error) {
        showToast(result.error);
    } else {
        showToast(`Oracle chose ${outcome.toUpperCase()} – bought ${result.shares.toFixed(2)} shares.`);
    }
    await refreshAll();
}

async function resolveClick(e) {
    if (walletAddress !== CONFIG.ORACLE_WALLET) {
        showToast("Only Oracle can resolve.");
        return;
    }
    
    const id = e.currentTarget.dataset.id;
    const outcome = e.currentTarget.dataset.outcome;

    if (!confirm(`Resolve to ${outcome.toUpperCase()}?`)) return;

    const prediction = currentPredictions.find(p => p.id === id);
    if (!prediction) return;

    try {
        const { error } = await supabaseClient
            .from('predictions')
            .update({ 
                status: 'resolved', 
                resolved_outcome: outcome, 
                resolved_at: new Date().toISOString() 
            })
            .eq('id', id);

        if (error) throw error;

        prediction.status = 'resolved';
        prediction.resolved_outcome = outcome;
        prediction.resolved_at = new Date().toISOString();

        showToast(`Resolved as ${outcome.toUpperCase()}`);
        await refreshAll();
    } catch (err) {
        console.error('Resolve error:', err);
        showToast('Failed to save resolution.');
    }
}

// ── Data Loading ───────────────────────────────────────────
async function loadPredictions() {
    try {
        const { data, error } = await supabaseClient
            .from('predictions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Load predictions error:', err);
        return [];
    }
}

async function loadUser(address) {
    if (!address) return null;
    try {
        const { data } = await supabaseClient
            .from('users')
            .select('*')
            .eq('address', address)
            .maybeSingle();
        return data;
    } catch (err) {
        console.error('Load user error:', err);
        return null;
    }
}

async function loadLeaderboard(period, category) {
    try {
        const params = { filter: period };
        const rpc = category ? 'get_category_leaderboard' : 'get_leaderboard';
        if (category) params.cat = category;
        const { data } = await supabaseClient.rpc(rpc, params);
        return data || [];
    } catch (err) {
        console.error('Load leaderboard error:', err);
        return [];
    }
}

async function loadHallOfFame() {
    try {
        const { data } = await supabaseClient
            .from('predictions')
            .select('id, title, resolved_outcome, bets')
            .eq('status', 'resolved')
            .order('resolved_at', { ascending: false })
            .limit(10);
        return (data || []).sort((a, b) => {
            const aCorrect = (a.bets || []).filter(b => b.outcome === a.resolved_outcome).length;
            const bCorrect = (b.bets || []).filter(b => b.outcome === b.resolved_outcome).length;
            return bCorrect - aCorrect;
        });
    } catch (err) {
        console.error('Load hall of fame error:', err);
        return [];
    }
}

// ── Profile & Leaderboard Rendering ────────────────────────
async function renderProfile(userData) {
    if (!walletAddress) return;

    const user = userData || await loadUser(walletAddress);
    if (!user) {
        if (DOM.profileStats) DOM.profileStats.innerHTML = '<div>User not found.</div>';
        return;
    }

    const displayName = user.display_name || `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
    const avatar = user.avatar || '';
    if (DOM.walletDisplay) DOM.walletDisplay.innerHTML = `${avatar} ${escapeHtml(displayName)}`;

    const seerScore = user.seerscore || 0;
    const prophetTitle = getProphetTitle(seerScore);
    
    if (DOM.profileStats) {
        DOM.profileStats.innerHTML = `
            <div><span style="color:var(--accent);">💰 PRAE Balance:</span> ${userPRAEBalance.toFixed(2)}</div>
            <div><span style="color:var(--accent);">👁️ Seerscore:</span> ${seerScore}</div>
            <div style="margin-top:8px;"><span style="color:var(--oracle-color);">${prophetTitle.emoji} Rank:</span> ${prophetTitle.title}</div>`;
    }
    
    if (DOM.dailyDigest) {
        const horo = user.zodiac ? await fetchHoroscopeForZodiac(user.zodiac) : null;
        DOM.dailyDigest.innerHTML = '📊 Yesterday: you traded wisely.';
        if (horo && horo.luckyNumber) {
            DOM.dailyDigest.innerHTML += `<br>🍀 Lucky Number: <strong>${horo.luckyNumber}</strong>`;
        }
    }

    const moon = getLunarPhase();
    if (DOM.lunarPhase) DOM.lunarPhase.innerHTML = `${moon.emoji} ${moon.name}`;

    const hasZodiac = !!user.zodiac;
    if (DOM.zodiacSelectorWrapper) DOM.zodiacSelectorWrapper.style.display = hasZodiac ? 'none' : 'flex';
    if (DOM.userZodiacDisplay) DOM.userZodiacDisplay.style.display = hasZodiac ? 'block' : 'none';

    if (hasZodiac) {
        if (DOM.userZodiacDisplay) DOM.userZodiacDisplay.textContent = signSymbols[user.zodiac] || '';
        const horo = await fetchHoroscopeForZodiac(user.zodiac);
        if (horo && DOM.zodiacRealHeadline && DOM.zodiacHoroscopeDisplay) {
            DOM.zodiacRealHeadline.style.display = 'block';
            DOM.zodiacHoroscopeDisplay.innerHTML = `${escapeHtml(horo.description)}<br><br>🍀 Lucky: ${horo.luckyNumber}<br>😌 ${horo.mood}`;
        }
    }

    // Hide name/avatar section if already set
    if (user.display_name) {
        if (DOM.profileNameSection) DOM.profileNameSection.style.display = 'none';
    } else {
        if (DOM.profileNameSection) DOM.profileNameSection.style.display = 'flex';
        if (DOM.displayNameInput) DOM.displayNameInput.value = '';
    }

    updateStreakDisplay(user);
    updateStreakStory(user);
    updateFreezeTimer(user);
    updateHypeMessage();

    if (DOM.avatarSelect) DOM.avatarSelect.value = user.avatar || '';
    if (DOM.referralLink) DOM.referralLink.textContent = `${window.location.origin}?ref=${walletAddress}`;
}

async function renderLeaderboard(period = 'all', category = null) {
    leaderboardPeriod = period;
    const container = DOM.leaderboardList;
    if (!container) return;

    const data = await loadLeaderboard(period, category);
    
    if (previousLeaderboard.length > 0) {
        data.forEach((entry, i) => {
            const prevIndex = previousLeaderboard.findIndex(p => p.address === entry.address);
            if (prevIndex >= 0 && prevIndex !== i) {
                entry.positionChange = prevIndex - i;
            }
        });
    }
    previousLeaderboard = [...data];
    
    container.innerHTML = data.length === 0
        ? '<div style="text-align:center;padding:20px;color:var(--text-muted);">No data yet.</div>'
        : data.map((u, i) => {
            const changeIcon = u.positionChange > 0 ? ' 🟢↑' : u.positionChange < 0 ? ' 🔴↓' : '';
            const name = u.display_name || `${(u.address || '').slice(0, 6)}...${(u.address || '').slice(-4)}`;
            const uTitle = getProphetTitle(u.seerscore || 0);
            return `<div style="display:flex;justify-content:space-between;padding:8px;" class="${u.positionChange !== 0 ? 'leaderboard-glow' : ''}">
                <div>${i + 1}. ${u.avatar || ''} ${uTitle.emoji} ${escapeHtml(name)}${changeIcon}</div>
                <div>👁️ ${u.seerscore}</div>
            </div>`;
        }).join('');

    try {
        const { data: seer } = await supabaseClient.rpc('get_seer_of_the_day');
        if (seer && DOM.seerOfTheDay) {
            const seerTitle = getProphetTitle(seer.seerscore || 0);
            DOM.seerOfTheDay.innerHTML = `
                <div style="text-align:center;">
                    <div style="font-size:2rem;">🌟</div>
                    <div>👁️ Seer of the Day</div>
                    <div style="font-size:1.2rem; color:var(--accent);">${seerTitle.emoji} ${seer.display_name || (seer.address || '').slice(0, 6)}...</div>
                    <div style="font-size:.8rem;">${seerTitle.title} • SeerScore: ${seer.seerscore || '???'}</div>
                </div>`;
        }
    } catch (err) {
        console.error('Seer of day error:', err);
    }
}

async function renderHallOfFame() {
    const container = DOM.hallOfFameList;
    if (!container) return;

    const predictions = await loadHallOfFame();
    container.innerHTML = predictions.length === 0
        ? '<div style="text-align:center;color:var(--text-muted);">No resolved predictions yet.</div>'
        : predictions.map((p, i) => {
            const correct = (p.bets || []).filter(b => b.outcome === p.resolved_outcome).length;
            const total = (p.bets || []).length;
            const acc = total ? ((correct / total) * 100).toFixed(0) : 0;
            return `<div class="praediction-card hall-of-fame"><div class="praediction-title">#${i + 1} – ${escapeHtml(p.title)}</div><div class="meta-row"><span>✅ Resolved: ${(p.resolved_outcome || '').toUpperCase()}</span><span>Correct: ${correct}/${total} (${acc}%)</span></div></div>`;
        }).join('');
}

// ── Global Refresh ─────────────────────────────────────────
async function refreshAll() {
    try {
        const predictions = await loadPredictions();
        currentPredictions = predictions;
        renderPraedictions();

        const user = await loadUser(walletAddress);
        await renderProfile(user);

        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab?.id === 'tab-leaderboard') {
            await renderLeaderboard(leaderboardPeriod, DOM.leaderboardCategoryFilter?.value || null);
        }

        const activeCount = predictions.filter(p => p.status === 'active').length;
        if (DOM.totalActive) DOM.totalActive.textContent = activeCount;

        const totalBet = Object.values(mockMarkets).reduce((s, m) => s + m.yesPool + m.noPool - (MOCK_INITIAL_POOL * 2), 0);
        if (DOM.totalPraedicts) DOM.totalPraedicts.textContent = totalBet.toFixed(0);
        if (DOM.crowdYes) DOM.crowdYes.textContent = '50%';

        const totalVolume = Object.values(mockMarkets).reduce((s, m) => s + Math.abs(m.yesPool - MOCK_INITIAL_POOL) + Math.abs(m.noPool - MOCK_INITIAL_POOL), 0);
        if (DOM.totalVolume) DOM.totalVolume.textContent = totalVolume.toFixed(0);

        if (user && DOM.totalSeerscore) DOM.totalSeerscore.textContent = user.seerscore || 0;

        const hottest = getHottestCategory();
        if (DOM.hottestCategory) {
            DOM.hottestCategory.innerHTML = `${hottest.icon} Hottest: <strong>${hottest.name}</strong> (${hottest.count} active)`;
        }

        const isOracle = (walletAddress === CONFIG.ORACLE_WALLET);
        if (DOM.oracleIndicatorTop) DOM.oracleIndicatorTop.style.display = isOracle ? 'inline-flex' : 'none';
        if (DOM.oracleIndicatorProfile) DOM.oracleIndicatorProfile.style.display = isOracle ? 'inline-block' : 'none';
        
        updateHypeMessage();
    } catch (err) {
        console.error('Refresh error:', err);
    }
}

// ── Connection & Session ───────────────────────────────────
async function callSecureRpc(action, params = {}) {
    if (sessionToken && sessionExpiresAt > Date.now()) {
        try {
            const res = await fetch(CONFIG.SECURE_RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'session_action', params: { action, params }, token: sessionToken })
            });
            if (res.ok) return await res.json();
            sessionToken = null;
            sessionExpiresAt = null;
        } catch (e) {
            console.error('Session action error:', e);
        }
    }

    if (!walletAddress) throw new Error("Wallet not connected");

    const { data: nonce, error: nonceErr } = await supabaseClient
        .rpc('get_auth_nonce', { p_wallet: walletAddress });
    if (nonceErr) throw new Error("Nonce error: " + nonceErr.message);

    const message = `Login to PRAEDICTA at praedictacoin.github.io`;
    const encoded = new TextEncoder().encode(message);
    const signed = await window.solana.signMessage(encoded);
    const signature = Array.from(signed.signature).map(b => b.toString(16).padStart(2, '0')).join('');

    const res = await fetch(CONFIG.SECURE_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params, signature, wallet: walletAddress, nonce, message })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Secure RPC failed');
    }

    return await res.json();
}

async function loginBonus() {
    const result = await callSecureRpc('login_bonus');
    if (result.token) {
        sessionToken = result.token;
        sessionExpiresAt = Date.now() + CONFIG.SESSION_DURATION_MINUTES * 60 * 1000;
    }
    if (result.balance !== undefined) {
        userPRAEBalance = result.balance;
        saveBalance();
    }
    return result;
}

async function connectWallet() {
    if (!DOM.ageCheckbox.checked) {
        showToast("Confirm age and Terms");
        return;
    }
    if (!window.solana) {
        alert("Install Phantom wallet to continue.");
        return;
    }

    setLoading(DOM.connectBtn, true);

    try {
        await window.solana.connect({ onlyIfTrusted: false });
        walletAddress = window.solana.publicKey.toString();
        walletPublicKey = window.solana.publicKey;

        loadBalance();

        const result = await loginBonus();
        
        if (result.error && result.error.includes('Insufficient PRAE')) {
            const balance = result.balance || 0;
            const required = result.required || 7;
            
            if (DOM.gateMessage) {
                DOM.gateMessage.innerHTML = `
                    <div style="text-align:center; margin-top:20px;">
                        <p style="color:#FF8888; font-size:1rem;">💰 Insufficient PRAE Balance</p>
                        <p style="margin-top:8px;">You have: <strong>${balance} PRAE</strong></p>
                        <p>Required: <strong>${required} PRAE</strong></p>
                        <a href="https://dexscreener.com/solana/7C2Y5NebLFG37wMbB85TbMqYERTSkq9tEi58wv28MCzt" 
                           target="_blank" rel="noopener" 
                           style="color:var(--accent); display:inline-block; margin-top:12px; padding:10px 20px; border:1px solid var(--accent); border-radius:40px; text-decoration:none;">
                           Get PRAE on DexScreener →
                        </a>
                    </div>`;
            }
            
            await window.solana.disconnect();
            walletAddress = null;
            walletPublicKey = null;
            return;
        }

        rotateVoice();

        DOM.gate.style.display = 'none';
        DOM.mainApp.style.display = 'block';
        DOM.disconnectBtn.style.display = 'inline-block';

        if (!localStorage.getItem('tutorialShown')) {
            DOM.tutorialOverlay.style.display = 'flex';
            localStorage.setItem('tutorialShown', 'true');
        }

        // Flip coin state - once per day
        if (DOM.flipCoinBtn) {
            const today = getUTCDayKey();
            const lastFlip = localStorage.getItem(`last_flip_${walletAddress}`);
            if (lastFlip === today) {
                DOM.flipCoinBtn.textContent = '🪙 Flip Coin (done for today)';
            } else {
                DOM.flipCoinBtn.textContent = '🪙 Flip Coin (1 available)';
            }
        }

        await refreshAll();
    } catch (err) {
        console.error('Connection error:', err);
        showToast("Connection failed: " + err.message);
    } finally {
        setLoading(DOM.connectBtn, false);
    }
}

function disconnectWallet() {
    if (window.solana?.disconnect) window.solana.disconnect();
    walletAddress = null;
    walletPublicKey = null;
    DOM.mainApp.style.display = 'none';
    DOM.gate.style.display = 'flex';
    DOM.disconnectBtn.style.display = 'none';
    sessionToken = null;
    sessionExpiresAt = null;
    oracleAsked = false;
    blindVotingEnabled = false;
}

// ── Oracle Question Handler ────────────────────────────────
function initOracleAsk() {
    if (!DOM.askOracleBtn) return;
    
    DOM.askOracleBtn.addEventListener('click', () => {
        if (oracleAsked) {
            showToast("🦉 You may only ask once per login. The Oracle needs rest.");
            return;
        }
        
        const question = sanitize(DOM.oracleQuestion?.value || '', 200);
        if (!question) {
            showToast("Ask a question first.");
            return;
        }
        
        oracleAsked = true;
        
        const answer = ORACLE_ANSWERS[Math.floor(Math.random() * ORACLE_ANSWERS.length)];
        if (DOM.oracleAnswer) {
            DOM.oracleAnswer.textContent = `"${escapeHtml(question)}"\n\n🔮 ${answer}`;
        }
        if (DOM.oracleLimit) {
            DOM.oracleLimit.textContent = 'You have asked your question for this session.';
        }
    });
}

// ── Create Prediction ──────────────────────────────────────
async function createPrediction() {
    const title = sanitize(DOM.title.value, CONFIG.MAX_TITLE_LENGTH);
    const desc = sanitize(DOM.description.value, CONFIG.MAX_DESC_LENGTH);
    const cat = DOM.category.value;
    const date = DOM.resolutionDate.value;

    if (!title || !desc || !date) return showToast("Fill all fields");
    if (title.length < 5) return showToast("Title too short (min 5 characters)");

    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 24);
    if (new Date(date) < minDate) return showToast("Date must be ≥24h from now");

    setLoading(DOM.createBtn, true);

    try {
        await callSecureRpc('create', {
            title,
            description: desc,
            category: cat,
            resolutionDate: date,
            autoSource: DOM.autoSource.value || null,
            targetValue: sanitize(DOM.targetValue.value, 50) || null
        });

        showToast("✨ Created! " + randomCompliment());

        DOM.title.value = '';
        DOM.description.value = '';
        DOM.resolutionDate.value = '';
        DOM.targetValue.value = '';
        DOM.autoSource.value = '';

        await refreshAll();
    } catch (e) {
        console.error('Create error:', e);
        showToast(e.message || 'Creation failed');
    } finally {
        setLoading(DOM.createBtn, false);
    }
}

// ── Theme ──────────────────────────────────────────────────
function initTheme() {
    if (localStorage.getItem('praedicta_theme') === 'light') {
        document.body.classList.add('light');
    }
}

function toggleTheme() {
    document.body.classList.toggle('light');
    localStorage.setItem('praedicta_theme', document.body.classList.contains('light') ? 'light' : 'dark');
}

// ── Event Listeners ────────────────────────────────────────
function initEventListeners() {
    DOM.themeToggleSmall?.addEventListener('click', toggleTheme);
    DOM.connectBtn?.addEventListener('click', connectWallet);
    DOM.disconnectBtn?.addEventListener('click', disconnectWallet);

    DOM.playToggle?.addEventListener('click', () => {
        useRealMarket = !useRealMarket;
        DOM.playToggle.textContent = useRealMarket ? '⛓️ Real Market' : '🎮 Play Money';
        refreshAll();
    });

    document.getElementById('closeTutorialBtn')?.addEventListener('click', () => {
        DOM.tutorialOverlay.style.display = 'none';
    });

    DOM.createBtn?.addEventListener('click', createPrediction);

    DOM.filterSearch?.addEventListener('input', e => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            currentFilter.search = e.target.value;
            renderPraedictions();
        }, 200);
    });

    DOM.filterCategory?.addEventListener('change', e => {
        currentFilter.category = e.target.value;
        renderPraedictions();
    });

    DOM.leaderboardCategoryFilter?.addEventListener('change', async e => {
        await renderLeaderboard(leaderboardPeriod, e.target.value || null);
    });

    DOM.revealVotesBtn?.addEventListener('click', toggleBlindVoting);

    document.querySelectorAll('.category-carousel-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-carousel-btn').forEach(b => b.classList.remove('active-filter'));
            this.classList.add('active-filter');
            currentFilter.category = this.dataset.category;
            renderPraedictions();
        });
    });

    document.querySelectorAll('.status-filter-btn[data-status]').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.status-filter-btn[data-status]').forEach(b => b.classList.remove('active-filter'));
            this.classList.add('active-filter');
            currentFilter.status = this.dataset.status;
            renderPraedictions();
        });
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const tab = this.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(`tab-${tab}`)?.classList.add('active');

            if (tab === 'profile') await renderProfile();
            else if (tab === 'leaderboard') await renderLeaderboard(leaderboardPeriod);
            else if (tab === 'halloffame') await renderHallOfFame();
        });
    });

    DOM.saveProfileBtn?.addEventListener('click', async () => {
        const name = sanitize(DOM.displayNameInput.value, 20);
        const avatar = DOM.avatarSelect.value;
        if (!name && !avatar) return showToast("Enter a name or choose an avatar");
        setLoading(DOM.saveProfileBtn, true);
        try {
            await callSecureRpc('update_profile', { display_name: name || null, avatar: avatar || null });
            showToast("Profile updated!");
            await refreshAll();
        } catch (e) {
            showToast(e.message || 'Update failed');
        } finally {
            setLoading(DOM.saveProfileBtn, false);
        }
    });

    DOM.saveZodiacBtn?.addEventListener('click', async () => {
        const sign = DOM.zodiacSelect.value;
        if (!sign) return;
        setLoading(DOM.saveZodiacBtn, true);
        try {
            await callSecureRpc('zodiac', { sign });
            showToast("Zodiac saved!");
            await renderProfile();
        } catch (e) {
            showToast(e.message || 'Save failed');
        } finally {
            setLoading(DOM.saveZodiacBtn, false);
        }
    });

    DOM.copyReferralBtn?.addEventListener('click', () => {
        const link = DOM.referralLink?.textContent;
        if (link) navigator.clipboard.writeText(link).then(() => showToast("Copied!"));
    });

    DOM.donateBtn?.addEventListener('click', () => {
        window.open('https://ko-fi.com/yourusername', '_blank', 'noopener');
    });

    // Flip coin - once per day
    DOM.flipCoinBtn?.addEventListener('click', async () => {
        const today = getUTCDayKey();
        const lastFlip = localStorage.getItem(`last_flip_${walletAddress}`);
        
        if (lastFlip === today) {
            showToast("🪙 Already flipped today! Come back tomorrow.");
            return;
        }
        
        localStorage.setItem(`last_flip_${walletAddress}`, today);
        DOM.flipCoinBtn.textContent = '🪙 Flip Coin (done for today)';
        
        if (Math.random() < 0.5) {
            userPRAEBalance += 0.1;
            saveBalance();
            showToast("You won 0.1 PRAE! 🎉");
        } else {
            showToast("Better luck next time.");
        }
        await renderProfile();
    });

    DOM.showMyPraedictionsBtn?.addEventListener('click', () => {
        const c = DOM.myPraedictionsList;
        if (!c) return;
        if (c.style.display === 'none' || !c.style.display) {
            // Show predictions I created
            const myCreated = currentPredictions.filter(p => p.creator === walletAddress);
            // Show predictions I bet on
            const myBets = currentPredictions.filter(p =>
            (p.bets || []).some(b => b.user === walletAddress) && p.creator !== walletAddress
            );

            let html = '';

            if (myCreated.length > 0) {
                html += '<h4 style="color:var(--accent);margin-bottom:8px;">✨ Created by you</h4>';
                html += myCreated.map(p =>
                `<div style="background:var(--card-bg);border-radius:12px;padding:12px;margin-bottom:8px;">
                <strong>${escapeHtml(p.title)}</strong><br>
                <span style="font-size:.8rem;color:var(--text-muted);">Status: ${p.status.toUpperCase()}</span>
                </div>`
                ).join('');
            }

            if (myBets.length > 0) {
                html += '<h4 style="color:var(--accent);margin:12px 0 8px;">💰 Your bets</h4>';
                html += myBets.map(p => {
                    const bet = p.bets.find(b => b.user === walletAddress);
                    return `<div style="background:var(--card-bg);border-radius:12px;padding:12px;margin-bottom:8px;">
                    <strong>${escapeHtml(p.title)}</strong><br>
                    <span style="font-size:.8rem;color:var(--text-muted);">${bet.outcome.toUpperCase()} • ${p.status}</span>
                    </div>`;
                }).join('');
            }

            c.innerHTML = html || 'No praedictions yet.';
            c.style.display = 'block';
        } else {
            c.style.display = 'none';
        }
    });

    document.getElementById('deleteAccountLink')?.addEventListener('click', async e => {
        e.preventDefault();
        if (!confirm("Permanently delete all your data?")) return;
        setLoading(e.target, true);
        try {
            await callSecureRpc('delete');
            showToast("Account deleted. Reloading...");
            localStorage.clear();
            window.location.reload();
        } catch (err) {
            showToast("Deletion failed: " + err.message);
        } finally {
            setLoading(e.target, false);
        }
    });

    document.querySelectorAll('[data-period]').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('[data-period]').forEach(b => b.classList.remove('active-filter'));
            this.classList.add('active-filter');
            await renderLeaderboard(this.dataset.period, DOM.leaderboardCategoryFilter?.value || null);
        });
    });

    initOracleAsk();
}

// ── Initialization ─────────────────────────────────────────
function init() {
    initTheme();
    initEventListeners();

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/test/sw.js')
                .then(reg => console.log('SW registered:', reg.scope))
                .catch(err => console.error('SW failed:', err));
        });
    }

    if (window.solana?.isConnected) {
        setTimeout(() => DOM.connectBtn?.click(), 100);
    }
}

init();
