// ============================================================
// PRAEDICTA – Authentication & Session (auth.js)
// ============================================================

// ── Core RPC Call ─────────────────────────────────────────
async function callSecureRpc(action, params = {}) {
    // Try existing session first
    if (sessionToken && sessionExpiresAt > Date.now()) {
        try {
            const res = await fetch(CONFIG.SECURE_RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'session_action',
                    params: { action, params },
                    token: sessionToken
                })
            });
            if (res.ok) return await res.json();
            // Session expired, fall through to re-auth
            sessionToken = null;
            sessionExpiresAt = null;
        } catch (e) {
            console.error('Session action failed:', e);
        }
    }

    // Full re-authentication
    if (!walletAddress) throw new Error("Wallet not connected");
    if (!window.solana || !window.solana.signMessage) throw new Error("Phantom wallet required");

    // Get nonce
    const { data: nonce, error: nonceErr } = await supabaseClient
    .rpc('get_auth_nonce', { p_wallet: walletAddress });
    if (nonceErr || !nonce) throw new Error("Authentication failed. Please try again.");

    // Sign message
    const message = `Login to PRAEDICTA at praedictacoin.github.io`;
    const encoded = new TextEncoder().encode(message);
    let signed;
    try {
        signed = await window.solana.signMessage(encoded);
    } catch (e) {
        throw new Error("Signature rejected");
    }
    const signature = Array.from(signed.signature)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

    // Send to edge function
    const res = await fetch(CONFIG.SECURE_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action,
            params,
            signature,
            wallet: walletAddress,
            nonce,
            message
        })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
    }

    return await res.json();
}

// ── Login Bonus ───────────────────────────────────────────
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

// ── Connect Wallet ────────────────────────────────────────
async function connectWallet() {
    // Validate age consent
    if (!DOM.ageCheckbox || !DOM.ageCheckbox.checked) {
        showToast("Confirm age and Terms");
        return;
    }

    // Check Phantom
    if (!window.solana) {
        alert("Install Phantom wallet to continue.\nhttps://phantom.app/");
        return;
    }

    setLoading(DOM.connectBtn, true);

    try {
        // Connect Phantom
        await window.solana.connect({ onlyIfTrusted: false });
        walletAddress = window.solana.publicKey.toString();
        walletPublicKey = window.solana.publicKey;

        // Load saved balance
        loadBalance();

        // Anti-tamper check for play money
        const storedBalance = parseFloat(
            localStorage.getItem(`prae_balance_${walletAddress}`) || '0'
        );
        if (storedBalance > CONFIG.DEFAULT_BALANCE + 100) {
            userPRAEBalance = CONFIG.DEFAULT_BALANCE;
            saveBalance();
        }

        // Login with on-chain balance check
        const result = await loginBonus();

        // Handle insufficient balance
        if (result.error && result.error.includes('Insufficient PRAE')) {
            const balance = result.balance || 0;
            const required = result.required || 7;

            if (DOM.gateMessage) {
                DOM.gateMessage.innerHTML = `
                <div style="text-align:center; margin-top:20px;">
                <p style="color:#FF8888; font-size:1rem;">💰 Insufficient PRAE Balance</p>
                <p style="margin-top:8px;">You have: <strong>${balance} PRAE</strong></p>
                <p>Required: <strong>${required} PRAE</strong></p>
                <a href="https://dexscreener.com/solana/${CONFIG.PRAE_MINT}"
                target="_blank" rel="noopener"
                style="color:var(--accent); display:inline-block; margin-top:12px;
                padding:10px 20px; border:1px solid var(--accent);
                border-radius:40px; text-decoration:none;">
                Get PRAE on DexScreener →
                </a>
                </div>`;
            }

            // Disconnect if insufficient balance
            await window.solana.disconnect();
            walletAddress = null;
            walletPublicKey = null;
            return;
        }

        // Success - enter app
        rotateVoice();
        DOM.gate.style.display = 'none';
        DOM.mainApp.style.display = 'block';
        if (DOM.disconnectBtn) DOM.disconnectBtn.style.display = 'inline-block';

        // Show tutorial once
        if (!localStorage.getItem('tutorialShown')) {
            if (DOM.tutorialOverlay) DOM.tutorialOverlay.style.display = 'flex';
            localStorage.setItem('tutorialShown', 'true');
        }

        // Set flip coin button state
        if (DOM.flipCoinBtn) {
            const today = getUTCDayKey();
            const stored = JSON.parse(localStorage.getItem('prae_last_flip') || '{}');
            DOM.flipCoinBtn.textContent = stored[walletAddress] === today
            ? '🪙 Flip Coin (done for today)'
            : '🪙 Flip Coin (1 available)';
        }

        // Load everything
        await refreshAll();

    } catch (err) {
        console.error('Connection error:', err);
        showToast("Connection failed: " + (err.message || 'Please try again'));
    } finally {
        setLoading(DOM.connectBtn, false);
    }
}

// ── Disconnect Wallet ─────────────────────────────────────
function disconnectWallet() {
    if (window.solana && window.solana.disconnect) {
        try { window.solana.disconnect(); } catch (e) {}
    }

    walletAddress = null;
    walletPublicKey = null;
    sessionToken = null;
    sessionExpiresAt = null;
    oracleAsked = false;
    blindVotingEnabled = false;
    creatorBetOutcome = null;

    if (DOM.mainApp) DOM.mainApp.style.display = 'none';
    if (DOM.gate) DOM.gate.style.display = 'flex';
    if (DOM.disconnectBtn) DOM.disconnectBtn.style.display = 'none';
}

// ── Create Prediction ─────────────────────────────────────
async function createPrediction() {
    const title = sanitize(DOM.title?.value || '', CONFIG.MAX_TITLE_LENGTH);
    const desc = sanitize(DOM.description?.value || '', CONFIG.MAX_DESC_LENGTH);
    const cat = DOM.category?.value || 'wildcard';
    const date = DOM.resolutionDate?.value || '';
    const sourceUrl = sanitize(DOM.sourceUrl?.value || '', 500);

    // Validation
    if (!title || !desc || !date) return showToast("Fill all fields");
    if (title.length < 5) return showToast("Title too short (min 5 characters)");
    if (!DOM.autoSource?.value && !sourceUrl) {
        return showToast("Provide a proof URL or select auto-resolve source");
    }
    if (!creatorBetOutcome) {
        return showToast("Select YES or NO – you must bet on your prediction");
    }

    // Validate source URL
    if (sourceUrl && !DOM.autoSource?.value) {
        if (!isValidSourceUrl(sourceUrl)) {
            return showToast("Invalid source URL. Must be a valid https:// link");
        }
    }

    // Check balance
    const amount = CONFIG.MIN_BET;
    if (userPRAEBalance < amount) {
        return showToast(`Need ${amount} PRAE to create and bet. You have ${userPRAEBalance.toFixed(1)} PRAE.`);
    }

    // Check date
    const minDate = new Date();
    minDate.setHours(minDate.getHours() + 24);
    if (new Date(date) < minDate) {
        return showToast("Resolution date must be at least 24 hours from now");
    }

    setLoading(DOM.createBtn, true);

    try {
        // Create prediction via edge function
        const result = await callSecureRpc('create', {
            title,
            description: desc,
            category: cat,
            resolutionDate: date,
            autoSource: DOM.autoSource?.value || null,
            targetValue: sanitize(DOM.targetValue?.value || '', 50) || null,
                                           sourceUrl: sourceUrl || null
        });

        if (!result || !result.success || !result.data || !result.data.id) {
            throw new Error(result?.data?.error || 'Creation failed');
        }

        const predictionId = result.data.id;

        // Place creator's bet
        const betResult = buySharesMock(predictionId, creatorBetOutcome, amount);
        if (betResult.error) {
            throw new Error(betResult.error);
        }

        // Build prediction object for immediate display
        const newPrediction = {
            id: predictionId,
            title,
            description: desc,
            category: cat,
            creator: walletAddress,
            status: 'active',
            created_at: new Date().toISOString(),
            resolution_date: date,
            auto_source: DOM.autoSource?.value || null,
            target_value: sanitize(DOM.targetValue?.value || '', 50) || null,
            source_url: sourceUrl || null,
            bets: [{ user: walletAddress, outcome: creatorBetOutcome, amount }],
            reactions: [],
            suggestions: [],
            yes_pool: 1000,
            no_pool: 1000
        };

        // Add to current predictions immediately
        currentPredictions.unshift(newPrediction);

        // Try to save bet to database (non-critical)
        try {
            await supabaseClient
            .from('predictions')
            .update({ bets: newPrediction.bets })
            .eq('id', predictionId);
        } catch (e) {
            console.warn('Bet save deferred, will sync on refresh');
        }

        // Success feedback
        showToast(`✨ Created & bet ${amount} PRAE on ${creatorBetOutcome.toUpperCase()}!`);

        // Clear form
        if (DOM.title) DOM.title.value = '';
        if (DOM.description) DOM.description.value = '';
        if (DOM.resolutionDate) DOM.resolutionDate.value = '';
        if (DOM.targetValue) DOM.targetValue.value = '';
        if (DOM.autoSource) DOM.autoSource.value = '';
        if (DOM.sourceUrl) DOM.sourceUrl.value = '';

        // Reset conviction selection
        creatorBetOutcome = null;
        if (DOM.creatorBetYes) DOM.creatorBetYes.classList.remove('selected');
        if (DOM.creatorBetNo) DOM.creatorBetNo.classList.remove('selected');
        if (DOM.creatorBetDisplay) {
            DOM.creatorBetDisplay.textContent = 'Select your conviction';
            DOM.creatorBetDisplay.style.color = 'var(--text-muted)';
        }

        // Refresh to sync with database
        await refreshAll();

    } catch (e) {
        console.error('Create error:', e);
        showToast(e.message || 'Creation failed');
    } finally {
        setLoading(DOM.createBtn, false);
    }
}
