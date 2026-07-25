let membersCache = [];

async function loadMembers() {
  membersCache = await getCollection("members");
  return membersCache;
}

function getMembers() {
  return membersCache;
}

function getMemberById(id) {
  return membersCache.find(m => m.id === id) || null;
}

function getMemberByName(name) {
  const lower = name.toLowerCase().trim();
  return membersCache.find(m => m.name.toLowerCase() === lower) || null;
}

async function addMember(name) {
  const now = nowJST();
  const data = {
    name: name.trim(),
    points: 0,
    attendanceCount: 0,
    lastAttendance: null,
    createdAt: now,
    updatedAt: now
  };
  const doc = await addDocument("members", data);
  membersCache.push(doc);
  return doc;
}

async function updateMember(id, data) {
  data.updatedAt = nowJST();
  const doc = await setDocument("members", id, data);
  const idx = membersCache.findIndex(m => m.id === id);
  if (idx >= 0) {
    membersCache[idx] = { ...membersCache[idx], ...doc };
  }
  return doc;
}

async function deleteMember(id) {
  await deleteDocument("members", id);
  membersCache = membersCache.filter(m => m.id !== id);
}

async function rewardMemberPoints(id, points) {
  const member = getMemberById(id);
  if (!member) return;
  const now = nowJST();
  const data = {
    points: (member.points || 0) + points,
    attendanceCount: (member.attendanceCount || 0) + 1,
    lastAttendance: now,
    updatedAt: now
  };
  await updateMember(id, data);
}

function getFilteredMembers() {
  const searchTerm = ($("membersSearch") || {}).value || "";
  return searchTerm
    ? membersCache.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : membersCache;
}

function renderMemberRows(members) {
  if (members.length === 0) {
    return `<tr><td colspan="2" class="empty-state">${t("noResults")}</td></tr>`;
  }
  return members.map(m => `
    <tr>
      <td>${escapeHtml(m.name)}</td>
      <td class="actions-cell">
        <button class="btn btn-sm btn-secondary" onclick="showEditMemberDialog('${m.id}')" data-i18n="edit">${t("edit")}</button>
        <button class="btn btn-sm btn-danger" onclick="confirmDeleteMember('${m.id}')" data-i18n="delete">${t("delete")}</button>
      </td>
    </tr>
  `).join("");
}

function clearMembersSearch() {
  const input = $("membersSearch");
  if (input) {
    input.value = "";
    filterMembers();
  }
}

function filterMembers() {
  const tbody = $("membersTbody");
  if (!tbody) return;
  const filtered = getFilteredMembers();
  tbody.innerHTML = renderMemberRows([...filtered].sort((a, b) => (b.points || 0) - (a.points || 0)));
}

function renderMembersPage() {
  const container = $("membersPage");
  if (!container) return;

  const filtered = getFilteredMembers();
  const sorted = [...filtered].sort((a, b) => (b.points || 0) - (a.points || 0));

  let html = `
    <div class="members-toolbar">
      <div class="search-wrapper">
        <input type="text" id="membersSearch" class="input" data-i18n-placeholder="search" placeholder="${t("search")}" oninput="filterMembers()">
        <button class="search-clear" onclick="clearMembersSearch()">&times;</button>
      </div>
      <button class="btn btn-primary" onclick="showAddMemberDialog()" data-i18n="addMember">${t("addMember")}</button>
    </div>
    <div class="table-container">
      <table class="table">
        <thead>
          <tr>
            <th data-i18n="name">${t("name")}</th>
            <th data-i18n="actions">${t("actions")}</th>
          </tr>
        </thead>
        <tbody id="membersTbody">
          ${renderMemberRows(sorted)}
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;
}

function showAddMemberDialog() {
  const overlay = createElement("div", "confirm-overlay");
  const dialog = createElement("div", "confirm-dialog");
  dialog.style.maxWidth = "480px";

  dialog.innerHTML = `
    <h3 style="margin-bottom:12px;font-size:18px;">${t("addMemberTitle")}</h3>
    <p style="margin-bottom:8px;font-size:13px;color:var(--text-secondary);">${t("addMemberBatchHint")}</p>
    <textarea id="batchMemberInput" class="input" style="min-height:120px;resize:vertical;" placeholder="${escapeHtml(t("memberName"))}"></textarea>
    <div style="margin-top:12px;display:flex;gap:12px;justify-content:flex-end;">
      <button class="btn btn-secondary" id="cancelBatchBtn">${t("cancel")}</button>
      <button class="btn btn-primary" id="confirmBatchBtn">${t("addMember")}</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("confirm-visible"));

  const textarea = dialog.querySelector("#batchMemberInput");
  textarea.focus();

  const cleanup = () => {
    overlay.classList.remove("confirm-visible");
    setTimeout(() => overlay.remove(), 300);
  };

  dialog.querySelector("#cancelBatchBtn").onclick = cleanup;
  overlay.onclick = e => { if (e.target === overlay) cleanup(); };

  dialog.querySelector("#confirmBatchBtn").onclick = async () => {
    const raw = textarea.value;
    if (!raw.trim()) return;

    const names = raw
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const unique = [...new Set(names)];
    let added = 0;
    for (const name of unique) {
      if (!getMemberByName(name)) {
        await addMember(name);
        added++;
      }
    }

    cleanup();
    renderMembersPage();
    if (added > 0) {
      showToast(`${added} ${t("memberAdded")}`, "success");
    }
  };
}

function showEditMemberDialog(id) {
  const member = getMemberById(id);
  if (!member) return;
  const name = prompt(t("memberName"), member.name);
  if (name && name.trim() && name.trim() !== member.name) {
    updateMember(id, { name: name.trim() }).then(() => {
      renderMembersPage();
      showToast(t("memberUpdated"), "success");
    });
  }
}

async function confirmDeleteMember(id) {
  const confirmed = await showConfirm(t("confirmDeleteMember"));
  if (confirmed) {
    await deleteMember(id);
    renderMembersPage();
    showToast(t("memberDeleted"), "success");
  }
}
