async function renderAnalyticsPage() {
  const container = $("analyticsPage");
  if (!container) return;

  container.innerHTML = `<div class="loading-indicator">${t("loading")}</div>`;

  const allHistory = await getCollection("memberCpHistory");
  const memberMap = {};
  allHistory.forEach(h => {
    const mid = h.memberId;
    if (!memberMap[mid]) memberMap[mid] = [];
    memberMap[mid].push(h);
  });

  const rows = [];
  Object.keys(memberMap).forEach(mid => {
    const member = getMemberById(mid);
    if (!member) return;
    const history = memberMap[mid].sort((a, b) => {
      const da = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
      const db = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
      return da - db;
    });
    const startCp = history[0].oldValue || 0;
    const currentCp = member.combatPower || 0;
    let totalGained = 0;
    history.forEach(h => {
      const gain = (h.newValue || 0) - (h.oldValue || 0);
      if (gain > 0) totalGained += gain;
    });
    const lastEntry = history[history.length - 1];
    const lastDate = lastEntry && lastEntry.timestamp ? formatDateTime(lastEntry.timestamp) : "-";
    rows.push({ id: mid, name: member.name, startCp, currentCp, totalGained, changes: history.length, lastDate });
  });

  rows.sort((a, b) => b.totalGained - a.totalGained);

  const maxGain = rows.length ? Math.max(...rows.map(r => r.totalGained)) : 1;

  let tableRows = "";
  if (rows.length === 0) {
    tableRows = `<tr><td colspan="6" class="empty-state">${t("noResults")}</td></tr>`;
  } else {
    tableRows = rows.map(r => {
      const pct = Math.round(r.totalGained / maxGain * 100);
      return `
        <tr onclick="showMemberProfile('${r.id}')" style="cursor:pointer;">
          <td>${escapeHtml(r.name)}</td>
          <td class="cp-cell">${r.startCp.toLocaleString()}</td>
          <td class="cp-cell">${r.currentCp.toLocaleString()}</td>
          <td class="cp-cell cp-gained">+${r.totalGained.toLocaleString()}</td>
          <td class="gain-bar-cell"><div class="gain-bar-track"><div class="gain-bar-fill" style="width:${pct}%"></div></div></td>
          <td class="change-count">${r.changes}</td>
        </tr>
      `;
    }).join("");
  }

  container.innerHTML = `
    <div class="page-header">
      <h2>${t("menuAnalytics")} — ${t("combatPower")}</h2>
    </div>
    <div class="table-container">
      <table class="table cp-analytics-table">
        <thead>
          <tr>
            <th>${t("member")}</th>
            <th>Start CP</th>
            <th>Current CP</th>
            <th>Total Gained</th>
            <th>Progress</th>
            <th>Updates</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
}
