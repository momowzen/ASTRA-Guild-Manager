function renderRankingPage() {
  const container = $("rankingPage");
  if (!container) return;

  const sorted = [...membersCache].sort((a, b) => (b.points || 0) - (a.points || 0));

  let html = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th data-i18n="rank">${t("rank")}</th>
            <th data-i18n="member">${t("member")}</th>
            <th data-i18n="points">${t("points")}</th>
            <th data-i18n="attendanceCount">${t("attendanceCount")}</th>
            <th data-i18n="lastAttendance">${t("lastAttendance")}</th>
          </tr>
        </thead>
        <tbody>
  `;

  if (sorted.length === 0) {
    html += `<tr><td colspan="5" class="empty-state">${t("noResults")}</td></tr>`;
  } else {
    sorted.forEach((m, i) => {
      const rank = i + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : "";
      html += `
        <tr>
          <td class="rank-cell ${rankClass}">${rank}</td>
          <td>${escapeHtml(m.name)}</td>
          <td class="points-cell">${m.points || 0}</td>
          <td>${m.attendanceCount || 0}</td>
          <td>${m.lastAttendance ? formatDate(m.lastAttendance) : "-"}</td>
        </tr>
      `;
    });
  }

  html += `</tbody></table></div>
    <div class="page-actions">
      <button class="btn btn-sm btn-danger" onclick="clearAllPoints()" data-i18n="clearPoints">${t("clearPoints")}</button>
    </div>`;
  container.innerHTML = html;
}

async function clearAllPoints() {
  const confirmed = await showConfirm(t("confirmClearPoints"));
  if (!confirmed) return;
  showLoading(true);
  try {
    const updates = membersCache
      .filter(m => (m.points || 0) > 0 || (m.attendanceCount || 0) > 0)
      .map(m => updateMember(m.id, { points: 0, attendanceCount: 0, lastAttendance: null }));
    await Promise.all(updates);
    renderRankingPage();
    showToast(t("pointsCleared"), "success");
  } catch (err) {
    console.error("Clear points error:", err);
    showToast(t("error") + ": " + err.message, "error");
  } finally {
    showLoading(false);
  }
}
