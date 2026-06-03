// ============================================================
// PRAEDICTA – Application State
// ============================================================

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
let creatorBetOutcome = null;
let predictionsOffset = 0;
const PREDICTIONS_PER_PAGE = 50;

// Analytics tracking
let analyticsData = { bets: 0, creations: 0, flips: 0 };
