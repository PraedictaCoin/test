// ============================================================
// auth.js – final (reduced signatures, registration modal)
// ============================================================

async function callSecureRpc(action, params = {}) {
    // Email verification
    if (['send_verification_email', 'verify_email_code', 'check_email_status'].includes(action)) {
        const mappedAction = action === 'send_verification_email' ? 'send_verification' : action === 'verify_email_code' ? 'verify_code' : 'check_status';
        const res = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/email_verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: mappedAction, ...params, wallet: walletAddress })
        });
        return await res.json();
    }
    // Admin actions
    if (['admin_get_stats', 'admin_action'].includes(action)) {
        const res = await fetch(`${CONFIG.SUPABASE_URL}/functions/v1/admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: action === 'admin_get_stats' ? 'get_stats' : params.action,
                wallet: walletAddress,
                params: params.params || params
            })
        });
        return await res.json();
    }
    
    // Use session token if available and not expired
    if (sessionToken && sessionExpiresAt > Date.now()) {
        try {
            const res = await fetch(CONFIG.SECURE_RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'session_action', params: { action, params }, token: sessionToken })
            });
            if (res.ok) return await res.json();
            // Token invalid – fall through to fresh authentication
            sessionToken = null;
            sessionExpiresAt = null;
        } catch (e) {}
    }
    
    // For actions that require a fresh signature (login_bonus, create, market_order, place_order)
    if (!walletAddress) throw new Error("Wallet not connected");
    if (!window.solana || !window.solana.signMessage) throw new Error("Phantom wallet required");
    
    // Fetch nonce
    const { data: nonce, error: nonceErr } = await supabaseClient.rpc('get_auth_nonce', { p_wallet: walletAddress });
    if (nonceErr || !nonce) throw new Error("Authentication failed.");
    
    // Sign message with a clear description of what the user is agreeing to
    const message = `Login to PRAEDICTA at praedictacoin.github.io\nNonce: ${nonce}\n\nBy signing, you agree to the Terms of Use and confirm that this is a free prediction game with virtual points. No real money involved. Points have no cash value.`;
    const encoded = new TextEncoder().encode(message);
    let signed;
    try {
        signed = await window.solana.signMessage(encoded);
    } catch (e) {
        throw new Error("Signature rejected");
    }
    const signature = Array.from(signed.signature).map(b => b.toString(16).padStart(2, '0')).join('');
    
    const res = await fetch(CONFIG.SECURE_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, params, signature, wallet: walletAddress, nonce, message })
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
    }
    return await res.json();
}

async function loginBonus() {
    const result = await callSecureRpc('login_bonus');
    if (result.token) {
        sessionToken = result.token;
        sessionExpiresAt = Date.now() + (CONFIG.SESSION_DURATION_MINUTES * 60 * 1000);
    }
    if (result.balance !== undefined) {
        userPRAEBalance = result.balance;
        saveBalance();
    }
    return result;
}

async function connectWallet() {
    if (!window.solana) return alert("Install Phantom wallet.");
    setLoading(DOM.connectBtn, true);
    try {
        await window.solana.connect({ onlyIfTrusted: false });
        walletAddress = window.solana.publicKey.toString();
        walletPublicKey = window.solana.publicKey;
        loadBalance();
        const storedBalance = parseFloat(localStorage.getItem(`prae_balance_${walletAddress}`) || '0');
        if (storedBalance > CONFIG.DEFAULT_BALANCE + 100) {
            userPRAEBalance = CONFIG.DEFAULT_BALANCE;
            saveBalance();
        }
        const result = await loginBonus();
        if (result.error?.includes('Insufficient PRAE')) {
            const balance = result.balance || 0;
            const required = result.required || 7;
            if (DOM.gateMessage) DOM.gateMessage.innerHTML = `<div style="text-align:center;"><p style="color:#FF8888;">💰 Insufficient points</p><p>You have: ${balance} points</p><p>Required: ${required} points</p></div>`;
            await window.solana.disconnect();
            walletAddress = null;
            return;
        }
        
        // Check if user already registered
        const user = await loadUser(walletAddress);
        if (!user || !user.display_name) {
            // Show registration modal
            const modal = document.getElementById('registrationModal');
            if (modal) modal.style.display = 'flex';
            const completeBtn = document.getElementById('completeRegistrationBtn');
            const regName = document.getElementById('regName');
            const regBirthdate = document.getElementById('regBirthdate');
            const regSymbol = document.getElementById('regSymbol');
            const awaitRegistration = new Promise((resolve, reject) => {
                completeBtn.onclick = async () => {
                    const name = regName.value.trim();
                    const birthdate = regBirthdate.value;
                    const symbol = regSymbol.value;
                    if (!name || !birthdate) {
                        showToast("Please enter name and birthdate", 'error');
                        return;
                    }
                    // Age check (18+)
                    const birth = new Date(birthdate);
                    const age = (new Date() - birth) / (365.25 * 24 * 60 * 60 * 1000);
                    if (age < 18) {
                        showToast("You must be 18 or older", 'error');
                        return;
                    }
                    await callSecureRpc('update_profile', { display_name: name, avatar: symbol, birthdate: birthdate });
                    modal.style.display = 'none';
                    resolve();
                };
            });
            await awaitRegistration;
        }
        
        rotateVoice();
        DOM.gate.style.display = 'none';
        DOM.mainApp.style.display = 'block';
        if (DOM.disconnectBtn) DOM.disconnectBtn.style.display = 'inline-block';
        if (walletAddress === CONFIG.ORACLE_WALLET && DOM.adminTabBtn) DOM.adminTabBtn.style.display = 'inline-block';
        if (!localStorage.getItem('tutorialShown')) {
            if (DOM.tutorialOverlay) DOM.tutorialOverlay.style.display = 'flex';
            localStorage.setItem('tutorialShown', 'true');
        }
        if (DOM.flipCoinBtn) {
            const today = getUTCDayKey();
            const stored = JSON.parse(localStorage.getItem('prae_last_flip') || '{}');
            DOM.flipCoinBtn.textContent = stored[walletAddress] === today ? '🪙 Flip Coin (done)' : '🪙 Flip Coin';
        }
        
        // Claim signup bonus if not claimed
        const bonusResult = await callSecureRpc('claim_signup_bonus', {});
        if (bonusResult.success && bonusResult.newBalance !== undefined) {
            userPRAEBalance = bonusResult.newBalance;
            saveBalance();
            showToast("🎁 Welcome! You received 10 virtual points.", 'success');
        }
        
        const freshUser = await loadUser(walletAddress);
        // Load saved theme from database
        if (freshUser?.theme) {
            if (freshUser.theme === 'light') document.body.classList.add('light');
            else document.body.classList.remove('light');
            localStorage.setItem('praedicta_theme', freshUser.theme);
        }
        showWelcomeAnimation(freshUser?.display_name || '');
        await refreshAll();
    } catch (err) {
        console.error('Connection error:', err);
        showToast(err.message || "Connection failed");
    } finally {
        setLoading(DOM.connectBtn, false);
    }
}

function disconnectWallet() {
    if (window.solana?.disconnect) {
        try { window.solana.disconnect(); } catch (e) {}
    }
    walletAddress = null;
    walletPublicKey = null;
    sessionToken = null;
    sessionExpiresAt = null;
    oracleAsked = false;
    creatorBetOutcome = null;
    if (DOM.mainApp) DOM.mainApp.style.display = 'none';
    if (DOM.gate) DOM.gate.style.display = 'flex';
    if (DOM.disconnectBtn) DOM.disconnectBtn.style.display = 'none';
    if (DOM.adminTabBtn) DOM.adminTabBtn.style.display = 'none';
}

async function createPrediction() {
    // unchanged – already uses callSecureRpc which will prompt signature only if session expired
    // ... (keep your existing createPrediction function)
}

async function createPrediction() {
    const title = sanitize(DOM.title?.value || '', CONFIG.MAX_TITLE_LENGTH);
    const desc = sanitize(DOM.description?.value || '', CONFIG.MAX_DESC_LENGTH);
    const cat = DOM.category?.value || 'wildcard';
    const date = DOM.resolutionDate?.value || '';
    const sourceUrl = sanitize(DOM.sourceUrl?.value || '', 500);
    if (!title || !desc || !date) return showToast("Fill all fields");
    if (title.length < 5) return showToast("Title too short");
    const validation = isValidPrediction(title);
    if (!validation.valid) return showToast(validation.reason);
    const topicCheck = isBlockedTopic(title, desc);
    if (topicCheck.blocked) return showToast(topicCheck.reason);
    if (!DOM.autoSource?.value && !sourceUrl) return showToast("Provide a proof URL or select auto-resolve source");
    if (!creatorBetOutcome) return showToast("Select YES or NO");
    if (sourceUrl && !DOM.autoSource?.value) {
        if (!isValidSourceUrl(sourceUrl)) return showToast("Invalid source URL");
    }
    let autoSource = DOM.autoSource?.value || null;
    if (autoSource && (autoSource.startsWith('weather_') || autoSource === 'sports_' || autoSource === 'wiki_')) {
        const detail = sanitize(DOM.autoSourceDetail?.value || '', 100);
        if (!detail) return showToast("Enter a city, team name, or Wikipedia page title");
        autoSource = `${autoSource}:${detail}`;
    }
    const needsNumericTarget = autoSource && !autoSource.startsWith('sports_') && !autoSource.startsWith('wiki_') && !autoSource.startsWith('spacex_');
    if (needsNumericTarget) {
        const targetVal = sanitize(DOM.targetValue?.value || '', 50);
        if (!targetVal || isNaN(parseFloat(targetVal))) return showToast("Enter a numeric target value");
    }
    const amount = CONFIG.MIN_BET;
    if (userPRAEBalance < amount) return showToast(`Need ${amount} points. You have ${userPRAEBalance.toFixed(1)}.`);
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 24);
    if (new Date(date) < minDate) return showToast("Date must be ≥24h from now");
    setLoading(DOM.createBtn, true);
    try {
        const result = await callSecureRpc('create', {
            title, description: desc, category: cat, resolutionDate: date,
            autoSource: autoSource || null, targetValue: sanitize(DOM.targetValue?.value || '', 50) || null,
            sourceUrl: sourceUrl || null
        });
        if (!result || !result.success || !result.data || !result.data.id) throw new Error(result?.data?.error || 'Creation failed');
        const predictionId = result.data.id;
        buySharesMock(predictionId, creatorBetOutcome, amount);
        currentPredictions.unshift({
            id: predictionId, title, description: desc, category: cat, creator: walletAddress,
            status: 'active', created_at: new Date().toISOString(), resolution_date: date,
            auto_source: autoSource, target_value: sanitize(DOM.targetValue?.value || '', 50) || null,
            source_url: sourceUrl || null, bets: [{ user: walletAddress, outcome: creatorBetOutcome, amount }],
            reactions: [], suggestions: [], yes_pool: 1000, no_pool: 1000, yesShares: 0, noShares: 0, liquidity: 100
        });
        showToast(`✨ Created & bet ${amount} points on ${creatorBetOutcome.toUpperCase()}!`, 'success');
        const wasChallenge = sessionStorage.getItem('prae_challenge_accepted') === 'true';
        if (wasChallenge) { completeDailyChallenge(); }
        analyticsData.creations++;
        if (DOM.title) DOM.title.value = '';
        if (DOM.description) DOM.description.value = '';
        if (DOM.resolutionDate) DOM.resolutionDate.value = '';
        if (DOM.targetValue) DOM.targetValue.value = '';
        if (DOM.autoSource) DOM.autoSource.value = '';
        if (DOM.sourceUrl) DOM.sourceUrl.value = '';
        if (DOM.autoSourceDetail) { DOM.autoSourceDetail.value = ''; DOM.autoSourceDetail.style.display = 'none'; }
        creatorBetOutcome = null;
        if (DOM.creatorBetYes) DOM.creatorBetYes.classList.remove('selected');
        if (DOM.creatorBetNo) DOM.creatorBetNo.classList.remove('selected');
        if (DOM.creatorBetDisplay) {
            DOM.creatorBetDisplay.textContent = 'Select your conviction';
            DOM.creatorBetDisplay.style.color = 'var(--text-muted)';
        }
        await refreshAll();
    } catch (e) {
        console.error('Create error:', e);
        showToast(e.message || 'Creation failed');
    } finally {
        setLoading(DOM.createBtn, false);
    }
}