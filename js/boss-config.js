async function loadBossConfig() {
  const firestoreBosses = await getCollection("bosses");
  const bossMap = {};
  firestoreBosses.forEach(b => {
    bossMap[b.id] = b.points;
  });
  BOSSES.forEach(b => {
    if (bossMap[b.id] !== undefined) {
      b.points = bossMap[b.id];
    }
  });
}

async function saveBossPoints(bossId, points) {
  const existing = await getDocument("bosses", bossId);
  if (existing) {
    await setDocument("bosses", bossId, { id: bossId, points });
  } else {
    await addDocument("bosses", { id: bossId, points });
  }
  const boss = BOSSES.find(b => b.id === bossId);
  if (boss) boss.points = points;
  showToast(t("bossUpdated"), "success");
}

function renderBossConfigPage() {
  const container = $("bossConfigPage");
  if (!container) return;

  let html = `
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th data-i18n="name">${t("name")}</th>
            <th style="text-align:center" data-i18n="points">${t("points")}</th>
          </tr>
        </thead>
        <tbody>
  `;

  BOSSES.forEach(boss => {
    const displayName = getBossName(boss);
    html += `
      <tr>
        <td>${escapeHtml(displayName)}</td>
        <td style="text-align:center">
          <div class="boss-points-control">
            <button class="btn btn-sm btn-secondary" onclick="adjustBossPoints('${boss.id}', -1)">-</button>
            <input type="number" class="input boss-points-input" value="${boss.points}" min="0"
              data-boss-id="${boss.id}"
              onchange="onBossPointsChange('${boss.id}', this.value)"
              onkeydown="if(event.key==='Enter')this.blur()">
            <button class="btn btn-sm btn-secondary" onclick="adjustBossPoints('${boss.id}', 1)">+</button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function onBossPointsChange(bossId, value) {
  const parsed = parseInt(value, 10);
  if (!isNaN(parsed) && parsed >= 0) {
    saveBossPoints(bossId, parsed);
  } else {
    const boss = BOSSES.find(b => b.id === bossId);
    if (boss) {
      const input = document.querySelector(`.boss-points-input[data-boss-id="${bossId}"]`);
      if (input) input.value = boss.points;
    }
  }
}

function adjustBossPoints(bossId, delta) {
  const boss = BOSSES.find(b => b.id === bossId);
  if (!boss) return;
  const newPoints = Math.max(0, boss.points + delta);
  const input = document.querySelector(`.boss-points-input[data-boss-id="${bossId}"]`);
  if (input) input.value = newPoints;
  saveBossPoints(bossId, newPoints);
}

function renderBossList() {
  const list = $("bossList");
  if (!list) return;
  filterBossList();
}

function filterBossList() {
  const list = $("bossList");
  const searchInput = $("bossSearch");
  if (!list) return;

  const searchTerm = (searchInput ? searchInput.value : "").toLowerCase();

  const filtered = searchTerm
    ? BOSSES.filter(b => {
        const name = getBossName(b).toLowerCase();
        return name.includes(searchTerm) || b.id.includes(searchTerm);
      })
    : BOSSES;

  if (filtered.length === 0) {
    list.innerHTML = `<div class="select-empty">${t("noResults")}</div>`;
    return;
  }

  list.innerHTML = filtered.map(b => `
    <div class="select-item" onclick="selectBoss('${b.id}')">
      ${escapeHtml(getBossName(b))} (${b.points} ${t("points")})
    </div>
  `).join("");
}

function selectBoss(bossId) {
  const boss = BOSSES.find(b => b.id === bossId);
  if (!boss) return;

  attendanceState.selectedBoss = bossId;

  const chip = $("selectedBossChip");
  const display = $("selectedBossDisplay");
  if (chip && display) {
    chip.innerHTML = `${escapeHtml(getBossName(boss))} (${boss.points} ${t("points")}) <button class="chip-remove" onclick="clearBossSelection()">&times;</button>`;
    display.classList.remove("hidden");
  }

  const searchInput = $("bossSearch");
  if (searchInput) searchInput.value = "";
  filterBossList();
  updateAttendanceSummary();
}

function clearBossSelection() {
  attendanceState.selectedBoss = null;
  const display = $("selectedBossDisplay");
  if (display) display.classList.add("hidden");
  updateAttendanceSummary();
}
