let analyticsSort = { field: "pctChange", asc: false };
let analyticsRows = null;

async function renderAnalyticsPage() {
  const container = $("analyticsPage");
  if (!container) return;

  if (!analyticsRows) {
    container.innerHTML = `<div class="loading-indicator">${t("loading")}</div>`;
    analyticsRows = await loadAnalyticsData();
  }
  renderAnalyticsTable(container);
}

function toggleAnalyticsSort(field) {
  if (analyticsSort.field === field) {
    analyticsSort.asc = !analyticsSort.asc;
  } else {
    analyticsSort.field = field;
    analyticsSort.asc = true;
  }
  const container = $("analyticsPage");
  if (container) renderAnalyticsTable(container);
}

async function loadAnalyticsData() {
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
  return rows;
}

function renderAnalyticsTable(container) {
  const sorted = [...analyticsRows];
  sorted.sort((a, b) => {
    let cmp;
    if (analyticsSort.field === "name") {
      cmp = a.name.localeCompare(b.name);
    } else {
      cmp = (a[analyticsSort.field] || 0) - (b[analyticsSort.field] || 0);
    }
    return analyticsSort.asc ? cmp : -cmp;
  });

  const maxPct = sorted.length ? Math.max(...sorted.map(r => Math.abs(r.pctChange))) : 1;

  function arrow(field) {
    if (analyticsSort.field !== field) return "";
    return analyticsSort.asc ? " ▲" : " ▼";
  }

  let tableRows = "";
  if (sorted.length === 0) {
    tableRows = `<tr><td colspan="6" class="empty-state">${t("noResults")}</td></tr>`;
  } else {
    tableRows = sorted.map(r => {
      const barPct = Math.round(Math.abs(r.pctChange) / maxPct * 100);
      const sign = r.change >= 0 ? "+" : "";
      const pctLabel = r.prevCp === 0 && r.currentCp > 0 ? t("analyticsNew") : sign + r.pctChange + "%";
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
    <div class="table-container">
      <table class="table cp-analytics-table">
        <thead>
          <tr>
            <th class="sortable-th" onclick="toggleAnalyticsSort('name')">${t("member")}${arrow("name")}</th>
            <th class="sortable-th" onclick="toggleAnalyticsSort('prevCp')">${t("analyticsPrevCp")}${arrow("prevCp")}</th>
            <th class="sortable-th" onclick="toggleAnalyticsSort('currentCp')">${t("analyticsCurrentCp")}${arrow("currentCp")}</th>
            <th class="sortable-th" onclick="toggleAnalyticsSort('pctChange')">${t("analyticsPctChange")}${arrow("pctChange")}</th>
            <th>${t("analyticsProgress")}</th>
            <th class="sortable-th" onclick="toggleAnalyticsSort('changes')">${t("analyticsUpdates")}${arrow("changes")}</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
}
