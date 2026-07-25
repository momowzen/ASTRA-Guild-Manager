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
