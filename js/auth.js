// ============================================================
// PRAEDICTA – Authentication & Session (auth.js)
// ============================================================

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
        } catch (e) {}
    }

    if (!walletAddress) throw new Error("Wallet not connected");
    if (!window.solana || !window.solana.signMessage) throw new Error("Phantom wallet required");

    const { data: nonce, error: nonceErr } = await supabaseClient.rpc('get_auth_nonce', { p_wallet: walletAddress });
    if (nonceErr || !nonce) throw new Error("Authentication failed.");

    const message = `Login to PRAEDICTA at praedictacoin.github.io`;
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

async function loginBonus() { const result = await callSecureRpc('login_bonus'); if (result.token) { sessionToken = result.token; sessionExpiresAt = Date.now() + (CONFIG.SESSION_DURATION_MINUTES * 60 * 1000); } if (result.balance !== undefined) { userPRAEBalance = result.balance; saveBalance(); } return result; }

async function connectWallet() {
    if (!DOM.ageCheckbox || !DOM.ageCheckbox.checked) return showToast("Confirm age and Terms");
    if (!window.solana) return alert("Install Phantom wallet.");
    setLoading(DOM.connectBtn, true);
    try {
        await window.solana.connect({ onlyIfTrusted: false });
        walletAddress = window.solana.publicKey.toString(); walletPublicKey = window.solana.publicKey;
        loadBalance();
        const storedBalance = parseFloat(localStorage.getItem(`prae_balance_${walletAddress}`) || '0');
        if (storedBalance > CONFIG.DEFAULT_BALANCE + 100) { userPRAEBalance = CONFIG.DEFAULT_BALANCE; saveBalance(); }
        const result = await loginBonus();
        if (result.error?.includes('Insufficient PRAE')) {
            const balance = result.balance || 0; const required = result.required || 7;
            if (DOM.gateMessage) DOM.gateMessage.innerHTML = `<div style="text-align:center;margin-top:20px;"><p style="color:#FF8888;">💰 Insufficient PRAE</p><p>You have: <strong>${balance} PRAE</strong></p><p>Required: <strong>${required} PRAE</strong></p><a href="https://dexscreener.com/solana/${CONFIG.PRAE_MINT}" target="_blank" rel="noopener" style="color:var(--accent);display:inline-block;margin-top:12px;padding:10px 20px;border:1px solid var(--accent);border-radius:40px;text-decoration:none;">Get PRAE →</a></div>`;
                await window.solana.disconnect(); walletAddress = null; walletPublicKey = null; return;
        }
        rotateVoice(); DOM.gate.style.display = 'none'; DOM.mainApp.style.display = 'block'; if (DOM.disconnectBtn) DOM.disconnectBtn.style.display = 'inline-block';
        if (!localStorage.getItem('tutorialShown')) { if (DOM.tutorialOverlay) DOM.tutorialOverlay.style.display = 'flex'; localStorage.setItem('tutorialShown', 'true'); }
        if (DOM.flipCoinBtn) { const today = getUTCDayKey(); const stored = JSON.parse(localStorage.getItem('prae_last_flip') || '{}'); DOM.flipCoinBtn.textContent = stored[walletAddress] === today ? '🪙 Flip Coin (done for today)' : '🪙 Flip Coin (1 available)'; }
        const email = sanitize(DOM.emailInput?.value || '', 100);
        if (email && email.includes('@') && email.includes('.')) { try { await supabaseClient.from('users').update({ email: email }).eq('address', walletAddress); } catch (e) {} }
        await refreshAll();
    } catch (err) { console.error('Connection error:', err); showToast("Connection failed"); }
    finally { setLoading(DOM.connectBtn, false); }
}

function disconnectWallet() { if (window.solana?.disconnect) { try { window.solana.disconnect(); } catch (e) {} } walletAddress = null; walletPublicKey = null; sessionToken = null; sessionExpiresAt = null; oracleAsked = false; blindVotingEnabled = false; creatorBetOutcome = null; if (DOM.mainApp) DOM.mainApp.style.display = 'none'; if (DOM.gate) DOM.gate.style.display = 'flex'; if (DOM.disconnectBtn) DOM.disconnectBtn.style.display = 'none'; }

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
    if (sourceUrl && !DOM.autoSource?.value) { if (!isValidSourceUrl(sourceUrl)) return showToast("Invalid source URL"); }

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
    if (userPRAEBalance < amount) return showToast(`Need ${amount} PRAE. You have ${userPRAEBalance.toFixed(1)}.`);
    const minDate = new Date(); minDate.setHours(minDate.getHours() + 24);
    if (new Date(date) < minDate) return showToast("Date must be ≥24h from now");

    setLoading(DOM.createBtn, true);
    try {
        const result = await callSecureRpc('create', { title, description: desc, category: cat, resolutionDate: date, autoSource: autoSource || null, targetValue: sanitize(DOM.targetValue?.value || '', 50) || null, sourceUrl: sourceUrl || null });
        if (!result || !result.success || !result.data || !result.data.id) throw new Error(result?.data?.error || 'Creation failed');
        const predictionId = result.data.id;
        buySharesMock(predictionId, creatorBetOutcome, amount);
        currentPredictions.unshift({ id: predictionId, title, description: desc, category: cat, creator: walletAddress, status: 'active', created_at: new Date().toISOString(), resolution_date: date, auto_source: autoSource, target_value: sanitize(DOM.targetValue?.value || '', 50) || null, source_url: sourceUrl || null, bets: [{ user: walletAddress, outcome: creatorBetOutcome, amount }], reactions: [], suggestions: [], yes_pool: 1000, no_pool: 1000, yesShares: 0, noShares: 0, liquidity: 100 });
        showToast(`✨ Created & bet ${amount} PRAE on ${creatorBetOutcome.toUpperCase()}!`);
        if (DOM.title) DOM.title.value = ''; if (DOM.description) DOM.description.value = ''; if (DOM.resolutionDate) DOM.resolutionDate.value = ''; if (DOM.targetValue) DOM.targetValue.value = ''; if (DOM.autoSource) DOM.autoSource.value = ''; if (DOM.sourceUrl) DOM.sourceUrl.value = ''; if (DOM.autoSourceDetail) { DOM.autoSourceDetail.value = ''; DOM.autoSourceDetail.style.display = 'none'; }
        creatorBetOutcome = null; if (DOM.creatorBetYes) DOM.creatorBetYes.classList.remove('selected'); if (DOM.creatorBetNo) DOM.creatorBetNo.classList.remove('selected');
        if (DOM.creatorBetDisplay) { DOM.creatorBetDisplay.textContent = 'Select your conviction'; DOM.creatorBetDisplay.style.color = 'var(--text-muted)'; }
        await refreshAll();
    } catch (e) { console.error('Create error:', e); showToast(e.message || 'Creation failed'); }
    finally { setLoading(DOM.createBtn, false); }
}
