// ============================================================
// PRAEDICTA – Application State
// ============================================================

var walletAddress = null;
var walletPublicKey = null;
var currentPredictions = [];
var actionCooldown = false;
var currentFilter = { category: 'all', status: 'active', search: '', sort: 'newest', tags: [] };
var sessionHoroscopeCache = {};
var leaderboardPeriod = 'all';
var searchDebounce;
var sessionToken = null;
var sessionExpiresAt = null;
var userPRAEBalance = (typeof CONFIG !== 'undefined') ? CONFIG.DEFAULT_BALANCE : 1000;
var useRealMarket = false;
var previousLeaderboard = [];
var blindVotingEnabled = false;
var creatorBetOutcome = null;
var predictionsOffset = 0;
var PREDICTIONS_PER_PAGE = 50;
var betDisplayLimits = {};
var BETS_PER_CARD = 5;
var expandedCards = {};
var showOrderBook = {};

var analyticsData = { bets: 0, creations: 0, flips: 0 };
var onlineUsers = 0;
var portfolioCache = null;
var portfolioCacheTime = 0;

var notifications = [];
var unreadNotifs = 0;
var MAX_NOTIFS = 50;

var previousPrices = {};
var cancelledOrders = [];
var orderIdempotencyKeys = {};
var pendingRetries = [];
var retryInterval = null;
var MAX_RETRIES = 5;
var RETRY_BACKOFF = [1000, 2000, 4000, 8000, 16000];
var balanceVerifiedAt = 0;
var BALANCE_VERIFY_INTERVAL = 30000;

var sessionWarningShown = false;
var priceAlerts = [];
var userInventory = {};
var crossTabChannel = null;

var consolidatedInterval = null;
var orderBookCache = {};
var orderBookCacheTime = {};
var ORDER_BOOK_CACHE_DURATION = 15000;
var localStorageDirty = false;
var lastRenderHash = '';
var dailyChallengeCompleted = false;
var dailyChallengeStreak = 0;

try {
    var savedAlerts = localStorage.getItem('praedicta_price_alerts');
    if (savedAlerts) priceAlerts = JSON.parse(savedAlerts);
} catch(e) {}
try {
    var savedInventory = localStorage.getItem('praedicta_inventory');
    if (savedInventory) userInventory = JSON.parse(savedInventory);
} catch(e) {}
try {
    var saved = localStorage.getItem('prae_daily_challenge');
    if (saved) {
        var data = JSON.parse(saved);
        if (data.date === getUTCDayKey()) {
            dailyChallengeCompleted = data.completed || false;
            dailyChallengeStreak = data.streak || 0;
        }
    }
} catch(e) {}
