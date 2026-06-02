// ============================================================
// PRAEDICTA – Configuration & Constants
// ============================================================

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
    MAX_CACHED_MARKETS: 200
};

const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const signToNumber = { aries:1, taurus:2, gemini:3, cancer:4, leo:5, virgo:6, libra:7, scorpio:8, sagittarius:9, capricorn:10, aquarius:11, pisces:12 };
const signSymbols = { aries:"♈", taurus:"♉", gemini:"♊", cancer:"♋", leo:"♌", virgo:"♍", libra:"♎", scorpio:"♏", sagittarius:"♐", capricorn:"♑", aquarius:"♒", pisces:"♓" };
const CATEGORY_ICONS = { worldevents:"🌍", politics:"🏛️", crypto:"💰", people:"👤", sports:"⚽", wildcard:"🎲" };
const COMPLIMENTS = ["The Oracle nods approvingly.","Your insight shines!","A true Seer move.","The stars whisper your name.","Wisdom flows through you.","You move before the noise.","A praediction well made.","The crowd feels your presence.","Destiny favours the bold.","Your vote has shifted the tides."];
const ORACLE_VOICES = ["The veil is thin today…","Beware the false prophet.","A whisper from the beyond: YES.","The stars tremble.","In the shadows, a truth awaits.","The Oracle stirs…","A forgotten prediction will come true.","Patience, Seer. The answer is near.","The wind carries a warning.","A great shift is coming.","The Oracle sees all.","Your next vote may change fate.","A dark horse rises in the East.","The numbers whisper a secret.","Tonight, the moon favours the bold."];
const WEEKLY_MESSAGES = ["This week, the stars favour bold predictions.","The Oracle senses a shift in the crypto winds.","A quiet week for world events – but a wildcard may surprise you.","The moon waxes full this week. Your intuition will be at its peak.","A dark horse rises. Keep your eyes on the underdog.","The Oracle sees a great reveal coming. Be ready.","Patience, Seer. The biggest truths reveal themselves slowly.","This week, the veil between worlds is thin.","Beware of false patterns. The noise will try to mislead you.","A week of clarity. The answers you seek are already within."];
const HYPE_MESSAGES = ["🔥 The crowd is heating up!","👁️ A new Seer rises...","⚡ Flash prediction trending!","🌙 The moon guides the market...","💫 Wisdom flows through the collective...","🎯 The sharpest Seers are here!","🌟 A legend is being written..."];
const ORACLE_ANSWERS = ["The stars say... yes.","The veil is unclear. Ask again tomorrow.","A definite no awaits.","The Oracle sees great potential.","Beware - the path is treacherous.","The answer lies within you.","Signs point to a glorious yes.","The future is murky on this one.","All signs align – absolutely yes.","The Oracle remains silent on this matter."];
const STREAK_STORIES = { 0:"Begin your journey, Seer...", 1:"Day 1: The Oracle watches.", 3:"Day 3: Your vision grows clearer.", 7:"Day 7: The Oracle smiles upon you. 🎁 Gift unlocked!", 14:"Day 14: A true Prophet emerges!", 30:"Day 30: Legendary status approaches...", 60:"Day 60: You are one with the Oracle.", 100:"Day 100: Immortalized in the Hall of Fame." };
const PROPHET_TITLES = [{ min:1000, title:'Oracle', emoji:'🦉' },{ min:500, title:'Prophet', emoji:'🔮' },{ min:250, title:'High Seer', emoji:'👁️‍🗨️' },{ min:100, title:'Seer', emoji:'👁️' },{ min:25, title:'Acolyte', emoji:'📿' },{ min:0, title:'Novice', emoji:'🌱' }];
