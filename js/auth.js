// ============================================================
// PRAEDICTA – Authentication & Session
// ============================================================

async function callSecureRpc(action, params = {}) {
    if (sessionToken && sessionExpiresAt > Date.now()) { try { const res = await fetch(CONFIG.SECURE_RPC_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action:'session_action', params:{ action, params }, token:sessionToken }) }); if (res.ok) return await res.json(); sessionToken = null; sessionExpiresAt = null; } catch (e) {} }
    if (!walletAddress) throw new Error("Wallet not connected");
    const { data: nonce, error: nonceErr } = await supabaseClient.rpc('get_auth_nonce', { p_wallet: walletAddress });
    if (nonceErr) throw new Error("Nonce error: " + nonceErr.message);
    const message = `Login to PRAEDICTA at praedictacoin.github.io`; const encoded = new TextEncoder().encode(message);
    const signed = await window.solana.signMessage(encoded); const signature = Array.from(signed.signature).map(b => b.toString(16).padStart(2, '0')).join('');
    const res = await fetch(CONFIG.SECURE_RPC_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ action, params, signature, wallet: walletAddress, nonce, message }) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Secure RPC failed'); }
    return await res.json();
}

async function loginBonus() { const result = await callSecureRpc('login_bonus'); if (result.token) { sessionToken = result.token; sessionExpiresAt = Date.now() + CONFIG.SESSION_DURATION_MINUTES * 60 * 1000; } if (result.balance !== undefined) { userPRAEBalance = result.balance; saveBalance(); } return result; }

async function connectWallet() {
    if (!DOM.ageCheckbox.checked) return showToast("Confirm age and Terms"); if (!window.solana) return alert("Install Phantom wallet.");
    setLoading(DOM.connectBtn, true);
    try { await window.solana.connect({ onlyIfTrusted: false }); walletAddress = window.solana.publicKey.toString(); walletPublicKey = window.solana.publicKey; loadBalance(); const result = await loginBonus();
        if (result.error?.includes('Insufficient PRAE')) { const balance = result.balance || 0; const required = result.required || 7; if (DOM.gateMessage) DOM.gateMessage.innerHTML = `<div style="text-align:center;margin-top:20px;"><p style="color:#FF8888;font-size:1rem;">💰 Insufficient PRAE Balance</p><p>You have: <strong>${balance} PRAE</strong></p><p>Required: <strong>${required} PRAE</strong></p><a href="https://dexscreener.com/solana/7C2Y5NebLFG37wMbB85TbMqYERTSkq9tEi58wv28MCzt" target="_blank" rel="noopener" style="color:var(--accent);display:inline-block;margin-top:12px;padding:10px 20px;border:1px solid var(--accent);border-radius:40px;text-decoration:none;">Get PRAE on DexScreener →</a></div>`; await window.solana.disconnect(); walletAddress = null; walletPublicKey = null; return; }
        rotateVoice(); DOM.gate.style.display = 'none'; DOM.mainApp.style.display = 'block'; DOM.disconnectBtn.style.display = 'inline-block';
        if (!localStorage.getItem('tutorialShown')) { DOM.tutorialOverlay.style.display = 'flex'; localStorage.setItem('tutorialShown', 'true'); }
        if (DOM.flipCoinBtn) { const today = getUTCDayKey(); const stored = JSON.parse(localStorage.getItem('prae_last_flip') || '{}'); DOM.flipCoinBtn.textContent = stored[walletAddress] === today ? '🪙 Flip Coin (done for today)' : '🪙 Flip Coin (1 available)'; }
        await refreshAll();
    } catch (err) { console.error('Connection error:', err); showToast("Connection failed: " + err.message); } finally { setLoading(DOM.connectBtn, false); }
}

function disconnectWallet() { if (window.solana?.disconnect) window.solana.disconnect(); walletAddress = null; walletPublicKey = null; DOM.mainApp.style.display = 'none'; DOM.gate.style.display = 'flex'; DOM.disconnectBtn.style.display = 'none'; sessionToken = null; sessionExpiresAt = null; oracleAsked = false; blindVotingEnabled = false; }

async function createPrediction() {
    const title = sanitize(DOM.title.value, CONFIG.MAX_TITLE_LENGTH); const desc = sanitize(DOM.description.value, CONFIG.MAX_DESC_LENGTH); const cat = DOM.category.value; const date = DOM.resolutionDate.value; const sourceUrl = sanitize(DOM.sourceUrl?.value || '', 500);
    if (!title || !desc || !date) return showToast("Fill all fields"); if (title.length < 5) return showToast("Title too short");
    if (!DOM.autoSource.value && !sourceUrl) return showToast("Provide a proof URL or select auto-resolve source");
    const minDate = new Date(); minDate.setHours(minDate.getHours() + 24); if (new Date(date) < minDate) return showToast("Date must be ≥24h from now");
    setLoading(DOM.createBtn, true);
    try { await callSecureRpc('create', { title, description: desc, category: cat, resolutionDate: date, autoSource: DOM.autoSource.value || null, targetValue: sanitize(DOM.targetValue.value, 50) || null, sourceUrl: sourceUrl || null }); showToast("✨ Created! " + randomCompliment()); DOM.title.value = ''; DOM.description.value = ''; DOM.resolutionDate.value = ''; DOM.targetValue.value = ''; DOM.autoSource.value = ''; if (DOM.sourceUrl) DOM.sourceUrl.value = ''; await refreshAll(); } catch (e) { console.error('Create error:', e); showToast(e.message || 'Creation failed'); } finally { setLoading(DOM.createBtn, false); }
}
