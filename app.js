// ============================================================
// PRAEDICTA – full app.js with prediction market simulation
// ============================================================
const SUPABASE_URL = "https://klgwyaeqnklydlqatzys.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_OL32s1-muu_5d5ACQ_4kVQ_yEEeyJl1";
const SECURE_RPC_URL = "https://klgwyaeqnklydlqatzys.supabase.co/functions/v1/secure_rpc";
const ORACLE_WALLET = "FYCSFKujPbtAASg42J1riNfxYEJBUM5Sv88uBAnnSs3o";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let walletAddress = null;
let currentPredictions = [];
let actionCooldown = false;
let currentFilter = { category:'all', status:'active', search:'' };
let sessionHoroscopeCache = {};
let leaderboardPeriod = 'all';
let soundEnabled = false;
let previousLeaderboard = [];
let eyeClickCount = 0;
let oracleAsked = false;
let voiceInterval, freezeInterval, emojiInterval, searchDebounce;
let sessionToken = null;
let sessionExpiresAt = null;

// --- MOCK MARKET STATE ---
let userPRAEBalance = 1000;
const mockMarkets = {};

function getMarket(id) {
    if (!mockMarkets[id]) {
        mockMarkets[id] = { yesPool: 1000, noPool: 1000 };
    }
    return mockMarkets[id];
}

function getYesPrice(yesPool, noPool) {
    if (yesPool + noPool === 0) return 0.5;
    return noPool / (yesPool + noPool);
}

function buyShares(id, outcome, amount) {
    const market = getMarket(id);
    const { yesPool, noPool } = market;
    let cost;
    if (outcome === 'yes') {
        const price = getYesPrice(yesPool, noPool);
        cost = amount * price;
        const newYesPool = yesPool + amount;
        const newNoPool = (yesPool * noPool) / newYesPool;
        market.yesPool = newYesPool;
        market.noPool = newNoPool;
    } else {
        const price = 1 - getYesPrice(yesPool, noPool);
        cost = amount * price;
        const newNoPool = noPool + amount;
        const newYesPool = (yesPool * noPool) / newNoPool;
        market.noPool = newNoPool;
        market.yesPool = newYesPool;
    }
    userPRAEBalance -= cost;
    return { cost, shares: amount };
}

// --- DOM CACHE ---
const DOM = {};
function cacheDOM() {
    DOM.gate = document.getElementById('gate');
    DOM.mainApp = document.getElementById('mainApp');
    DOM.particlesContainer = document.getElementById('particles');
    DOM.streakGlowOverlay = document.getElementById('streakGlowOverlay');
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
    DOM.crowdYes = document.getElementById('crowdYes');
    DOM.filterSearch = document.getElementById('filterSearch');
    DOM.filterCategory = document.getElementById('filterCategory');
    DOM.connectBtn = document.getElementById('connectBtn');
    DOM.disconnectBtn = document.getElementById('disconnectBtn');
    DOM.themeToggleSmall = document.getElementById('themeToggleSmall');
    DOM.createBtn = document.getElementById('createBtn');
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
    DOM.soundToggle = document.getElementById('soundToggle');
    DOM.soundPackSelect = document.getElementById('soundPackSelect');
    DOM.logoEye = document.getElementById('logoEye');
    DOM.gateEye = document.getElementById('gateEye');
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
}
cacheDOM();

// --- AUDIO ---
let audioCtx = null;
function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
let currentSoundPack = localStorage.getItem('soundPack') || 'default';
if (DOM.soundPackSelect) {
    DOM.soundPackSelect.value = currentSoundPack;
    DOM.soundPackSelect.addEventListener('change', () => { currentSoundPack = DOM.soundPackSelect.value; localStorage.setItem('soundPack', currentSoundPack); playSound('click'); });
}

function playSound(type = 'click') {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioCtx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        switch(currentSoundPack) {
            // (keep all sound cases unchanged)
            default: if (type === 'vote') { osc.frequency.value = 800; gain.gain.value = 0.1; osc.start(); osc.stop(ctx.currentTime + 0.1); } else if (type === 'create') { osc.frequency.value = 600; gain.gain.value = 0.1; osc.start(); osc.stop(ctx.currentTime + 0.2); } else if (type === 'gong' || type === 'milestone') { osc.type = 'triangle'; osc.frequency.value = 200; gain.gain.value = 0.15; osc.start(); osc.stop(ctx.currentTime + 0.8); } else { osc.frequency.value = 1000; gain.gain.value = 0.05; osc.start(); osc.stop(ctx.currentTime + 0.05); }
        }
    } catch(e) {}
}
DOM.soundToggle.addEventListener('click', ()=>{ soundEnabled = !soundEnabled; DOM.soundToggle.textContent = soundEnabled ? '🔊' : '🔇'; playSound('click'); });
if (DOM.revealVotesBtn) { DOM.revealVotesBtn.addEventListener('click', () => showToast("Votes are always hidden until the prediction is resolved. Trust your intuition!")); }

// --- HELPERS ---
function getUTCDayKey() { return new Date().toISOString().slice(0,10); }
function escapeHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function isValidUrl(url) { try { new URL(url); return true; } catch { return false; } }
function showToast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 5000); }
function setLoading(btn, on) { if (!btn) return; const loader = btn.querySelector('.loader'); const txt = btn.querySelector('span:first-child'); if (loader) loader.style.display = on ? 'inline-block' : 'none'; if (txt) txt.style.display = on ? 'none' : 'inline'; }

// --- CONSTANTS ---
const oracleAskAnswers = ["The stars align… yes.","A dark cloud looms… no.","The crystal swirls with uncertainty.","The Oracle whispers: maybe.","It shall come to pass.","Not in this age.","The future is shrouded, but hope remains.","A resounding yes echoes through the void.","The answer lies within you.","The spirits say: no."];
if (DOM.askOracleBtn) {
    DOM.askOracleBtn.addEventListener('click', () => {
        if (oracleAsked) { showToast("You have already asked the Oracle this session."); return; }
        const question = DOM.oracleQuestion.value.trim();
        if (!question) { showToast("Speak your question first."); return; }
        const answer = oracleAskAnswers[Math.floor(Math.random() * oracleAskAnswers.length)];
        DOM.oracleAnswer.textContent = `🔮 ${answer}`;
        DOM.oracleAnswer.style.animation = 'none';
        void DOM.oracleAnswer.offsetWidth;
        DOM.oracleAnswer.style.animation = 'fadeIn .5s';
        playSound('gong');
        DOM.oracleQuestion.value = '';
        oracleAsked = true;
        DOM.oracleLimit.textContent = "You have asked your question for this login. (Resets on next login)";
        DOM.askOracleBtn.disabled = true;
    });
}

const streakStories = ["The Oracle notices you…","A whisper in the dark…","You are being watched by unseen eyes.","The stars begin to align.","A true Seer is born.","The Oracle speaks your name.","A week of visions. You are becoming powerful.","Two weeks. The veil is thin around you.","A month of foresight. The Oracle is proud.","A year. You have become a legend."];
function updateStreakStory(streak) {
    let index = 0;
    if (streak >= 365) index = 9; else if (streak >= 30) index = 8; else if (streak >= 14) index = 7;
    else if (streak >= 7) index = 6; else if (streak >= 6) index = 5; else if (streak >= 5) index = 4;
    else if (streak >= 4) index = 3; else if (streak >= 3) index = 2; else if (streak >= 2) index = 1; else index = 0;
    DOM.streakStory.textContent = streakStories[index];
}

const signToNumber = { aries:1, taurus:2, gemini:3, cancer:4, leo:5, virgo:6, libra:7, scorpio:8, sagittarius:9, capricorn:10, aquarius:11, pisces:12 };
const signNames = { aries:"♈ Aries", taurus:"♉ Taurus", gemini:"♊ Gemini", cancer:"♋ Cancer", leo:"♌ Leo", virgo:"♍ Virgo", libra:"♎ Libra", scorpio:"♏ Scorpio", sagittarius:"♐ Sagittarius", capricorn:"♑ Capricorn", aquarius:"♒ Aquarius", pisces:"♓ Pisces" };
const signSymbols = { aries:"♈", taurus:"♉", gemini:"♊", cancer:"♋", leo:"♌", virgo:"♍", libra:"♎", scorpio:"♏", sagittarius:"♐", capricorn:"♑", aquarius:"♒", pisces:"♓" };
const categoryIcons = { worldevents:"🌍", politics:"🏛️", crypto:"💰", people:"👤", sports:"⚽", wildcard:"🎲" };
const compliments = ["The Oracle nods approvingly.","Your insight shines!","A true Seer move.","The stars whisper your name.","Wisdom flows through you.","You move before the noise.","A praediction well made.","The crowd feels your presence.","Destiny favours the bold.","Your vote has shifted the tides."];
function randomCompliment() { return compliments[Math.floor(Math.random() * compliments.length)]; }

function triggerConfetti() { const emojis = ['🎉','✨','🌟','💫','🎊']; for (let i=0; i<10; i++) { const confetti = document.createElement('div'); confetti.className = 'confetti'; confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)]; confetti.style.left = Math.random() * 100 + '%'; confetti.style.top = Math.random() * 50 + '%'; confetti.style.animationDuration = (1.5 + Math.random() * 1.5) + 's'; document.body.appendChild(confetti); setTimeout(() => confetti.remove(), 2500); } }
function streakGlow() { DOM.streakGlowOverlay.classList.add('active'); setTimeout(() => DOM.streakGlowOverlay.classList.remove('active'), 2000); }

emojiInterval = setInterval(() => { const emojis = ['🔮','👁️','✨','🦉','⭐']; const floating = document.createElement('div'); floating.className = 'floating-emoji'; floating.textContent = emojis[Math.floor(Math.random() * emojis.length)]; floating.style.left = Math.random() * 90 + '%'; floating.style.top = Math.random() * 80 + '%'; floating.style.animationDuration = (4 + Math.random() * 4) + 's'; document.body.appendChild(floating); setTimeout(() => floating.remove(), 6000); }, 120000);

function formatDateWithoutSeconds(iso) { if (!iso) return 'No deadline'; const d = new Date(iso); return d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})+' '+d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'}); }
function getLunarPhase() { const d = new Date(); let year = d.getFullYear(), month = d.getMonth() + 1, day = d.getDate(); if (month < 3) { year--; month += 12; } const a = Math.floor(year/100); const b = 2 - a + Math.floor(a/4); const jd = Math.floor(365.25*(year+4716)) + Math.floor(30.6001*(month+1)) + day + b - 1524.5; let c = (jd - 2451550.1) / 29.530588853; c = c - Math.floor(c); if (c < 0) c += 1; const phase = Math.round(c * 8); const phases = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘']; const names = ['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous','Full Moon','Waning Gibbous','Last Quarter','Waning Crescent']; return { emoji: phases[phase % 8], name: names[phase % 8] }; }
function getProphetTitle(score) { if (score >= 300) return 'Oracle'; if (score >= 150) return 'Prophet'; if (score >= 50) return 'Seer'; return 'Novice'; }
function updateStreakRewards(streak) { const rewards = []; if (streak >= 2) rewards.push('+1 Creation'); if (streak >= 3) rewards.push('+1 Vote, Prophet Title'); if (streak >= 4) rewards.push('+1 Creation'); if (streak >= 5) rewards.push('+1 Vote'); if (streak >= 6) rewards.push('+1 Creation'); if (streak >= 7) rewards.push('+1 Vote, Coin Flip'); if (streak >= 8) rewards.push('+1 Creation'); if (streak >= 9) rewards.push('+1 Vote'); if (streak >= 14) rewards.push('Coin Flip (if not already)'); if (DOM.streakRewards) { DOM.streakRewards.innerHTML = rewards.length ? '🔥 Streak: ' + streak + ' days – ' + rewards.join(', ') + ' unlocked!' : '🔥 Streak: ' + streak + ' days – Keep returning to unlock rewards!'; } }
function updateFreezeTimer() { const now = new Date(); const nextMonday = new Date(now); nextMonday.setUTCDate(now.getUTCDate() + ((1 + 7 - now.getUTCDay()) % 7)); nextMonday.setUTCHours(0,0,0,0); if (nextMonday <= now) nextMonday.setUTCDate(nextMonday.getUTCDate() + 7); const diff = nextMonday - now; const hours = Math.floor(diff / 3600000); const minutes = Math.floor((diff % 3600000) / 60000); DOM.freezeTimer.textContent = `❄️ Next streak freeze in ${hours}h ${minutes}m`; }
freezeInterval = setInterval(updateFreezeTimer, 60000);
updateFreezeTimer();

const oracleVoices = ["The veil is thin today…","Beware the false prophet.","A whisper from the beyond: YES.","The stars tremble.","In the shadows, a truth awaits.","The Oracle stirs…","A forgotten prediction will come true.","Patience, Seer. The answer is near.","The wind carries a warning.","A great shift is coming.","The Oracle sees all.","Your next vote may change fate.","A dark horse rises in the East.","The numbers whisper a secret.","Tonight, the moon favours the bold."];
function rotateVoice() { const idx = Math.floor(Math.random() * oracleVoices.length); const message = '🦉 ' + oracleVoices[idx]; if (DOM.voiceMessage) DOM.voiceMessage.textContent = message; if (DOM.profileHoroscope) DOM.profileHoroscope.textContent = message; }
voiceInterval = setInterval(rotateVoice, 5 * 60 * 1000);
rotateVoice();

const weeklyMessages = ["This week, the stars favour bold predictions. Dare to see what others cannot.","The Oracle senses a shift in the crypto winds. Trust your gut, Seer.","A quiet week for world events – but a wildcard may surprise you.","The moon waxes full this week. Your intuition will be at its peak.","A dark horse rises. Keep your eyes on the underdog.","The Oracle sees a great reveal coming. Be ready.","Patience, Seer. The biggest truths reveal themselves slowly.","This week, the veil between worlds is thin. Your visions may be prophetic.","Beware of false patterns. The noise will try to mislead you.","A week of clarity. The answers you seek are already within."];
function getWeeklyMessage() { const weekNumber = Math.floor((new Date() - new Date(2024,0,1)) / (7*24*60*60*1000)); return weeklyMessages[weekNumber % weeklyMessages.length]; }
if (DOM.weeklyOracleMessage) { DOM.weeklyOracleMessage.textContent = getWeeklyMessage(); }

// --- SIGNATURE & RPC ---
async function callSecureRpcSession(action, params = {}) {
    const response = await fetch(SECURE_RPC_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'session_action', params:{ action, params }, token:sessionToken }) });
    if (!response.ok) { const err = await response.json().catch(()=>({})); throw new Error(err.error || 'Session action failed'); }
    return await response.json();
}

async function callSecureRpc(action, params = {}) {
    if (sessionToken && sessionExpiresAt > Date.now()) {
        try { return await callSecureRpcSession(action, params); } catch(e) { sessionToken = null; sessionExpiresAt = null; }
    }
    if (!walletAddress) throw new Error("Wallet not connected");
    const { data: nonce, error: nonceErr } = await supabaseClient.rpc('get_auth_nonce', { p_wallet: walletAddress });
    if (nonceErr) throw new Error("Nonce error: " + nonceErr.message);
    let message = '';
    switch (action) {
        case 'vote': message = `Vote ${params.outcome.toUpperCase()} on prediction #${params.predictionId} at praedictacoin.github.io`; break;
        case 'create': message = `Create prediction "${params.title}" at praedictacoin.github.io`; break;
        case 'suggest': message = `Suggest outcome ${params.outcome.toUpperCase()} for prediction #${params.predictionId} at praedictacoin.github.io`; break;
        case 'resolve': message = `Resolve prediction #${params.predictionId} as ${params.outcome.toUpperCase()} at praedictacoin.github.io`; break;
        case 'delete': message = `Delete all my data at praedictacoin.github.io`; break;
        case 'zodiac': message = `Save my zodiac sign as ${params.sign} at praedictacoin.github.io`; break;
        case 'update_profile': message = `Update my profile at praedictacoin.github.io`; break;
        case 'react': message = `React to prediction #${params.predictionId} at praedictacoin.github.io`; break;
        case 'flip_coin': message = `Flip coin at praedictacoin.github.io`; break;
        case 'login_bonus': message = `Login to PRAEDICTA at praedictacoin.github.io`; break;
        default: message = `Action: ${action} at praedictacoin.github.io`;
    }
    const encoded = new TextEncoder().encode(message);
    const signed = await window.solana.signMessage(encoded);
    if (!signed || !signed.signature) throw new Error('Signing failed');
    const sig = signed.signature;
    const signature = Array.from(sig).map(b => b.toString(16).padStart(2,'0')).join('');
    const response = await fetch(SECURE_RPC_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action, params, signature, wallet:walletAddress, nonce, message }) });
    if (!response.ok) { const err = await response.json().catch(()=>({})); throw new Error(err.error || 'Secure RPC failed'); }
    return await response.json();
}

async function castVote(predictionId, outcome) { return await callSecureRpc('vote', { predictionId, outcome, day: getUTCDayKey() }); }
async function createPredictionAtomic(title, description, category, resolutionDate, autoSource, targetValue) { return await callSecureRpc('create', { title, description, category, resolutionDate, autoSource:autoSource||null, targetValue:targetValue||null, day:getUTCDayKey() }); }
async function suggestOutcome(predictionId, outcome, evidence) { if (!isValidUrl(evidence)) throw new Error('Invalid evidence URL'); return await callSecureRpc('suggest', { predictionId, outcome, evidence }); }
async function resolveMarket(predictionId, outcome) { return await callSecureRpc('resolve', { predictionId, outcome }); }
async function deleteUserData() { return await callSecureRpc('delete'); }
async function saveZodiac(sign) { return await callSecureRpc('zodiac', { sign }); }
async function updateProfile(name, avatar) { return await callSecureRpc('update_profile', { display_name: name, avatar }); }
async function reactToPrediction(predictionId, emoji) { return await callSecureRpc('react', { predictionId, reaction: emoji }); }
async function flipCoin() { return await callSecureRpc('flip_coin'); }
async function loginBonus() { return await callSecureRpc('login_bonus'); }

async function loadPredictions() {
    const { data, error } = await supabaseClient
        .from('predictions')
        .select('id,title,description,status,resolution_date,category,betting_pool_yes,betting_pool_no,bets,suggestions,resolved_outcome,creator,auto_source,target_value,reactions,created_at')
        .order('created_at', { ascending: false })
        .limit(100);
    if (error) throw error;
    return data || [];
}
async function loadUser(address) { const { data } = await supabaseClient.from('users').select('*').eq('address', address).maybeSingle(); return data; }
async function loadLeaderboard(period = 'all', category = null) { if (category) { const { data } = await supabaseClient.rpc('get_category_leaderboard', { filter: period, cat: category }); return data || []; } const { data } = await supabaseClient.rpc('get_leaderboard', { filter: period }); return data || []; }
async function loadHallOfFame() { const { data, error } = await supabaseClient.from('predictions').select('id, title, resolved_outcome, bets').eq('status', 'resolved').order('resolved_at', { ascending: false }).limit(10); if (error) return []; return data.sort((a,b) => { const aCorrect = (a.bets||[]).filter(b=>b.outcome === a.resolved_outcome).length; const bCorrect = (b.bets||[]).filter(b=>b.outcome === b.resolved_outcome).length; return bCorrect - aCorrect; }); }

async function fetchHoroscopeForZodiac(sign) {
    if (!sign || !signToNumber[sign]) return null;
    const today = getUTCDayKey();
    const cacheKey = `horoscope_${sign}_${today}`;
    const cached = sessionHoroscopeCache[cacheKey] || JSON.parse(localStorage.getItem(cacheKey) || 'null');
    if (cached) return cached;
    const { data, error } = await supabaseClient
        .from('daily_horoscopes')
        .select('horoscope, lucky_number, mood')
        .eq('sign', sign)
        .eq('date', today)
        .maybeSingle();
    if (error || !data) {
        const fallback = { description: "The stars are quiet today. Trust your own intuition.", luckyNumber: 7, mood: "reflective" };
        localStorage.setItem(cacheKey, JSON.stringify(fallback));
        sessionHoroscopeCache[cacheKey] = fallback;
        return fallback;
    }
    const result = { description: data.horoscope, luckyNumber: parseInt(data.lucky_number) || 7, mood: data.mood || "inspired" };
    localStorage.setItem(cacheKey, JSON.stringify(result));
    sessionHoroscopeCache[cacheKey] = result;
    return result;
}

// --- RENDER FUNCTIONS ---
let cachedSpecialIds = {};
function computeSpecialIds(predictions) {
    const dailyChallengeId = (()=>{ const active=predictions.filter(p=>p.status==='active'); if(active.length===0) return null; const seed=new Date().toISOString().slice(0,10); let hash=0; for(let i=0;i<seed.length;i++) hash=((hash<<5)-hash)+seed.charCodeAt(i); return active[Math.abs(hash)%active.length].id; })();
    const hotTopicId = (()=>{ const active=predictions.filter(p=>p.status==='active'); if(active.length===0) return null; return active.reduce((a,b)=>((a.betting_pool_yes||0)+(a.betting_pool_no||0))>((b.betting_pool_yes||0)+(b.betting_pool_no||0))?a:b).id; })();
    const controversyId = (()=>{ const active=predictions.filter(p=>p.status==='active'); if(active.length===0) return null; return active.reduce((a,b)=>{ const ra=Math.abs((a.betting_pool_yes||0)-(a.betting_pool_no||0)); const rb=Math.abs((b.betting_pool_yes||0)-(b.betting_pool_no||0)); return ra<rb?a:b; }).id; })();
    const flashId = (()=>{ const now=Date.now(); const recent=predictions.filter(p=>p.status==='active'&&new Date(p.created_at).getTime()>now-3600000); return recent.length?recent[0].id:null; })();
    const weeklyId = (()=>{ const active=predictions.filter(p=>p.status==='active'); if(active.length===0) return null; return active.reduce((a,b)=>new Set((a.bets||[]).map(b=>b.user)).size > new Set((b.bets||[]).map(b=>b.user)).size?a:b).id; })();
    const mysteryBonusId = dailyChallengeId;
    cachedSpecialIds = { dailyChallengeId, hotTopicId, controversyId, flashId, weeklyId, mysteryBonusId };
}

// --- MARKET RENDER ---
function renderPraedictions(filteredData) {
    const container = DOM.praedictionsContainer; if (!container) return;
    const data = filteredData || currentPredictions;
    const filtered = data.filter(p => { if (currentFilter.category !== 'all' && p.category !== currentFilter.category) return false; if (currentFilter.search && !p.title.toLowerCase().includes(currentFilter.search.toLowerCase())) return false; if (currentFilter.status === 'active') return p.status === 'active'; if (currentFilter.status === 'expired') return p.status === 'expired'; if (currentFilter.status === 'resolved') return p.status === 'resolved'; return true; });
    if (filtered.length === 0) { container.innerHTML = '<div style="text-align:center;padding:40px;grid-column:1/-1;">No praedictions match filters.</div>'; return; }
    const isOracle = (walletAddress === ORACLE_WALLET);
    container.innerHTML = filtered.map(p => {
        const active = p.status==='active'; const resolved = p.status==='resolved'; const expired = p.status==='expired';
        const isChallenge = p.id === cachedSpecialIds.dailyChallengeId && active;
        const isHot = p.id === cachedSpecialIds.hotTopicId && active;
        const isMystery = p.id === cachedSpecialIds.mysteryBonusId && active;
        const isWeekly = p.id === cachedSpecialIds.weeklyId && active;
        const isControversy = p.id === cachedSpecialIds.controversyId && active;
        const isFlash = p.id === cachedSpecialIds.flashId && active;
        const deadline = p.resolution_date ? formatDateWithoutSeconds(p.resolution_date) : 'No deadline';
        const countdown = active && p.resolution_date ? (()=>{ const now=new Date(); const end=new Date(p.resolution_date); const diff=end-now; if(diff<=0) return 'Expired'; const h=Math.floor(diff/3600000); const m=Math.floor((diff%3600000)/60000); return h>0?`${h}h ${m}m`:`${m}m`; })() : '';
        const market = getMarket(p.id);
        const yesPrice = getYesPrice(market.yesPool, market.noPool);
        const noPrice = 1 - yesPrice;
        const hasVoted = walletAddress && (p.bets||[]).some(b=>b.user===walletAddress);
        const canSuggest = active && walletAddress && new Date(p.resolution_date) <= new Date();
        const hasSuggested = (p.suggestions||[]).some(s=>s.user===walletAddress);
        const canResolve = expired && isOracle;
        let badgeClass = 'badge-active', badgeText = 'ACTIVE';
        if (isFlash) { badgeClass = 'badge-flash'; badgeText = '⚡ FLASH PREDICTION'; }
        else if (isChallenge) { badgeClass = 'badge-challenge'; badgeText = '⚡ DAILY CHALLENGE'; }
        else if (isMystery) { badgeClass = 'badge-mystery'; badgeText = '🎁 MYSTERY BONUS'; }
        else if (isWeekly) { badgeClass = 'badge-challenge'; badgeText = '🏆 WEEKLY PICK'; }
        else if (isHot) { badgeClass = 'badge-active'; badgeText = '🔥 HOT TOPIC'; }
        else if (isControversy) { badgeClass = 'badge-controversy'; badgeText = '⚡ MOST CONTROVERSIAL'; }
        if (resolved) { badgeClass='badge-resolved'; badgeText='RESOLVED'; }
        if (expired && !isHot && !isChallenge) { badgeClass='badge-expired'; badgeText='EXPIRED'; }
        const catIcon = categoryIcons[p.category]||'📁'; let displayCat = p.category === 'crypto' ? 'Finance' : p.category;
        const reactions = p.reactions || []; const grouped = {}; reactions.forEach(r => { const e = r.emoji; grouped[e] = (grouped[e]||0)+1; });
        const reactionDisplay = Object.entries(grouped).map(([emoji,count]) => `${escapeHtml(emoji)} ${count}`).join(' ');
        const shareUrl = `${window.location.origin}${window.location.pathname}#pred-${p.id}`;
        return `<div class="praediction-card ${isChallenge ? 'challenge-card' : ''} ${isHot ? 'hot-topic' : ''} ${isMystery ? 'mystery-box' : ''} ${isControversy ? 'controversy' : ''} ${isFlash ? 'flash-prediction' : ''}">
            <div class="praediction-title">${escapeHtml(p.title)}</div>
            <div class="praediction-desc">${escapeHtml(p.description)}</div>
            <div class="meta-row">
                <span><span class="category-icon">${catIcon}</span> ${escapeHtml(displayCat)}</span>
                <span>📅 ${escapeHtml(deadline)} ${countdown ? `<span class="countdown">(${countdown})</span>` : ''}</span>
                <span class="badge ${badgeClass}">${escapeHtml(badgeText)}</span>
            </div>
            <div class="vote-stats">
                <span>✅ YES: ${yesPrice.toFixed(4)} PRAE</span>
                <span>❌ NO: ${noPrice.toFixed(4)} PRAE</span>
            </div>
            ${active ? `<div class="action-buttons" style="align-items:center;">
                <input type="number" class="buy-amount" id="amount-${p.id}" value="10" min="1" step="1" style="width:70px; background:var(--input-bg); border:1px solid var(--input-border); border-radius:40px; padding:8px; color:var(--text);">
                <button class="btn-praedict buy-btn" data-id="${p.id}" data-outcome="yes"><span>Buy YES</span><span class="loader" style="display:none;"></span></button>
                <button class="btn-praedict buy-btn" data-id="${p.id}" data-outcome="no"><span>Buy NO</span><span class="loader" style="display:none;"></span></button>
                <button class="btn-suggest oracle-decide" data-id="${p.id}"><span>🦉 Let the Oracle decide</span></button>
                ${canSuggest ? `<button class="btn-suggest" data-id="${p.id}" ${hasSuggested?'disabled':''}><span>🗳️ Suggest</span><span class="loader" style="display:none;"></span></button>` : ''}
            </div>` : `<div style="text-align:center;margin-top:12px;">🏆 ${resolved ? `RESOLVED: ${p.resolved_outcome==='yes'?'✅ YES':'❌ NO'}` : '🕒 EXPIRED - awaiting resolution'}</div>`}
            <div style="margin-top:8px; font-size:.7rem; color:var(--text-muted);">
                Potential payout: <span id="payout-${p.id}">${(10 / yesPrice).toFixed(2)} YES</span>
            </div>
            ${active ? `<div class="reaction-bar">
                <button class="reaction-btn react-btn" data-id="${p.id}" data-emoji="🔥">🔥</button>
                <button class="reaction-btn react-btn" data-id="${p.id}" data-emoji="😱">😱</button>
                <button class="reaction-btn react-btn" data-id="${p.id}" data-emoji="🤔">🤔</button>
                <button class="reaction-btn react-btn" data-id="${p.id}" data-emoji="👀">👀</button>
                <button class="share-btn" data-url="${shareUrl}">🔗 Share</button>
            </div>` : ''}
            ${reactionDisplay ? `<div style="margin-top:4px; font-size:.8rem;">${reactionDisplay}</div>` : ''}
            ${(p.suggestions||[]).length>0 && isOracle ? `<div class="suggestions-list"><strong>📢 Seer Suggestions:</strong>
                ${p.suggestions.map(s => `<div class="suggestion-item">
                    <div>${escapeHtml(s.user.slice(0,6))}... suggests <strong>${escapeHtml(s.outcome.toUpperCase())}</strong></div>
                    <div>Evidence: <a href="${encodeURI(s.evidence)}" target="_blank">link</a></div>
                    <button class="oracle-resolve" data-id="${p.id}" data-outcome="${s.outcome}"><span>✅ Approve</span><span class="loader" style="display:none;"></span></button>
                </div>`).join('')}
            </div>` : ''}
            ${canResolve ? `<div style="margin-top:12px;display:flex;gap:8px;">
                <button class="oracle-resolve" data-id="${p.id}" data-outcome="yes"><span>✅ YES</span><span class="loader" style="display:none;"></span></button>
                <button class="oracle-resolve" data-id="${p.id}" data-outcome="no"><span>❌ NO</span><span class="loader" style="display:none;"></span></button>
            </div>` : ''}
        </div>`;
    }).join('');

    // Event listeners for buy buttons and amount inputs
    container.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', buyClick);
    });
    container.querySelectorAll('.buy-amount').forEach(input => {
        input.addEventListener('input', updatePayout);
    });
}

function updatePayout(e) {
    const id = e.target.id.split('-')[1];
    const amount = parseFloat(e.target.value) || 1;
    const market = getMarket(id);
    const price = getYesPrice(market.yesPool, market.noPool);
    const payout = (amount / price).toFixed(2);
    const el = document.getElementById(`payout-${id}`);
    if (el) el.textContent = `${payout} YES`;
}

async function buyClick(e) {
    if (actionCooldown) return;
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    const outcome = btn.dataset.outcome;
    const amountInput = document.getElementById(`amount-${id}`);
    const amount = parseFloat(amountInput?.value) || 1;
    if (amount <= 0) return showToast("Enter a valid amount.");
    const price = outcome === 'yes' ? getYesPrice(getMarket(id).yesPool, getMarket(id).noPool) : 1 - getYesPrice(getMarket(id).yesPool, getMarket(id).noPool);
    if (userPRAEBalance < amount * price) return showToast("Insufficient PRAE balance.");
    actionCooldown = true;
    setLoading(btn, true);
    try {
        const { cost, shares } = buyShares(id, outcome, amount);
        playSound('vote');
        showToast(`Bought ${shares} ${outcome.toUpperCase()} shares for ${cost.toFixed(2)} PRAE.`);
        await refreshAll();
    } catch (err) { showToast(err.message); }
    finally { setLoading(btn, false); actionCooldown = false; }
}

// --- OTHER RENDER FUNCTIONS (unchanged) ---
async function renderLeaderboard(period = 'all', category = null) {
    leaderboardPeriod = period; const data = await loadLeaderboard(period, category); const container = DOM.leaderboardList; if (!container) return;
    const currentUserRow = data.findIndex(u => u.address === walletAddress); const prevUserRow = previousLeaderboard.findIndex(u => u.address === walletAddress); previousLeaderboard = data;
    container.innerHTML = data.map((u,i) => { const name = u.display_name || `${u.address.slice(0,6)}...${u.address.slice(-4)}`; const avatar = u.avatar || ''; const glowClass = (u.address === walletAddress && prevUserRow !== -1 && i < prevUserRow) ? 'leaderboard-glow' : ''; return `<div class="${glowClass}" style="display:flex;justify-content:space-between;padding:8px;"><div>${i+1}. ${avatar} ${escapeHtml(name)}</div><div>👁️ ${u.seerscore}</div></div>`; }).join('');
    const { data: seer } = await supabaseClient.rpc('get_seer_of_the_day'); if (seer && DOM.seerOfTheDay) { const seerName = seer.display_name || `${seer.slice(0,6)}...${seer.slice(-4)}`; DOM.seerOfTheDay.innerHTML = `👁️ Seer of the Day: ${seerName}`; }
    const spotlightUser = data[Math.floor(Math.random() * data.length)];
    if (spotlightUser) {
        const spotlightName = spotlightUser.display_name || `${spotlightUser.address.slice(0,6)}...${spotlightUser.address.slice(-4)}`;
        const old = document.getElementById('seerSpotlight'); if (old) old.remove();
        const div = document.createElement('div'); div.id = 'seerSpotlight'; div.className = 'seer-spotlight'; div.innerHTML = `🌟 Seer Spotlight: ${spotlightName} – shines brightly today!`;
        container.appendChild(div);
    }
}
async function renderHallOfFame() { const predictions = await loadHallOfFame(); if (!DOM.hallOfFameList) return; DOM.hallOfFameList.innerHTML = predictions.map((p, i) => { const correctVotes = (p.bets||[]).filter(b => b.outcome === p.resolved_outcome).length; const totalVotes = (p.bets||[]).length; const accuracy = totalVotes ? ((correctVotes / totalVotes) * 100).toFixed(0) : 0; return `<div class="praediction-card hall-of-fame" style="margin-bottom:12px;"><div class="praediction-title">#${i+1} – ${escapeHtml(p.title)}</div><div class="meta-row"><span>✅ Resolved: ${p.resolved_outcome.toUpperCase()}</span><span>Correct Votes: ${correctVotes}/${totalVotes} (${accuracy}%)</span></div></div>`; }).join(''); }

async function renderProfile(userData = null) {
    if (!walletAddress) return; const user = userData || await loadUser(walletAddress); if (!user) { DOM.profileStats.innerHTML = '<div>User not found.</div>'; return; }
    const displayName = user.display_name || `${walletAddress.slice(0,8)}...${walletAddress.slice(-6)}`; const avatar = user.avatar || ''; const title = getProphetTitle(user.seerscore || 0);
    DOM.walletDisplay.innerHTML = `${avatar} ${escapeHtml(displayName)} <span style="color:var(--accent); font-size:.7rem;">[${title}]</span>`;
    const hasName = user.display_name && user.display_name.trim() !== ''; const hasAvatar = user.avatar && user.avatar.trim() !== '';
    if (DOM.profileNameSection) { DOM.profileNameSection.style.display = (hasName && hasAvatar) ? 'none' : 'flex'; }
    const baseVotes = 77 + (user.permanent_votes_bonus || 0); const baseCreations = 77 + (user.permanent_creations_bonus || 0);
    const votesLeft = user.votes_left ?? baseVotes; const creationsLeft = baseCreations - (user.creations_today || 0);
    const accuracy = ((user.correct_votes||0)/((user.total_votes||1))*100).toFixed(0); const reactionStreak = user.reaction_streak || 0;
    const streakBadge = reactionStreak >= 3 ? ' ✨Reaction Streak!' : '';
    let streakFreezeIcon = ''; if (user.streak_freeze_available) { streakFreezeIcon = ' ❄️ Freeze available'; }
    updateStreakRewards(user.streak); updateStreakStory(user.streak);
    let praeNotice = '';
    if (userPRAEBalance < 777) {
        praeNotice = `<div class="prae-notice">⚠️ You hold less than 777 PRAE. Voting and creating are still allowed, but consider topping up!</div>`;
    }
    DOM.profileStats.innerHTML = `<div><span style="color:var(--accent);">💰 PRAE Balance:</span> ${userPRAEBalance.toFixed(2)}</div><div><span style="color:var(--accent);">✨ Creations left:</span> ${creationsLeft}/${baseCreations}</div><div><span style="color:var(--accent);">🗳️ Votes left:</span> ${votesLeft}/${baseVotes}</div><div><span style="color:var(--accent);">🎯 Accuracy:</span> ${accuracy}%</div><div><span style="color:var(--accent);">👁️ Seerscore:</span> ${user.seerscore||0}</div>${streakBadge ? `<div style="color:var(--accent);">${streakBadge}</div>` : ''}${streakFreezeIcon ? `<div style="color:var(--accent);">${streakFreezeIcon}</div>` : ''}${praeNotice}`;
    DOM.referralLink.textContent = `${window.location.origin}${window.location.pathname}?ref=${walletAddress}`;
    if (DOM.dailyDigest) { DOM.dailyDigest.innerHTML = `📊 Yesterday: you voted on ${user.total_votes||0} predictions, earned ${user.seerscore||0} SeerScore, and are a ${title}!`; }
    const moon = getLunarPhase(); if (DOM.lunarPhase) DOM.lunarPhase.innerHTML = `${moon.emoji} ${moon.name}`;
    const hasZodiac = user.zodiac && user.zodiac.trim() !== ''; if (DOM.zodiacSelectorWrapper) { DOM.zodiacSelectorWrapper.style.display = hasZodiac ? 'none' : 'flex'; }
    if (hasZodiac) { DOM.userZodiacDisplay.style.display = 'block'; DOM.userZodiacDisplay.textContent = signSymbols[user.zodiac] || ''; const horo = await fetchHoroscopeForZodiac(user.zodiac); if (horo) { DOM.zodiacRealHeadline.style.display = 'block'; DOM.zodiacHoroscopeDisplay.innerHTML = `${escapeHtml(horo.description)}<br><br>🍀 Lucky: ${horo.luckyNumber}<br>😌 ${horo.mood}`; } else DOM.zodiacHoroscopeDisplay.textContent = '⚡ Could not fetch horoscope.'; } else { DOM.userZodiacDisplay.style.display = 'none'; DOM.zodiacRealHeadline.style.display = 'none'; DOM.zodiacHoroscopeDisplay.textContent = ''; }
    DOM.displayNameInput.value = user.display_name || ''; DOM.avatarSelect.value = user.avatar || '';
    const isOracle = walletAddress === ORACLE_WALLET; DOM.oracleIndicatorTop.style.display = isOracle ? 'inline-flex' : 'none'; DOM.oracleIndicatorProfile.style.display = isOracle ? 'inline-block' : 'none';
    const milestones = [7,14,30,365]; const lastStreakCelebrated = parseInt(localStorage.getItem('lastStreakCelebrated') || '0');
    if (milestones.includes(user.streak) && user.streak > lastStreakCelebrated) {
        streakGlow(); playSound('milestone');
        let msg = ''; if (user.streak === 7) msg = '🔥 7 days! A full week of foresight! You receive a Streak Gift of +3 votes!';
        else if (user.streak === 14) msg = '🔥 Two weeks! The Oracle smiles upon you.'; else if (user.streak === 30) msg = '🔥 One month! Your wisdom grows.'; else if (user.streak === 365) msg = '🎂 Happy Seer Birthday! A full year!';
        showToast(msg); localStorage.setItem('lastStreakCelebrated', user.streak);
    }
}

function updateCrowdBar() { const totalYes = currentPredictions.filter(p=>p.status==='active').reduce((s,p)=>s+(p.betting_pool_yes||0),0); const totalNo = currentPredictions.filter(p=>p.status==='active').reduce((s,p)=>s+(p.betting_pool_no||0),0); const total = totalYes+totalNo; DOM.crowdYes.textContent = total ? `${Math.round(totalYes/total*100)}%` : '50%'; }

async function refreshAll() {
    const [predictions, leaderboard] = await Promise.all([loadPredictions(), loadLeaderboard(leaderboardPeriod, DOM.leaderboardCategoryFilter?.value || null)]);
    currentPredictions = predictions;
    computeSpecialIds(predictions);
    renderPraedictions(predictions); renderLeaderboard(leaderboardPeriod, DOM.leaderboardCategoryFilter?.value || null);
    const user = await loadUser(walletAddress); await renderProfile(user); updateStats(); updateCrowdBar(); if (user && DOM.totalSeerscore) DOM.totalSeerscore.textContent = user.seerscore||0;
    const totalBet = Object.values(mockMarkets).reduce((sum, m) => sum + (m.yesPool + m.noPool - 2000), 0);
    DOM.totalPraedicts.textContent = totalBet.toFixed(0);
}

function updateStats() { const active = currentPredictions.filter(p=>p.status==='active').length; const totalVotes = currentPredictions.reduce((s,p)=>s+(p.bets?.length||0),0); DOM.totalActive.textContent = active; DOM.totalPraedicts.textContent = totalVotes; }

function initTheme() { const saved = localStorage.getItem('praedicta_theme'); if (saved === 'light') document.body.classList.add('light'); else if (saved === 'dark') document.body.classList.remove('light'); else if (window.matchMedia('(prefers-color-scheme: light)').matches) document.body.classList.add('light'); }
function toggleTheme() { document.body.classList.toggle('light'); localStorage.setItem('praedicta_theme', document.body.classList.contains('light')?'light':'dark'); }
function handleMouseMove(e) { const eyes = document.querySelectorAll('.eye'); eyes.forEach(eye => { const rect = eye.getBoundingClientRect(); const eyeCenterX = rect.left + rect.width/2; const eyeCenterY = rect.top + rect.height/2; const angle = Math.atan2(e.clientY - eyeCenterY, e.clientX - eyeCenterX); const distance = Math.min(10, Math.hypot(e.clientX - eyeCenterX, e.clientY - eyeCenterY) / 10); const pupil = eye.querySelector('.pupil'); if (pupil) { pupil.style.transform = `translate(${Math.cos(angle)*distance}px, ${Math.sin(angle)*distance}px)`; } }); }
document.addEventListener('mousemove', handleMouseMove);

async function connectWallet() {
    if (!DOM.ageCheckbox.checked) { showToast("Confirm age and Terms"); return; }
    if (!window.solana) { alert("Install Phantom"); return; }
    setLoading(DOM.connectBtn, true);
    try {
        await window.solana.connect({ onlyIfTrusted: false }); walletAddress = window.solana.publicKey.toString();
        const result = await loginBonus(); const rewards = result.data;
        if (result.token) { sessionToken = result.token; sessionExpiresAt = new Date(result.expiresAt).getTime(); }
        if (rewards && (rewards.creations_bonus > 0 || rewards.votes_bonus > 0)) { const msg = rewards.message || 'Welcome back, Seer!'; const detail = []; if (rewards.creations_bonus) detail.push(`+${rewards.creations_bonus} creation(s)`); if (rewards.votes_bonus) detail.push(`+${rewards.votes_bonus} vote(s)`); showOverlay(`${msg}\nYou earned: ${detail.join(', ')}`); }
        const urlParams = new URLSearchParams(window.location.search); const ref = urlParams.get('ref');
        if (ref && ref !== walletAddress) { try { await callSecureRpc('process_referral', { referrer: ref }); } catch(e) {} }
        oracleAsked = false; if (DOM.askOracleBtn) DOM.askOracleBtn.disabled = false; if (DOM.oracleLimit) DOM.oracleLimit.textContent = "You may ask once per login."; DOM.oracleAnswer.textContent = "";
        DOM.gate.style.display = 'none'; DOM.mainApp.style.display = 'block'; cacheDOM(); DOM.disconnectBtn.style.display = 'inline-block';
        if (!localStorage.getItem('tutorialShown')) { DOM.tutorialOverlay.style.display = 'flex'; localStorage.setItem('tutorialShown','true'); }
        await refreshAll();
    } catch(err) { if (err.message?.includes('User rejected')) showToast("Connection cancelled."); else showToast("Connection failed: "+err.message); } finally { setLoading(DOM.connectBtn, false); }
}

function showOverlay(text) { const overlay = document.createElement('div'); overlay.className = 'overlay-message'; overlay.textContent = text; document.body.appendChild(overlay); setTimeout(() => overlay.remove(), 5000); }

function disconnectWallet() {
    if (window.solana?.disconnect) window.solana.disconnect(); walletAddress = null;
    DOM.mainApp.style.display = 'none'; DOM.gate.style.display = 'flex'; DOM.disconnectBtn.style.display = 'none'; currentPredictions = [];
    clearInterval(voiceInterval); clearInterval(freezeInterval); clearInterval(emojiInterval);
    sessionToken = null; sessionExpiresAt = null;
}

function setupEyeEasterEgg() { [DOM.logoEye, DOM.gateEye].forEach(eye => { if (!eye) return; eye.addEventListener('click', () => { eyeClickCount++; if (eyeClickCount === 5) { eyeClickCount = 0; playSound('gong'); showToast("👁️ The Oracle awakens…"); triggerConfetti(); } }); }); }
setupEyeEasterEgg();

DOM.filterSearch?.addEventListener('input', e => { clearTimeout(searchDebounce); searchDebounce = setTimeout(() => { currentFilter.search = e.target.value; renderPraedictions(); }, 200); });

document.querySelectorAll('.category-carousel-btn').forEach(btn => { btn.addEventListener('click', () => { document.querySelectorAll('.category-carousel-btn').forEach(b => b.classList.remove('active-filter')); btn.classList.add('active-filter'); currentFilter.category = btn.dataset.category; renderPraedictions(); }); });
DOM.leaderboardCategoryFilter?.addEventListener('change', async (e) => { const cat = e.target.value || null; await renderLeaderboard(leaderboardPeriod, cat); });

DOM.themeToggleSmall?.addEventListener('click', toggleTheme); initTheme();
DOM.connectBtn?.addEventListener('click', connectWallet); DOM.disconnectBtn?.addEventListener('click', disconnectWallet);
document.getElementById('closeTutorialBtn')?.addEventListener('click', ()=>DOM.tutorialOverlay.style.display='none');

DOM.createBtn?.addEventListener('click', async () => {
    const title = DOM.title.value.trim(), desc = DOM.description.value.trim(); const cat = DOM.category.value, date = DOM.resolutionDate.value; const auto = DOM.autoSource.value, target = DOM.targetValue.value.trim();
    if (!title||!desc||!date) return showToast("Fill all fields"); if (title.length>200) return showToast("Title too long"); if (desc.length>1000) return showToast("Description too long");
    const min = new Date(); min.setHours(min.getHours()+24); if (new Date(date) < min) return showToast("Date must be ≥24h from now");
    setLoading(DOM.createBtn, true);
    try { await createPredictionAtomic(title, desc, cat, date, auto, target); playSound('create'); showToast("✨ Created! " + randomCompliment()); DOM.title.value = DOM.description.value = DOM.resolutionDate.value = DOM.targetValue.value = ''; DOM.autoSource.value = ''; await refreshAll(); } catch(e) { showToast(e.message); } finally { setLoading(DOM.createBtn, false); }
});

DOM.copyReferralBtn?.addEventListener('click', () => { const link = DOM.referralLink?.textContent; if (link) { navigator.clipboard.writeText(link); showToast("Copied!"); } });
DOM.donateBtn?.addEventListener('click', ()=>window.open('https://ko-fi.com/yourusername','_blank'));
DOM.saveZodiacBtn?.addEventListener('click', async ()=>{ const sign = DOM.zodiacSelect.value; if (!sign) return; setLoading(DOM.saveZodiacBtn, true); try { await saveZodiac(sign); showToast("Zodiac saved!"); await renderProfile(); } catch(e) { showToast(e.message); } finally { setLoading(DOM.saveZodiacBtn, false); } });
DOM.saveProfileBtn?.addEventListener('click', async () => { const name = DOM.displayNameInput.value.trim(); const avatar = DOM.avatarSelect.value; if (!name && !avatar) return showToast("Enter a name or choose an avatar"); setLoading(DOM.saveProfileBtn, true); try { await updateProfile(name || null, avatar || null); showToast("Profile updated!"); await refreshAll(); } catch(e) { showToast(e.message); } finally { setLoading(DOM.saveProfileBtn, false); } });
DOM.showMyPraedictionsBtn?.addEventListener('click', ()=>{ const c = DOM.myPraedictionsList; if (c.style.display==='none'||!c.style.display) { const myBets = currentPredictions.flatMap(p=>(p.bets||[]).filter(b=>b.user===walletAddress).map(b=>({...p,userBet:b}))); c.innerHTML = myBets.length ? myBets.map(p=>`<div style="background:var(--card-bg);border-radius:12px;padding:12px;margin-bottom:8px;"><strong>${escapeHtml(p.title)}</strong>: ${escapeHtml(p.userBet.outcome.toUpperCase())} • ${escapeHtml(p.status)}</div>`).join('') : 'No praedictions.'; c.style.display = 'block'; } else c.style.display = 'none'; });

DOM.flipCoinBtn?.addEventListener('click', async () => { if (actionCooldown) return; actionCooldown = true; setLoading(DOM.flipCoinBtn, true); try { const result = await flipCoin(); if (result.data && result.data.win) { const type = result.data.type === 'vote' ? 'vote(s)' : 'creation(s)'; showToast(`🪙 You won! +${result.data.amount} extra ${type} added today.`); playSound('vote'); } else { showToast('🪙 Better luck next time.'); } await refreshAll(); } catch(e) { showToast(e.message); } finally { setLoading(DOM.flipCoinBtn, false); actionCooldown = false; } });

document.querySelectorAll('.status-filter-btn').forEach(b => { b.addEventListener('click', ()=>{ document.querySelectorAll('.status-filter-btn').forEach(x=>x.classList.remove('active-filter')); b.classList.add('active-filter'); currentFilter.status = b.dataset.status; renderPraedictions(); }); });
document.querySelectorAll('.tab-btn').forEach(btn => { btn.addEventListener('click', async ()=>{ const tab = btn.dataset.tab; document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active')); document.getElementById(`tab-${tab}`).classList.add('active'); if (tab==='profile') await renderProfile(); else if (tab==='leaderboard') await renderLeaderboard(leaderboardPeriod, DOM.leaderboardCategoryFilter?.value || null); else if (tab==='halloffame') await renderHallOfFame(); }); });
document.querySelectorAll('#tab-leaderboard .status-filter-btn').forEach(btn => { btn.addEventListener('click', async ()=>{ document.querySelectorAll('#tab-leaderboard .status-filter-btn').forEach(b=>b.classList.remove('active-filter')); btn.classList.add('active-filter'); const period = btn.dataset.period; await renderLeaderboard(period, DOM.leaderboardCategoryFilter?.value || null); }); });
document.querySelectorAll('a[id^="termsLink"], a[id^="privacyLink"], a[id^="imprintLink"]').forEach(link => { link.addEventListener('click', e=>{ e.preventDefault(); alert('Legal document placeholder.'); }); });
document.getElementById('deleteAccountLink')?.addEventListener('click', async e => { e.preventDefault(); if (!confirm("Permanently delete all your data?")) return; setLoading(e.target, true); try { await deleteUserData(); showToast("Account deleted. Reloading..."); localStorage.clear(); window.location.reload(); } catch(err) { showToast("Deletion failed: "+err.message); } finally { setLoading(e.target, false); } });

for (let i=0; i<30; i++) { const p = document.createElement('div'); p.className = 'particle'; p.style.left = Math.random()*100+'%'; p.style.animationDuration = (15+Math.random()*20)+'s'; p.style.animationDelay = Math.random()*15+'s'; DOM.particlesContainer.appendChild(p); }

if (window.solana?.isConnected) setTimeout(()=>DOM.connectBtn?.click(), 100);

// --- SERVICE WORKER REGISTRATION ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => console.log('SW registered:', registration.scope))
      .catch(err => console.error('SW failed:', err));
  });
}
