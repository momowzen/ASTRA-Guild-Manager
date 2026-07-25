async function loadHistory() {
  const records = await getCollection("attendance");
  return records.sort((a, b) => {
    const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
    const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
    return dateB - dateA;
  });
}

function renderHistoryPage() {
  const container = $("historyPage");
  if (!container) return;

  container.innerHTML = `
    <div id="historyList" class="history-list">
      <div class="loading-indicator">${t("loading")}</div>
    </div>
    <div class="page-actions">
      <button class="btn btn-sm btn-danger" onclick="clearAllHistory()" data-i18n="clearHistory">${t("clearHistory")}</button>
    </div>
  `;

  loadHistory().then(records => {
    const listEl = $("historyList");
    if (!listEl) return;

    if (records.length === 0) {
      listEl.innerHTML = `<div class="empty-state">${t("noRecords")}</div>`;
      return;
    }

    let html = `<div class="table-container"><table class="table">
      <thead>
        <tr>
          <th data-i18n="attendanceDate">${t("attendanceDate")}</th>
          <th data-i18n="boss">${t("boss")}</th>
          <th data-i18n="bossPoints" style="text-align:center">${t("bossPoints")}</th>
          <th data-i18n="memberCount" style="text-align:center">${t("memberCount")}</th>
          <th data-i18n="createdTime">${t("createdTime")}</th>
          <th data-i18n="actions">${t("actions")}</th>
        </tr>
      </thead>
      <tbody>
    `;

    records.forEach(rec => {
      const boss = BOSSES.find(b => b.id === rec.bossId);
      const bossName = boss ? getBossName(boss) : rec.bossName || rec.bossId;
      const dateStr = rec.date ? formatDate(rec.date) : "-";
      const createdStr = rec.createdAt ? formatDateTime(rec.createdAt) : "-";
      html += `
        <tr>
          <td>${dateStr}</td>
          <td>${escapeHtml(bossName)}</td>
          <td style="text-align:center">${rec.bossPoints || 0}</td>
          <td style="text-align:center">${(rec.members || []).length}</td>
          <td>${createdStr}</td>
          <td class="actions-cell">
            <button class="btn btn-sm btn-secondary" onclick="viewHistoryRecord('${rec.id}')" data-i18n="view">${t("view")}</button>
            <button class="btn btn-sm btn-danger" onclick="deleteHistoryRecord('${rec.id}')" data-i18n="delete">${t("delete")}</button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    listEl.innerHTML = html;
  });
}

async function viewHistoryRecord(id) {
  const rec = await getDocument("attendance", id);
  if (!rec) return;
  const boss = BOSSES.find(b => b.id === rec.bossId);
  const bossName = boss ? getBossName(boss) : rec.bossName || rec.bossId;

  let membersHtml = "";
  if (rec.members && rec.members.length > 0) {
    membersHtml = rec.members.map(m => {
      const name = typeof m === "string" ? m : m.name || m;
      return `<span class="chip">${escapeHtml(name)}</span>`;
    }).join("");
  } else {
    membersHtml = `<span class="empty-state">${t("noMembers")}</span>`;
  }

  const dialog = createElement("div", "view-dialog-overlay");
  dialog.innerHTML = `
    <div class="view-dialog">
      <h3>${t("view")} - ${escapeHtml(bossName)}</h3>
      <div class="view-dialog-content">
        <p><strong>${t("bossSelector")}:</strong> ${escapeHtml(bossName)}</p>
        <p><strong>${t("bossPoints")}:</strong> ${rec.bossPoints || 0}</p>
        <p><strong>${t("attendanceDate")}:</strong> ${rec.date ? formatDate(rec.date) : "-"}</p>
        <p><strong>${t("memberCount")}:</strong> ${(rec.members || []).length}</p>
        <p><strong>${t("createdTime")}:</strong> ${rec.createdAt ? formatDateTime(rec.createdAt) : "-"}</p>
        <p><strong>${t("membersList")}:</strong></p>
        <div class="chips-container">${membersHtml}</div>
      </div>
      <div class="view-dialog-actions">
        <button class="btn btn-primary" onclick="this.closest('.view-dialog-overlay').remove()" data-i18n="close">${t("close")}</button>
      </div>
    </div>
  `;
  document.body.appendChild(dialog);
  dialog.onclick = e => {
    if (e.target === dialog) dialog.remove();
  };
}

async function clearAllHistory() {
  const confirmed = await showConfirm(t("confirmClearHistory"));
  if (confirmed) {
    const records = await getCollection("attendance");
    for (const rec of records) {
      await deleteDocument("attendance", rec.id);
    }
    renderHistoryPage();
    showToast(t("historyCleared"), "success");
  }
}

async function deleteHistoryRecord(id) {
  const confirmed = await showConfirm(t("confirmDeleteAttendance"));
  if (confirmed) {
    await deleteDocument("attendance", id);
    renderHistoryPage();
    showToast(t("deleteSuccess"), "success");
  }
}

function renderPageLabels() {
  const page = getCurrentPage();
  if (page === "history") renderHistoryPage();
}
