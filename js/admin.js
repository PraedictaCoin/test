// ============================================================
// PRAEDICTA – Admin Dashboard (admin.js)
// ============================================================

let adminData = {};

async function loadAdminDashboard() {
    if (walletAddress !== CONFIG.ORACLE_WALLET) return;
    try {
        const result = await callSecureRpc('admin_get_stats', {});
        if (result?.data) adminData = result.data;
        else if (result && !result.error) adminData = result;
        renderAdminDashboard();
    } catch (err) {
        console.error('Admin load error:', err);
        showToast('Failed to load admin data', 'error');
    }
}

function renderAdminDashboard() {
    const container = document.getElementById('adminDashboard');
    if (!container) return;
    const { overview = {}, topSeers = [], recentActivity = [], categoryBreakdown = {}, dailyStats = {} } = adminData;
    container.innerHTML = `
    <div class="card" style="border:2px solid var(--oracle-color);">
        <h2 style="color:var(--oracle-color);text-align:center;">🦉 Oracle Admin Dashboard</h2>
        <p style="text-align:center;color:var(--text-muted);font-size:.8rem;margin-bottom:16px;">Restricted to Oracle wallet</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
            <div class="stat"><div class="stat-value">${overview.totalUsers || 0}</div><div>👥 Users</div></div>
            <div class="stat"><div class="stat-value">${overview.totalPredictions || 0}</div><div>📊 Total</div></div>
            <div class="stat"><div class="stat-value">${overview.activePredictions || 0}</div><div>🟢 Active</div></div>
            <div class="stat"><div class="stat-value">${overview.resolvedPredictions || 0}</div><div>✅ Resolved</div></div>
            <div class="stat"><div class="stat-value">${overview.resolutionRate || '0%'}</div><div>📈 Rate</div></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;">
            <button onclick="adminAction('get_flagged')" class="btn" style="font-size:.7rem;background:var(--error-color);">🚩 Flagged</button>
            <button onclick="adminResolvePrompt()" class="btn" style="font-size:.7rem;">✅ Force Resolve</button>
            <button onclick="adminDeletePrompt()" class="btn" style="font-size:.7rem;background:var(--error-color);">🗑️ Delete</button>
            <button onclick="adminBanPrompt()" class="btn" style="font-size:.7rem;background:#000;">🚫 Ban User</button>
            <button onclick="exportAdminCSV()" class="btn" style="font-size:.7rem;background:var(--card-bg);color:var(--accent);border:1px solid var(--accent);">📥 Export CSV</button>
        </div>
        <h3 style="color:var(--accent);margin-bottom:8px;">🏆 Top Seers</h3>
        <div style="max-height:200px;overflow-y:auto;margin-bottom:20px;">
            ${(topSeers || []).map((u, i) => `
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:.8rem;">
                    <span>${i+1}. ${u.avatar||''} ${escapeHtml(u.display_name||'Anon')}</span>
                    <span style="color:var(--accent);">👁️ ${u.seerscore||0}</span>
                </div>
            `).join('') || '<div style="color:var(--text-muted);">No data</div>'}
        </div>
        <h3 style="color:var(--accent);margin-bottom:8px;">📊 Active by Category</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px;">
            ${Object.entries(categoryBreakdown || {}).map(([cat, count]) => `
                <span style="padding:4px 12px;border-radius:20px;background:var(--accent-glow);font-size:.75rem;">${CATEGORY_ICONS[cat]||'📁'} ${cat}: ${count}</span>
            `).join('') || '<span style="color:var(--text-muted);">No data</span>'}
        </div>
        <h3 style="color:var(--accent);margin-bottom:8px;">📡 Recent Activity</h3>
        <div style="max-height:300px;overflow-y:auto;">
            ${(recentActivity || []).map(p => `
                <div style="padding:4px 0;border-bottom:1px solid var(--border);font-size:.75rem;">
                    <strong>${escapeHtml((p.title || '').slice(0, 50))}</strong>
                    <span style="color:var(--text-muted);"> · ${p.status} · ${timeAgo(p.created_at)}</span>
                </div>
            `).join('') || '<div style="color:var(--text-muted);">No activity</div>'}
        </div>
        <h3 style="color:var(--accent);margin-top:16px;margin-bottom:8px;">📅 Last 7 Days</h3>
        <div style="font-size:.7rem;color:var(--text-muted);">
            ${Object.entries(dailyStats || {}).slice(-7).map(([day, stats]) => `
                <div style="display:flex;gap:8px;padding:2px 0;">
                    <span>${day}</span><span>🆕 ${stats.created}</span><span>✅ ${stats.resolved}</span>
                </div>
            `).join('') || 'No data'}
        </div>
    </div>
    <div id="adminResult" style="margin-top:12px;"></div>`;
}

async function adminAction(action, params = {}) {
    try {
        const result = await callSecureRpc('admin_action', { action, params });
        if (result?.data) {
            document.getElementById('adminResult').innerHTML = `<div class="card" style="border:1px solid var(--success-color);"><pre style="font-size:.7rem;overflow-x:auto;color:var(--text);">${escapeHtml(JSON.stringify(result.data, null, 2))}</pre></div>`;
        }
        showToast('Done!', 'success');
        loadAdminDashboard();
    } catch (err) { showToast('Failed: ' + err.message, 'error'); }
}

function adminResolvePrompt() { const id = prompt("Prediction ID:"); if (!id) return; const outcome = prompt("Outcome (yes/no/unresolvable):"); if (!outcome) return; adminAction('force_resolve', { predictionId: id, outcome }); }
function adminDeletePrompt() { const id = prompt("Prediction ID to DELETE:"); if (!id) return; if (!confirm(`DELETE prediction ${id}? This cannot be undone.`)) return; adminAction('delete_prediction', { predictionId: id }); }
function adminBanPrompt() { const wallet = prompt("Wallet address to BAN:"); if (!wallet) return; if (!confirm(`BAN user ${wallet}?`)) return; adminAction('ban_user', { targetWallet: wallet }); }

function exportAdminCSV() {
    const { topSeers = [], recentActivity = [] } = adminData;
    let csv = 'type,address,name,seerscore,title,status,created\n';
    topSeers.forEach(u => { csv += `seer,${u.address},${u.display_name||''},${u.seerscore||0},,,\n`; });
    recentActivity.forEach(p => { csv += `prediction,${p.creator||''},,${(p.title||'').replace(/,/g,' ')},${p.status},${p.created_at}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `praedicta-admin-export-${getUTCDayKey()}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast('📥 CSV exported!', 'success');
}
