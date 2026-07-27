let membersCache = [];
let membersSort = { field: "name", asc: true };

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
    combatPower: 0,
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
    return `<tr><td colspan="3" class="empty-state">${t("noResults")}</td></tr>`;
  }
  return members.map(m => `
    <tr>
      <td>${escapeHtml(m.name)}</td>
      <td>${(m.combatPower || 0).toLocaleString()}</td>
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

function sortMembers(members) {
  return [...members].sort((a, b) => {
    let cmp;
    if (membersSort.field === "combatPower") {
      cmp = (a.combatPower || 0) - (b.combatPower || 0);
    } else {
      cmp = a.name.localeCompare(b.name);
    }
    return membersSort.asc ? cmp : -cmp;
  });
}

function filterMembers() {
  const tbody = $("membersTbody");
  if (!tbody) return;
  const filtered = getFilteredMembers();
  tbody.innerHTML = renderMemberRows(sortMembers(filtered));
}

function renderMembersPage() {
  const container = $("membersPage");
  if (!container) return;

  const filtered = getFilteredMembers();

  const nameArrow = membersSort.field === "name" ? (membersSort.asc ? " ▲" : " ▼") : "";
  const cpArrow = membersSort.field === "combatPower" ? (membersSort.asc ? " ▲" : " ▼") : "";

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
            <th class="sortable-th" onclick="toggleSort('name')">${t("name")}${nameArrow}</th>
            <th class="sortable-th" onclick="toggleSort('combatPower')">${t("combatPower")}${cpArrow}</th>
            <th data-i18n="actions">${t("actions")}</th>
          </tr>
        </thead>
        <tbody id="membersTbody">
          ${renderMemberRows(sortMembers(filtered))}
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

  const overlay = createElement("div", "confirm-overlay");
  const dialog = createElement("div", "confirm-dialog");
  dialog.style.maxWidth = "420px";

  dialog.innerHTML = `
    <h3 style="margin-bottom:12px;font-size:18px;">${t("editMember")}</h3>
    <label style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:4px;">${t("name")}</label>
    <input type="text" id="editMemberInput" class="input" value="${escapeHtml(member.name)}" style="margin-bottom:12px;">
    <label style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:4px;">${t("combatPower")}</label>
    <input type="text" id="editCpInput" class="input" value="${(member.combatPower || 0).toLocaleString()}" min="0" style="margin-bottom:12px;">
    <div style="display:flex;gap:12px;justify-content:flex-end;">
      <button class="btn btn-secondary" id="cancelEditBtn">${t("cancel")}</button>
      <button class="btn btn-primary" id="confirmEditBtn">${t("save")}</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("confirm-visible"));

  const nameInput = dialog.querySelector("#editMemberInput");
  const cpInput = dialog.querySelector("#editCpInput");
  nameInput.focus();
  nameInput.select();

  const cleanup = () => {
    overlay.classList.remove("confirm-visible");
    setTimeout(() => overlay.remove(), 300);
  };

  dialog.querySelector("#cancelEditBtn").onclick = cleanup;
  overlay.onclick = e => { if (e.target === overlay) cleanup(); };

  dialog.querySelector("#confirmEditBtn").onclick = async () => {
    const name = nameInput.value.trim();
    const combatPower = parseInt(cpInput.value.replace(/,/g, ""), 10) || 0;
    const updateData = { combatPower };
    if (name && name !== member.name) {
      updateData.name = name;
    }
    await updateMember(id, updateData);
    renderMembersPage();
    showToast(t("memberUpdated"), "success");
    cleanup();
  };

  nameInput.onkeydown = e => {
    if (e.key === "Enter") dialog.querySelector("#confirmEditBtn").click();
    if (e.key === "Escape") cleanup();
  };
}

function toggleSort(field) {
  if (membersSort.field === field) {
    membersSort.asc = !membersSort.asc;
  } else {
    membersSort.field = field;
    membersSort.asc = true;
  }
  renderMembersPage();
}

async function confirmDeleteMember(id) {
  const confirmed = await showConfirm(t("confirmDeleteMember"));
  if (confirmed) {
    await deleteMember(id);
    renderMembersPage();
    showToast(t("memberDeleted"), "success");
  }
}

function renderManualMemberList() {
  const list = $("manualMemberList");
  if (!list) return;
  filterManualMemberList();
}

function filterManualMemberList() {
  const list = $("manualMemberList");
  const searchInput = $("manualMemberSearch");
  if (!list) return;

  const searchTerm = (searchInput ? searchInput.value : "").toLowerCase();
  const selectedIds = new Set(attendanceState.selectedMembers.map(m => m.id));

  const available = membersCache.filter(m => !selectedIds.has(m.id));
  const filtered = searchTerm
    ? available.filter(m => m.name.toLowerCase().includes(searchTerm))
    : available;
  const display = filtered;

  if (display.length === 0) {
    list.innerHTML = `<div class="select-empty">${t("noResults")}</div>`;
    return;
  }

  list.innerHTML = display.map(m => `
    <div class="select-item" onclick="addManualMember('${m.id}')">
      ${escapeHtml(m.name)}
    </div>
  `).join("");
}

function addManualMember(id) {
  const member = getMemberById(id);
  if (!member) return;

  if (attendanceState.selectedMembers.find(m => m.id === id)) {
    showToast(t("duplicateNotAllowed"), "warning");
    return;
  }

  attendanceState.selectedMembers.push({
    id: member.id,
    name: member.name,
    confidence: 100,
    source: "manual"
  });

  renderMatchedMembers();
  filterManualMemberList();
  updateAttendanceSummary();
}
