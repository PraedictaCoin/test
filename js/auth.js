async function connectWallet() {
    if (!DOM.ageCheckbox.checked) return showToast("Confirm age and Terms");
    if (!window.solana) return alert("Install Phantom wallet.");
    setLoading(DOM.connectBtn, true);
    try {
        await window.solana.connect({ onlyIfTrusted: false });
        walletAddress = window.solana.publicKey.toString();
        walletPublicKey = window.solana.publicKey;
        loadBalance();

        // Check for balance tampering
        const storedBalance = parseFloat(localStorage.getItem(`prae_balance_${walletAddress}`) || '0');
        if (storedBalance > CONFIG.DEFAULT_BALANCE + 100) {
            userPRAEBalance = CONFIG.DEFAULT_BALANCE;
            saveBalance();
        }

        const result = await loginBonus();
        if (result.error?.includes('Insufficient PRAE')) {
            const balance = result.balance || 0; const required = result.required || 7;
            if (DOM.gateMessage) DOM.gateMessage.innerHTML = `<div style="text-align:center;margin-top:20px;"><p style="color:#FF8888;font-size:1rem;">💰 Insufficient PRAE Balance</p><p>You have: <strong>${balance} PRAE</strong></p><p>Required: <strong>${required} PRAE</strong></p><a href="https://dexscreener.com/solana/7C2Y5NebLFG37wMbB85TbMqYERTSkq9tEi58wv28MCzt" target="_blank" rel="noopener" style="color:var(--accent);display:inline-block;margin-top:12px;padding:10px 20px;border:1px solid var(--accent);border-radius:40px;text-decoration:none;">Get PRAE on DexScreener →</a></div>`;
                await window.solana.disconnect(); walletAddress = null; walletPublicKey = null; return;
        }
        rotateVoice(); DOM.gate.style.display = 'none'; DOM.mainApp.style.display = 'block'; DOM.disconnectBtn.style.display = 'inline-block';
        if (!localStorage.getItem('tutorialShown')) { DOM.tutorialOverlay.style.display = 'flex'; localStorage.setItem('tutorialShown', 'true'); }
        if (DOM.flipCoinBtn) { const today = getUTCDayKey(); const stored = JSON.parse(localStorage.getItem('prae_last_flip') || '{}'); DOM.flipCoinBtn.textContent = stored[walletAddress] === today ? '🪙 Flip Coin (done for today)' : '🪙 Flip Coin (1 available)'; }
        await refreshAll();
    } catch (err) { console.error('Connection error:', err); showToast("Connection failed: " + err.message); }
    finally { setLoading(DOM.connectBtn, false); }
}
