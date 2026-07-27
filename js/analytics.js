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
    const prevCp = history[history.length - 1].oldValue || 0;
    const currentCp = member.combatPower || 0;
    const change = currentCp - prevCp;
    const pctChange = prevCp > 0 ? Math.round(change / prevCp * 100) : (change > 0 ? 100 : 0);
    const lastEntry = history[history.length - 1];
    const lastDate = lastEntry && lastEntry.timestamp ? formatDateTime(lastEntry.timestamp) : "-";
    rows.push({ id: mid, name: member.name, prevCp, currentCp, change, pctChange, changes: history.length, lastDate });
  });

  rows.sort((a, b) => b.pctChange - a.pctChange);

  const maxPct = rows.length ? Math.max(...rows.map(r => Math.abs(r.pctChange))) : 1;

  let tableRows = "";
  if (rows.length === 0) {
    tableRows = `<tr><td colspan="6" class="empty-state">${t("noResults")}</td></tr>`;
  } else {
    tableRows = rows.map(r => {
      const barPct = Math.round(Math.abs(r.pctChange) / maxPct * 100);
      const sign = r.change >= 0 ? "+" : "";
      const pctLabel = r.prevCp === 0 && r.currentCp > 0 ? "New" : sign + r.pctChange + "%";
      const cls = r.change >= 0 ? "cp-gained" : "cp-lost";
      return `
        <tr onclick="showMemberProfile('${r.id}')" style="cursor:pointer;">
          <td>${escapeHtml(r.name)}</td>
          <td class="cp-cell">${r.prevCp.toLocaleString()}</td>
          <td class="cp-cell">${r.currentCp.toLocaleString()}</td>
          <td class="cp-cell ${cls}">${pctLabel}</td>
          <td class="gain-bar-cell"><div class="gain-bar-track"><div class="gain-bar-fill ${cls}" style="width:${barPct}%"></div></div></td>
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
            <th>Previous CP</th>
            <th>Current CP</th>
            <th>% Change</th>
            <th>Progress</th>
            <th>Updates</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
}
