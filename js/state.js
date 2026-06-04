// ============================================================
// PRAEDICTA – Application State
// ============================================================

let walletAddress = null;
let walletPublicKey = null;
let currentPredictions = [];
let actionCooldown = false;
let currentFilter = { category: 'all', status: 'active', search: '', sort: 'newest', tags: [] };
let sessionHoroscopeCache = {};
let leaderboardPeriod = 'all';
let searchDebounce;
let sessionToken = null;
let sessionExpiresAt = null;
let userPRAEBalance = CONFIG.DEFAULT_BALANCE;
let useRealMarket = false;
let previousLeaderboard = [];
let blindVotingEnabled = false;
let creatorBetOutcome = null;
let predictionsOffset = 0;
const PREDICTIONS_PER_PAGE = 50;
let betDisplayLimits = {};
const BETS_PER_CARD = 5;
let expandedCards = {};
let showOrderBook = {};

let analyticsData = { bets: 0, creations: 0, flips: 0 };
let surpriseDropAvailable = false;
let lastSurpriseCheck = null;
let onlineUsers = 0;
let recentBetsCount = 0;
let portfolioCache = null;
let portfolioCacheTime = 0;

let notifications = [];
let unreadNotifs = 0;
const MAX_NOTIFS = 50;

let previousPrices = {};
let cancelledOrders = [];
let orderIdempotencyKeys = {};
let pendingRetries = [];
let retryInterval = null;
const MAX_RETRIES = 5;
const RETRY_BACKOFF = [1000, 2000, 4000, 8000, 16000];
let balanceVerifiedAt = 0;
const BALANCE_VERIFY_INTERVAL = 30000;

let sessionWarningShown = false;
let priceAlerts = [];
let gamePacks = [];
let userInventory = {};
let crossTabChannel = null;

let renderCache = {};
let lastRenderHash = '';
let consolidatedInterval = null;
let orderBookCache = {};
let orderBookCacheTime = {};
const ORDER_BOOK_CACHE_DURATION = 15000;
let localStorageDirty = false;
let domQueryCache = {};
let prefetchPromise = null;
let dailyChallengeCompleted = false;
let dailyChallengeStreak = 0;

try {
    const savedAlerts = localStorage.getItem('praedicta_price_alerts');
    if (savedAlerts) priceAlerts = JSON.parse(savedAlerts);
} catch(e) {}
try {
    const savedInventory = localStorage.getItem('praedicta_inventory');
    if (savedInventory) userInventory = JSON.parse(savedInventory);
    try {
    const saved = localStorage.getItem('prae_daily_challenge');
    if (saved) {
        const data = JSON.parse(saved);
        if (data.date === getUTCDayKey()) {
            dailyChallengeCompleted = data.completed || false;
            dailyChallengeStreak = data.streak || 0;
        }
    }
    
} catch(e) {}

