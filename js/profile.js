// ============================================================
// PRAEDICTA – Profile, Leaderboard & Data Loading (profile.js) - FINAL
// (No zodiac selector, no display name input – handled during registration)
// ============================================================

// Helper for retrying failed requests
async function fetchWithRetry(fn, retries = 2, delay = 1000) {
    for (let i = 0; i <= retries; i++) {
        try { return await fn(); } catch (e) { if (i === retries) throw e; await new Promise(r => setTimeout(r, delay)); }
    }
}

async function loadPredictions() {
    try {
        return await fetchWithRetry(async () => {
            const { data, error } = await supabaseClient.from('predictions')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            if (error) throw error;
            return data || [];
        });
    } catch (err) {
        console.error('Load predictions error:', err);
        showToast('Failed to load predictions.', 'error');
        return [];
    }
}

async function loadUser(address) {
    if (!address) return null;
    try {
        const { data } = await supabaseClient.from('users')
            .select('*')
            .eq('address', address)
            .maybeSingle();
        return data;
    } catch (err) {
        console.debug('Load user error:', err.message);
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
        console.debug('Load leaderboard error:', err.message);
        return [];
    }
}

async function loadHallOfFame() {
    try {
        const { data } = await supabaseClient.from('predictions')
            .select('id, title, resolved_outcome, bets, unresolvable')
            .eq('status', 'resolved')
            .eq('unresolvable', false)
            .order('resolved_at', { ascending: false })
            .limit(10);
        return (data || []).sort((a, b) => {
            const aC = (a.bets || []).filter(bt => bt.outcome === a.resolved_outcome).length;
            const bC = (b.bets || []).filter(bt => bt.outcome === b.resolved_outcome).length;
            return bC - aC;
        });
    } catch (err) {
        console.debug('Load hall of fame error:', err.message);
        return [];
    }
}

async function loadMorePredictions() {
    predictionsOffset += PREDICTIONS_PER_PAGE;
    try {
        const { data } = await supabaseClient.from('predictions')
            .select('*')
            .order('created_at', { ascending: false })
            .range(predictionsOffset, predictionsOffset + PREDICTIONS_PER_PAGE - 1);
        if (data && data.length > 0) {
            currentPredictions = [...currentPredictions, ...data];
            renderPraedictions();
        } else {
            if (DOM.loadMoreBtn) DOM.loadMoreBtn.style.display = 'none';
        }
    } catch (err) {
        console.debug('Load more error:', err.message);
    }
}

function updateStreakDisplay(user) {
    if (!DOM.streakRewards || !user) return;
    const streak = user.login_streak || 0;
    const bonus = streak >= 7 ? '🎁 Bonus active!' : streak >= 3 ? '🔥 Warming up!' : 'Keep going...';
    DOM.streakRewards.innerHTML = `🔥 Streak: <strong>${streak}</strong> days | Rewards: ${bonus}`;
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

// ============================================================
// HOROSCOPE FETCHING (real, with retry) – uses zodiac from user profile (if any)
// ============================================================
async function fetchHoroscopeForZodiac(sign) {
    const signToNumber = {
        aries: 1, taurus: 2, gemini: 3, cancer: 4, leo: 5, virgo: 6,
        libra: 7, scorpio: 8, sagittarius: 9, capricorn: 10, aquarius: 11, pisces: 12
    };
    const num = signToNumber[sign];
    if (!num) return null;
    try {
        const resp = await fetch(`https://www.horoscope.com/us/horoscopes/general/horoscope-general-daily-today.aspx?sign=${num}`, { headers: { "User-Agent": "Mozilla/5.0" } });
        const html = await resp.text();
        let horoscope = '';
        const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
        if (mainMatch) {
            const mainContent = mainMatch[1];
            const pMatch = mainContent.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
            if (pMatch) horoscope = pMatch[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        }
        if (!horoscope) {
            const pars = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
            if (pars) {
                for (const p of pars) {
                    const content = p.replace(/<[^>]+>/g, "").trim();
                    if (content.length > 100) { horoscope = content; break; }
                }
            }
        }
        if (horoscope) {
            const today = getUTCDayKey();
            let hash = 0;
            const seed = today + sign;
            for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i);
            const lucky = (Math.abs(hash) % 99) + 1;
            const moods = ["inspired", "focused", "calm", "energetic", "reflective", "playful", "determined", "curious"];
            const mood = moods[Math.abs(hash) % moods.length];
            return { description: horoscope, luckyNumber: lucky.toString(), mood };
        } else {
            // Fallback
            return {
                description: `The stars are aligned for ${sign}. Trust your intuition.`,
                luckyNumber: (Math.floor(Math.random() * 99) + 1).toString(),
                mood: 'optimistic'
            };
        }
    } catch (err) {
        console.warn("Horoscope fetch failed:", err);
        return {
            description: `The stars are aligned for ${sign}. Trust your intuition.`,
            luckyNumber: (Math.floor(Math.random() * 99) + 1).toString(),
            mood: 'optimistic'
        };
    }
}

// ============================================================
// RENDER PROFILE (no zodiac selector or name input – those are in registration modal)
// ============================================================
async function renderProfile(userData) {
    if (!walletAddress) return;
    const user = userData || await loadUser(walletAddress);
    if (!user) {
        if (DOM.profileStats) DOM.profileStats.innerHTML = '<div>User not found.</div>';
        return;
    }
    const displayName = user.display_name || `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`;
    const seerScore = user.seerscore || 0;
    const prophetTitle = getProphetTitle(seerScore);
    const avatarSymbol = user.avatar || '👁️';

    if (DOM.walletDisplay) {
        DOM.walletDisplay.innerHTML = `${avatarSymbol} ${escapeHtml(displayName)}`;
    }
    if (DOM.profileWalletAddress) DOM.profileWalletAddress.textContent = `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}`;
    if (DOM.profileStats) {
        DOM.profileStats.innerHTML = `
            <div><span style="color:var(--accent);">💰 Balance:</span> ${userPRAEBalance.toFixed(2)}</div>
            <div><span style="color:var(--accent);">👁️ Seerscore:</span> ${seerScore}</div>
            <div style="margin-top:8px;"><span style="color:var(--oracle-color);">${prophetTitle.emoji} Rank:</span> ${prophetTitle.title}</div>
        `;
        const allResolved = currentPredictions.filter(p => p.status === 'resolved' && !p.unresolvable);
        const myCorrect = allResolved.filter(p => {
            const b = (p.bets || []).find(bt => bt.user === walletAddress);
            return b && b.outcome === p.resolved_outcome;
        });
        const myTotal = allResolved.filter(p => (p.bets || []).some(bt => bt.user === walletAddress));
        if (myTotal.length > 0) {
            const acc = ((myCorrect.length / myTotal.length) * 100).toFixed(0);
            DOM.profileStats.innerHTML += `<div style="margin-top:4px;">🎯 Accuracy: <strong>${acc}%</strong> (${myCorrect.length}/${myTotal.length})</div>`;
        }
        const myWon = allResolved.filter(p => {
            const b = p.bets.find(bt => bt.user === walletAddress);
            return b && b.outcome === p.resolved_outcome;
        });
        const myLost = allResolved.filter(p => {
            const b = p.bets.find(bt => bt.user === walletAddress);
            return b && b.outcome !== p.resolved_outcome;
        });
        const totalWon = myWon.reduce((s, p) => s + ((p.bets || []).find(bt => bt.user === walletAddress) || {}).amount || 0, 0);
        const totalLost = myLost.reduce((s, p) => s + ((p.bets || []).find(bt => bt.user === walletAddress) || {}).amount || 0, 0);
        const profit = totalWon - totalLost;
        if (myWon.length > 0 || myLost.length > 0) {
            const pc = profit > 0 ? 'var(--accent)' : profit < 0 ? '#FF8888' : 'var(--text-muted)';
            const pi = profit > 0 ? '📈' : profit < 0 ? '📉' : '➡️';
            DOM.profileStats.innerHTML += `
                <div style="margin-top:12px;padding-top:8px;border-top:1px solid var(--accent-glow);">
                    <div style="text-align:center;"><span style="font-size:1.2rem;">${pi}</span>
                    <span style="color:${pc};font-size:1.2rem;font-weight:600;">${profit > 0 ? '+' : ''}${profit.toFixed(1)}</span></div>
                    <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:.8rem;color:var(--text-muted);">
                        <span>🏆 ${myWon.length} won</span>
                        <span>💸 ${myLost.length} lost</span>
                        <span>📊 ${myCorrect.length + myLost.length} bets</span>
                    </div>
                </div>
            `;
        }
        const myWonUnclaimed = allResolved.filter(p => {
            const b = (p.bets || []).find(bt => bt.user === walletAddress);
            return b && b.outcome === p.resolved_outcome && !p.claimed && p.payouts;
        });
        if (myWonUnclaimed.length > 0) {
            const totalUnclaimed = myWonUnclaimed.reduce((s, p) => {
                const payout = (p.payouts || []).find(pay => pay.user === walletAddress);
                return s + (payout ? payout.amount : 0);
            }, 0);
            if (totalUnclaimed > 0) {
                DOM.profileStats.innerHTML += `
                    <div style="margin-top:12px;padding:12px;background:var(--success-color);border-radius:12px;text-align:center;color:#000;">
                        <strong>💰 ${totalUnclaimed.toFixed(2)} to claim!</strong>
                        <button id="claimWinningsBtn" style="display:block;width:100%;margin-top:8px;padding:8px;border-radius:20px;background:#000;color:var(--success-color);border:none;cursor:pointer;font-weight:bold;">Claim</button>
                    </div>
                `;
                setTimeout(() => {
                    document.getElementById('claimWinningsBtn')?.addEventListener('click', async () => {
                        userPRAEBalance += totalUnclaimed;
                        saveBalance();
                        myWonUnclaimed.forEach(p => p.claimed = true);
                        showToast(`✅ Claimed ${totalUnclaimed.toFixed(2)}!`, 'success');
                        await renderProfile();
                    });
                }, 100);
            }
        }
    }
    if (DOM.dailyDigest) {
        const today = getUTCDayKey();
        const todayResolved = currentPredictions.filter(p => p.status === 'resolved' && p.resolved_at && p.resolved_at.startsWith(today) && (p.bets || []).some(bt => bt.user === walletAddress));
        if (todayResolved.length > 0) {
            const won = todayResolved.filter(p => {
                const b = p.bets.find(bt => bt.user === walletAddress);
                return b && b.outcome === p.resolved_outcome;
            });
            DOM.dailyDigest.innerHTML = `📊 Today: ${won.length}/${todayResolved.length} correct`;
            if (won.length === todayResolved.length) DOM.dailyDigest.innerHTML += '<br>🏆 Perfect day!';
        } else {
            const horo = user.zodiac ? await fetchHoroscopeForZodiac(user.zodiac) : null;
            DOM.dailyDigest.innerHTML = '📊 Yesterday: you traded wisely.';
            if (horo?.luckyNumber) DOM.dailyDigest.innerHTML += `<br>🍀 Lucky Number: <strong>${horo.luckyNumber}</strong>`;
        }
    }
    const moon = getLunarPhase();
    if (DOM.lunarPhase) DOM.lunarPhase.innerHTML = `${moon.emoji}`; // only emoji, centered via CSS
    // Zodiac display – only show if user has zodiac in DB (optional)
    const hasZodiac = !!user.zodiac;
    if (hasZodiac && DOM.userZodiacDisplay) {
        DOM.userZodiacDisplay.style.display = 'block';
        DOM.userZodiacDisplay.textContent = signSymbols[user.zodiac] || '';
    } else if (DOM.userZodiacDisplay) {
        DOM.userZodiacDisplay.style.display = 'none';
    }
    if (hasZodiac && DOM.zodiacRealHeadline && DOM.zodiacHoroscopeDisplay) {
        const horo = await fetchHoroscopeForZodiac(user.zodiac);
        if (horo) {
            DOM.zodiacRealHeadline.style.display = 'block';
            DOM.zodiacHoroscopeDisplay.innerHTML = `<div style="text-align:center;">${escapeHtml(horo.description)}<br><br>🍀 Lucky: ${horo.luckyNumber}<br>😌 ${horo.mood}</div>`;
        } else {
            DOM.zodiacRealHeadline.style.display = 'none';
            DOM.zodiacHoroscopeDisplay.innerHTML = '<div style="text-align:center;">No horoscope available</div>';
        }
    } else if (DOM.zodiacHoroscopeDisplay) {
        DOM.zodiacHoroscopeDisplay.innerHTML = '<div style="text-align:center;">Select your zodiac during registration to see your daily praediction.</div>';
    }
    updateStreakDisplay(user);
    updateStreakStory(user);
    updateFreezeTimer(user);
    updateHypeMessage();
    if (DOM.streakCalendar) renderStreakCalendar();
    await renderWatchlist();
}

async function renderWatchlist() {
    if (!DOM.watchlistContainer) return;
    if (!walletAddress) {
        DOM.watchlistContainer.innerHTML = '';
        return;
    }
    const ids = await callSecureRpc('get_watchlist', {});
    watchlist = ids.data || [];
    const predictionsOnWatchlist = currentPredictions.filter(p => watchlist.includes(p.id));
    if (predictionsOnWatchlist.length === 0) {
        DOM.watchlistContainer.innerHTML = '<div class="empty-state">No predictions in your watchlist.</div>';
        DOM.watchlistContainer.style.display = 'block';
        return;
    }
    DOM.watchlistContainer.innerHTML = '<h3 style="color:var(--accent);">⭐ Watchlist</h3>' +
        predictionsOnWatchlist.map(p => `
            <div class="praediction-card">
                <div class="praediction-title">${escapeHtml(p.title)}</div>
                <button class="watchlist-remove" data-id="${p.id}">Remove</button>
            </div>
        `).join('');
    DOM.watchlistContainer.style.display = 'block';
    document.querySelectorAll('.watchlist-remove').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = btn.dataset.id;
            await callSecureRpc('remove_watchlist', { predictionId: id });
            watchlist = watchlist.filter(i => i !== id);
            renderWatchlist();
            showToast("Removed from watchlist", 'info');
        });
    });
}

async function renderLeaderboard(period = 'all', category = null) {
    leaderboardPeriod = period;
    const container = DOM.leaderboardList;
    if (!container) return;
    const data = await loadLeaderboard(period, category);
    if (previousLeaderboard.length > 0) {
        data.forEach((entry, i) => {
            const prevIndex = previousLeaderboard.findIndex(p => p.address === entry.address);
            if (prevIndex >= 0 && prevIndex !== i) entry.positionChange = prevIndex - i;
        });
    }
    previousLeaderboard = [...data];
    container.innerHTML = data.length === 0
        ? '<div class="empty-state"><div class="empty-state-icon">🏆</div><p>No Seers yet.</p></div>'
        : data.map((u, i) => {
            const changeIcon = u.positionChange > 0 ? ' 🟢↑' : u.positionChange < 0 ? ' 🔴↓' : '';
            const displayName = u.display_name || `${(u.address || '').slice(0, 6)}...${(u.address || '').slice(-4)}`;
            const uTitle = getProphetTitle(u.seerscore || 0);
            const ad = (u.avatar_type === 'image' || (u.avatar || '').startsWith('http') || (u.avatar || '').startsWith('data:'))
                ? `<img src="${escapeHtml(u.avatar || '')}" style="width:20px;height:20px;border-radius:50%;object-fit:cover;vertical-align:middle;" alt="">`
                : (u.avatar || '');
            return `
                <div style="display:flex;justify-content:space-between;padding:8px;" class="${u.positionChange !== 0 ? 'leaderboard-glow' : ''}">
                    <div>${i + 1}. ${ad} ${uTitle.emoji} <span class="user-profile-link" data-address="${u.address}" style="cursor:pointer;color:var(--accent);">${escapeHtml(displayName)}</span>${changeIcon}</div>
                    <div>👁️ ${u.seerscore}</div>
                </div>
            `;
        }).join('');
    try {
        const { data: seer } = await supabaseClient.rpc('get_seer_of_the_day');
        if (seer && DOM.seerOfTheDay) {
            const seerTitle = getProphetTitle(seer.seerscore || 0);
            DOM.seerOfTheDay.innerHTML = `
                <div style="text-align:center;">
                    <div style="font-size:2rem;">🌟</div>
                    <div>👁️ Seer of the Day</div>
                    <div style="font-size:1.2rem;color:var(--accent);">${seerTitle.emoji} ${seer.display_name || (seer.address || '').slice(0, 6)}...</div>
                </div>
            `;
        }
    } catch (err) {
        console.debug('Seer of day error:', err.message);
    }
}

async function renderHallOfFame() {
    const container = DOM.hallOfFameList;
    if (!container) return;
    const predictions = await loadHallOfFame();
    container.innerHTML = predictions.length === 0
        ? '<div class="empty-state"><div class="empty-state-icon">🏛️</div><p>No resolved predictions yet.</p></div>'
        : predictions.map((p, i) => {
            const correct = (p.bets || []).filter(b => b.outcome === p.resolved_outcome).length;
            const total = (p.bets || []).length;
            const acc = total ? ((correct / total) * 100).toFixed(0) : 0;
            return `
                <div class="praediction-card hall-of-fame">
                    <div class="praediction-title">#${i + 1} – ${escapeHtml(p.title)}</div>
                    <div class="meta-row">
                        <span>✅ Resolved: ${(p.resolved_outcome || '').toUpperCase()}</span>
                        <span>Correct: ${correct}/${total} (${acc}%)</span>
                    </div>
                </div>
            `;
        }).join('');
}

function animateValue(el, end, duration = 600) {
    if (!el) return;
    const start = parseInt(el.textContent) || 0;
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            el.textContent = Math.round(end);
            clearInterval(timer);
        } else {
            el.textContent = Math.round(current);
        }
    }, 16);
}

async function refreshAll() {
    try {
        showSkeleton();
        predictionsOffset = 0;
        const predictions = await loadPredictions();
        currentPredictions = predictions;
        renderPraedictions();
        const user = await loadUser(walletAddress);
        await renderProfile(user);
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab?.id === 'tab-leaderboard') await renderLeaderboard(leaderboardPeriod, DOM.leaderboardCategoryFilter?.value || null);
        if (DOM.totalActive) animateValue(DOM.totalActive, predictions.filter(p => p.status === 'active').length);
        const totalBet = Object.values(mockMarkets).reduce((s, m) => s + (m.yesShares || 0) + (m.noShares || 0), 0);
        if (DOM.totalPraedicts) DOM.totalPraedicts.textContent = totalBet.toFixed(0);
        const totalVolume = Object.values(mockMarkets).reduce((s, m) => s + Math.abs((m.yesShares || 0) - 50) + Math.abs((m.noShares || 0) - 50), 0);
        if (DOM.totalVolume) DOM.totalVolume.textContent = totalVolume.toFixed(0) + getVolumeTrend(totalVolume);
        if (user && DOM.totalSeerscore) DOM.totalSeerscore.textContent = user.seerscore || 0;
        if (DOM.totalPredictions) DOM.totalPredictions.textContent = predictions.length;
        const uniqueUsers = new Set(predictions.map(p => p.creator).filter(Boolean));
        if (DOM.totalUsers) animateValue(DOM.totalUsers, uniqueUsers.size);
        const hottest = getHottestCategory();
        if (DOM.hottestCategory) DOM.hottestCategory.innerHTML = `${hottest.icon} Hottest: <strong>${hottest.name}</strong> (${hottest.count} active)`;
        const isOracle = (walletAddress === CONFIG.ORACLE_WALLET);
        if (DOM.oracleIndicatorTop) DOM.oracleIndicatorTop.style.display = isOracle ? 'inline-flex' : 'none';
        if (DOM.oracleIndicatorProfile) DOM.oracleIndicatorProfile.style.display = isOracle ? 'inline-block' : 'none';
        const myResolvedBets = predictions.filter(p => p.status === 'resolved' && (p.bets || []).some(b => b.user === walletAddress) && !p.notified);
        if (myResolvedBets.length > 0) {
            const wonBets = myResolvedBets.filter(p => {
                const myBet = p.bets.find(b => b.user === walletAddress);
                return myBet && myBet.outcome === p.resolved_outcome;
            });
            addNotification(`${myResolvedBets.length} prediction${myResolvedBets.length > 1 ? 's' : ''} resolved!`, 'info');
            if (wonBets.length > 0 && shouldNotify('won')) {
                flashTitle('🏆 You won!');
                addNotification(`🏆 You won ${wonBets.length} prediction${wonBets.length > 1 ? 's' : ''}!`, 'win');
                wonBets.forEach(p => showWinShare(p, ((p.payouts || []).find(pay => pay.user === walletAddress) || {}).amount || 0));
            }
            myResolvedBets.forEach(p => p.notified = true);
        }
        if (DOM.loadMoreBtn && predictions.length >= 100) DOM.loadMoreBtn.style.display = 'block';
        else if (DOM.loadMoreBtn) DOM.loadMoreBtn.style.display = 'none';
        updateHypeMessage();
        hideSkeleton();
    } catch (err) {
        console.error('Refresh error:', err);
        hideSkeleton();
    }
}