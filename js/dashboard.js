async function renderDashboard() {
  const container = $("dashboardPage");
  if (!container) return;

  const totalMembers = membersCache.length;
  const totalBosses = BOSSES.length;
  const attendanceRecords = await getCollection("attendance");
  const totalRecords = attendanceRecords.length;
  const totalPoints = membersCache.reduce((sum, m) => sum + (m.points || 0), 0);

  const sortedMembers = [...membersCache].sort((a, b) => (b.points || 0) - (a.points || 0));
  const top10 = sortedMembers.slice(0, 10);

  const sortedByCp = [...membersCache].sort((a, b) => (b.combatPower || 0) - (a.combatPower || 0));
  const top10Cp = sortedByCp.slice(0, 10);

  const recentRecords = [...attendanceRecords]
    .sort((a, b) => {
      const da = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt)) : new Date(0);
      const db = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt)) : new Date(0);
      return db - da;
    })
    .slice(0, 5);

  const recentActivity = recentRecords.map(r => {
    const boss = BOSSES.find(b => b.id === r.bossId);
    const bossName = boss ? getBossName(boss) : r.bossId;
    return { text: `${bossName} (${(r.members || []).length} ${t("member")})`, date: r.createdAt };
  });

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon stat-icon-members">👥</div>
        <div class="stat-value">${totalMembers}</div>
        <div class="stat-label" data-i18n="totalMembers">${t("totalMembers")}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-bosses">👹</div>
        <div class="stat-value">${totalBosses}</div>
        <div class="stat-label" data-i18n="totalBosses">${t("totalBosses")}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-records">📋</div>
        <div class="stat-value">${totalRecords}</div>
        <div class="stat-label" data-i18n="totalRecords">${t("totalRecords")}</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon stat-icon-points">⭐</div>
        <div class="stat-value">${totalPoints}</div>
        <div class="stat-label" data-i18n="totalPoints">${t("totalPoints")}</div>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="dashboard-panel">
        <h3 data-i18n="topRankings">${t("topRankings")}</h3>
        ${top10.length === 0 ? `<p class="empty-state">${t("noResults")}</p>` : `
        <table class="table dashboard-table">
          <thead>
            <tr>
              <th data-i18n="rank">${t("rank")}</th>
              <th data-i18n="member">${t("member")}</th>
              <th data-i18n="points">${t("points")}</th>
            </tr>
          </thead>
          <tbody>
            ${top10.map((m, i) => `
              <tr>
                <td class="rank-cell ${i < 3 ? `rank-${i + 1}` : ""}">${i + 1}</td>
                <td>${escapeHtml(m.name)}</td>
                <td>${m.points || 0}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>`}
      </div>

      <div class="dashboard-panel">
        <h3 data-i18n="topCombatPower">${t("topCombatPower")}</h3>
        ${top10Cp.length === 0 ? `<p class="empty-state">${t("noResults")}</p>` : `
        <table class="table dashboard-table">
          <thead>
            <tr>
              <th data-i18n="rank">${t("rank")}</th>
              <th data-i18n="member">${t("member")}</th>
              <th>${t("combatPower")}</th>
            </tr>
          </thead>
          <tbody>
            ${top10Cp.map((m, i) => `
              <tr>
                <td class="rank-cell ${i < 3 ? `rank-${i + 1}` : ""}">${i + 1}</td>
                <td>${escapeHtml(m.name)}</td>
                <td>${(m.combatPower || 0).toLocaleString()}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>`}
      </div>

    </div>

    <div class="dashboard-panel">
      <h3 data-i18n="recentActivity">${t("recentActivity")}</h3>
      ${recentActivity.length === 0 ? `<p class="empty-state">${t("noActivity")}</p>` : `
      <div class="activity-list">
        ${recentActivity.map(a => `
          <div class="activity-item">
            <span class="activity-text">${escapeHtml(a.text)}</span>
            <span class="activity-date">${a.date ? formatDateTime(a.date) : ""}</span>
          </div>
        `).join("")}
      </div>`}
    </div>
  `;
}
