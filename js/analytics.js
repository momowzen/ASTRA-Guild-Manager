function renderAnalyticsPage() {
  const container = $("analyticsPage");
  if (!container) return;

  const memberCp = membersCache
    .filter(m => (m.combatPower || 0) > 0)
    .sort((a, b) => (b.combatPower || 0) - (a.combatPower || 0));

  const total = membersCache.length;
  const totalCp = membersCache.reduce((s, m) => s + (m.combatPower || 0), 0);
  const average = total ? Math.round(totalCp / total) : 0;
  const max = memberCp.length ? memberCp[0].combatPower : 0;
  const median = (() => {
    const vals = membersCache.map(m => m.combatPower || 0).sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 ? vals[mid] : Math.round((vals[mid - 1] + vals[mid]) / 2);
  })();
  const nonzero = memberCp.length;
  const maxBar = max || 1;

  let rows = "";
  if (memberCp.length === 0) {
    rows = `<tr><td colspan="3" class="empty-state">${t("noResults")}</td></tr>`;
  } else {
    rows = memberCp.map((m, i) => {
      const pct = Math.round((m.combatPower || 0) / maxBar * 100);
      return `
        <tr>
          <td class="rank-cell ${i < 3 ? "rank-" + (i + 1) : ""}">${i + 1}</td>
          <td>${escapeHtml(m.name)}</td>
          <td class="cp-bar-cell"><div class="cp-bar-track"><div class="cp-bar-fill" style="width:${pct}%"></div></div></td>
          <td class="cp-value">${(m.combatPower || 0).toLocaleString()}</td>
        </tr>
      `;
    }).join("");
  }

  container.innerHTML = `
    <div class="page-header">
      <h2>${t("menuAnalytics")}</h2>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${average.toLocaleString()}</div>
        <div class="stat-label">Avg CP</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${max.toLocaleString()}</div>
        <div class="stat-label">Max CP</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${median.toLocaleString()}</div>
        <div class="stat-label">Median CP</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${nonzero} / ${total}</div>
        <div class="stat-label">With CP</div>
      </div>
    </div>
    <div class="table-container">
      <table class="table cp-analytics-table">
        <thead>
          <tr>
            <th>${t("rank")}</th>
            <th>${t("member")}</th>
            <th>${t("combatPower")}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
