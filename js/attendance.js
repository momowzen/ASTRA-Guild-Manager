let attendanceState = {
  ocrNames: [],
  matchedResults: [],
  selectedMembers: [],
  closeMatches: [],
  selectedBoss: null,
  selectedDate: jstDatetimeString(),
  isProcessing: false,
  uploadedFiles: [],
  _saving: false
};

function renderAttendancePage() {
  const container = $("attendancePage");
  if (!container) return;

  attendanceState.uploadedFiles = [];
  attendanceState.ocrNames = [];
  attendanceState.matchedResults = [];
  attendanceState.selectedMembers = [];
  attendanceState.closeMatches = [];
  attendanceState.selectedBoss = null;
  attendanceState.isProcessing = false;
  attendanceState._saving = false;

  container.innerHTML = `
    <div class="attendance-layout">
      <div class="attendance-left">
        <div class="card">
          <h3 data-i18n="uploadScreenshot">${t("uploadScreenshot")}</h3>
          <div class="upload-zone" id="uploadZone">
            <div class="upload-placeholder">
              <div class="upload-icon">📷</div>
              <p data-i18n="dragDrop">${t("dragDrop")}</p>
            </div>
            <input type="file" id="imageInput" accept="image/png,image/jpg,image/jpeg" class="hidden-input" multiple>
          </div>
          <div id="ocrProgress" class="ocr-progress">
            <div class="progress-bar"><div id="progressFill" class="progress-fill"></div></div>
            <span id="progressText" class="progress-text">${t("ocrReady")}</span>
          </div>
          <div id="previewContainer" class="preview-container"><div id="previewList" class="preview-thumb-list"></div></div>
        </div>

        <div class="attendance-row">
          <div class="card card-ocr-results">
            <h3 data-i18n="ocrResults">${t("ocrResults")}</h3>
            <div id="ocrResults" class="ocr-results">
              <p class="empty-state" data-i18n="noImage">${t("noImage")}</p>
            </div>
          </div>

          <div class="card card-close-matches">
            <h3 data-i18n="closeMatches">${t("closeMatches")}</h3>
            <div id="closeMatchesContainer" class="close-matches-list">
              <p class="empty-state" data-i18n="noCloseMatches">${t("noCloseMatches")}</p>
            </div>
          </div>
        </div>

        <div class="card card-matched-members">
          <h3 id="matchedMembersHeading" data-i18n="matchedMembers">${t("matchedMembers")}</h3>
          <div id="matchedMembersContainer" class="chips-container">
            <p class="empty-state" data-i18n="noMembers">${t("noMembers")}</p>
          </div>
        </div>
      </div>

      <div class="attendance-right">
        <div class="card">
          <h3 data-i18n="manualSearch">${t("manualSearch")}</h3>
          <div class="searchable-select">
            <input type="text" id="manualMemberSearch" class="input" data-i18n-placeholder="search" placeholder="${t("search")}" oninput="filterManualMemberList()">
            <div id="manualMemberList" class="select-dropdown"></div>
          </div>
        </div>

        <div class="card">
          <h3 data-i18n="bossSelector">${t("bossSelector")}</h3>
          <div class="searchable-select">
            <input type="text" id="bossSearch" class="input" data-i18n-placeholder="search" placeholder="${t("search")}" oninput="filterBossList()">
            <div id="bossList" class="select-dropdown"></div>
          </div>
          <div id="selectedBossDisplay" class="selected-display hidden">
            <span class="chip chip-selected" id="selectedBossChip"></span>
          </div>
        </div>

        <div class="card">
          <h3 data-i18n="datePicker">${t("datePicker")}</h3>
          <input type="datetime-local" id="attendanceDate" class="input" value="${attendanceState.selectedDate}">
        </div>

        <div class="card">
          <h3 data-i18n="attendanceSummary">${t("attendanceSummary")}</h3>
          <div id="attendanceSummary">
            <p><strong data-i18n="bossSelector">${t("bossSelector")}:</strong> <span id="summaryBoss">-</span></p>
            <p><strong data-i18n="bossPoints">${t("bossPoints")}:</strong> <span id="summaryPoints">0</span></p>
            <p><strong data-i18n="attendanceDate">${t("attendanceDate")}:</strong> <span id="summaryDate">-</span></p>
            <p><strong data-i18n="memberCount">${t("memberCount")}:</strong> <span id="summaryCount">0</span></p>
          </div>
          <button class="btn btn-primary btn-full" onclick="saveAttendance()" data-i18n="save">${t("save")}</button>
        </div>
      </div>
    </div>
  `;

  setupAttendanceListeners();
  renderBossList();
  renderManualMemberList();
  updateAttendanceSummary();
}

function setupAttendanceListeners() {
  const uploadZone = $("uploadZone");
  const imageInput = $("imageInput");

  if (uploadZone && imageInput) {
    uploadZone.onclick = () => imageInput.click();
    uploadZone.ondragover = e => { e.preventDefault(); uploadZone.classList.add("drag-over"); };
    uploadZone.ondragleave = () => uploadZone.classList.remove("drag-over");
    uploadZone.ondrop = e => {
      e.preventDefault();
      uploadZone.classList.remove("drag-over");
      if (e.dataTransfer.files.length > 0) {
        handleImageUpload(e.dataTransfer.files);
      }
    };
    imageInput.onchange = () => {
      if (imageInput.files.length > 0) {
        handleImageUpload(imageInput.files);
      }
    };
  }

  const dateInput = $("attendanceDate");
  if (dateInput) {
    dateInput.onchange = () => {
      attendanceState.selectedDate = dateInput.value;
      updateAttendanceSummary();
    };
  }
}

async function handleImageUpload(files) {
  const validTypes = ["image/png", "image/jpg", "image/jpeg"];
  for (const file of files) {
    if (validTypes.includes(file.type)) {
      attendanceState.uploadedFiles.push(file);
    }
  }
  if (attendanceState.uploadedFiles.length === 0) {
    showToast(t("uploadError"), "error");
    return;
  }

  renderPreviews();
  await runOcrOnAllFiles();
}

function renderPreviews() {
  const previewContainer = $("previewContainer");
  if (!previewContainer) return;

  const previewList = $("previewList");
  if (!previewList) return;
  previewList.innerHTML = "";
  if (attendanceState.uploadedFiles.length === 0) return;

  attendanceState.uploadedFiles.forEach((file, idx) => {
    const thumb = createElement("div", "preview-thumb");
    const img = createElement("img", "image-preview");
    const watermark = createElement("span", "preview-watermark");
    watermark.textContent = t("clickToView");
    const removeBtn = createElement("button", "preview-remove");
    removeBtn.textContent = "x";
    removeBtn.onclick = e => {
      e.stopPropagation();
      removeUploadedFile(idx);
    };

    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      img.src = dataUrl;
      img.onclick = () => showImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);

    thumb.appendChild(img);
    thumb.appendChild(watermark);
    thumb.appendChild(removeBtn);
    previewList.appendChild(thumb);
  });
}

function showImagePreview(dataUrl) {
  const overlay = createElement("div", "view-dialog-overlay");
  overlay.style.cursor = "zoom-out";
  const img = createElement("img", "image-preview-large");
  img.src = dataUrl;
  img.style.maxWidth = "90vw";
  img.style.maxHeight = "90vh";
  img.style.borderRadius = "var(--radius)";
  img.style.boxShadow = "var(--shadow-lg)";
  overlay.appendChild(img);
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

function removeUploadedFile(index) {
  attendanceState.uploadedFiles.splice(index, 1);
  if (attendanceState.uploadedFiles.length === 0) {
    attendanceState.ocrNames = [];
    attendanceState.matchedResults = [];
    attendanceState.selectedMembers = [];
    attendanceState.closeMatches = [];
    renderPreviews();
    renderOCRResults([]);
    renderMatchedMembers();
    renderCloseMatches();
    filterManualMemberList();
    updateAttendanceSummary();
    const progressText = $("progressText");
    if (progressText) progressText.textContent = t("ocrReady");
    return;
  }
  renderPreviews();
  runOcrOnAllFiles();
}

async function runOcrOnAllFiles() {
  const files = attendanceState.uploadedFiles;

  attendanceState.ocrNames = [];
  attendanceState.matchedResults = [];
  attendanceState.selectedMembers = [];
  attendanceState.closeMatches = [];

  const allLines = [];
  for (let i = 0; i < files.length; i++) {
    await processOCR(files[i], i + 1, files.length, allLines);
  }

  const unique = [...new Set(allLines)];
  attendanceState.ocrNames = unique;
  runMatching(unique);
  renderOCRResults(unique);
  const progressText = $("progressText");
  if (progressText) progressText.textContent = t("ocrReady");
}

async function processOCR(imageFile, fileIndex, totalFiles, allLines) {
  const progressText = $("progressText");
  const progressFill = $("progressFill");

  try {
    const label = totalFiles > 1 ? `[${fileIndex}/${totalFiles}] ` : "";
    if (progressFill) progressFill.style.width = "0%";
    if (progressText) progressText.textContent = label + t("ocrProcessing");

    const lines = await performOCR(imageFile, progress => {
      if (progressFill) progressFill.style.width = `${progress}%`;
      if (progressText) progressText.textContent = `${label}${t("ocrProcessing")} ${progress}%`;
    });

    allLines.push(...lines);
  } catch (err) {
    console.error("OCR error:", err);
    showToast(t("ocrFailed"), "error");
  }
}

function renderOCRResults(lines) {
  const container = $("ocrResults");
  const heading = $("matchedMembersHeading");

  if (!container) return;

  if (!lines || lines.length === 0) {
    container.innerHTML = `<p class="empty-state" data-i18n="noImage">${t("noImage")}</p>`;
    if (heading) heading.textContent = t("matchedMembers");
    return;
  }

  container.innerHTML = lines.map(line => `<span class="ocr-line">${escapeHtml(line)}</span>`).join("");

  if (heading) {
    const matchedCount = attendanceState.selectedMembers.length;
    heading.textContent = `${t("matchedMembers")} (${matchedCount} / ${lines.length})`;
  }
}

function runMatching(ocrNames) {
  const members = getMembers();
  const { results } = fuzzyMatchMembers(ocrNames, members);

  attendanceState.matchedResults = results;

  results.forEach(r => {
    if (r.member && !attendanceState.selectedMembers.find(m => m.id === r.member.id)) {
      attendanceState.selectedMembers.push({
        id: r.member.id,
        name: r.member.name,
        confidence: r.confidence,
        source: "ocr"
      });
    }
  });

  attendanceState.closeMatches = results
    .filter(r => !r.member && r.closestMatch)
    .map(r => ({
      ocrName: r.ocrName,
      closestMember: r.closestMatch,
      confidence: r.closestScore
    }));

  renderMatchedMembers();
  renderCloseMatches();
  filterManualMemberList();
  updateAttendanceSummary();
}

function renderMatchedMembers() {
  const container = $("matchedMembersContainer");
  if (!container) return;

  if (attendanceState.selectedMembers.length === 0) {
    container.innerHTML = `<p class="empty-state" data-i18n="noMembers">${t("noMembers")}</p>`;
    return;
  }

  container.innerHTML = attendanceState.selectedMembers.map(m => {
    return `
      <div class="chip" data-member-id="${m.id}">
        <span class="chip-name">${escapeHtml(m.name)}</span>
        <button class="chip-remove" onclick="removeMatchedMember('${m.id}')">&times;</button>
      </div>
    `;
  }).join("");
}

function removeMatchedMember(id) {
  attendanceState.selectedMembers = attendanceState.selectedMembers.filter(m => m.id !== id);
  renderMatchedMembers();
  filterManualMemberList();
  updateAttendanceSummary();
}

function renderCloseMatches() {
  const container = $("closeMatchesContainer");
  if (!container) return;

  if (attendanceState.closeMatches.length === 0) {
    container.innerHTML = `<p class="empty-state" data-i18n="noCloseMatches">${t("noCloseMatches")}</p>`;
    return;
  }

  container.innerHTML = attendanceState.closeMatches.map((cm, idx) => `
    <div class="close-match-item" onclick="addCloseMatch(${idx})">
      <span class="close-match-name">${escapeHtml(cm.ocrName)}</span>
      <span class="close-match-arrow">→</span>
      <span class="close-match-suggest">${escapeHtml(cm.closestMember.name)}</span>
      <span class="close-match-conf">${cm.confidence}%</span>
    </div>
  `).join("");
}

function addCloseMatch(index) {
  const cm = attendanceState.closeMatches[index];
  if (!cm) return;

  if (attendanceState.selectedMembers.find(m => m.id === cm.closestMember.id)) {
    showToast(t("duplicateNotAllowed"), "warning");
    return;
  }

  attendanceState.selectedMembers.push({
    id: cm.closestMember.id,
    name: cm.closestMember.name,
    confidence: cm.confidence,
    source: "ocr"
  });

  attendanceState.closeMatches.splice(index, 1);
  renderMatchedMembers();
  renderCloseMatches();
  filterManualMemberList();
  updateAttendanceSummary();
}

function updateAttendanceSummary() {
  const bossEl = $("summaryBoss");
  const pointsEl = $("summaryPoints");
  const dateEl = $("summaryDate");
  const countEl = $("summaryCount");

  if (bossEl) {
    const boss = BOSSES.find(b => b.id === attendanceState.selectedBoss);
    bossEl.textContent = boss ? getBossName(boss) : "-";
  }
  if (pointsEl) {
    const boss = BOSSES.find(b => b.id === attendanceState.selectedBoss);
    pointsEl.textContent = boss ? boss.points : 0;
  }
  if (dateEl) {
    const raw = attendanceState.selectedDate;
    if (raw) {
      const [datePart, timePart] = raw.split("T");
      const [y, m, d] = datePart.split("-");
      dateEl.textContent = `${parseInt(m)}/${parseInt(d)}/${y} ${timePart}`;
    } else {
      dateEl.textContent = "-";
    }
  }
  if (countEl) {
    countEl.textContent = attendanceState.selectedMembers.length;
  }
}

async function saveAttendance() {
  if (attendanceState._saving) return;
  if (!attendanceState.selectedBoss) {
    showToast(t("bossSelector") + " " + t("error"), "warning");
    return;
  }
  if (attendanceState.selectedMembers.length === 0) {
    showToast(t("noMembers"), "warning");
    return;
  }
  if (!attendanceState.selectedDate) {
    showToast(t("datePicker") + " " + t("error"), "warning");
    return;
  }
  attendanceState._saving = true;

  const boss = BOSSES.find(b => b.id === attendanceState.selectedBoss);
  const bossName = getBossName(boss);
  const bossPoints = boss ? boss.points : 0;
  const memberNames = attendanceState.selectedMembers.map(m => m.name);

  const summaryMsg = `${t("confirmSave")}\n\n${t("bossSelector")}: ${bossName}\n${t("bossPoints")}: ${bossPoints}\n${t("attendanceDate")}: ${attendanceState.selectedDate}\n${t("memberCount")}: ${attendanceState.selectedMembers.length}\n${t("membersList")}: ${memberNames.join(", ")}`;

  const confirmed = await showConfirm(summaryMsg);
  if (!confirmed) {
    attendanceState._saving = false;
    return;
  }

  showLoading(true);
  try {
    const attendanceData = {
      bossId: attendanceState.selectedBoss,
      bossName: bossName,
      bossPoints: bossPoints,
      date: new Date(attendanceState.selectedDate),
      members: memberNames,
      createdAt: nowJST(),
      language: currentLang
    };

    await addDocument("attendance", attendanceData);

    for (const m of attendanceState.selectedMembers) {
      await rewardMemberPoints(m.id, bossPoints);
    }

    attendanceState.selectedMembers = [];
    attendanceState.selectedBoss = null;
    attendanceState.ocrNames = [];
    attendanceState.matchedResults = [];
    attendanceState.closeMatches = [];
    attendanceState.uploadedFiles = [];

    renderAttendancePage();
    showToast(t("saveSuccess"), "success");
  } catch (err) {
    console.error("Save error:", err);
    showToast(t("error") + ": " + err.message, "error");
  } finally {
    attendanceState._saving = false;
    showLoading(false);
  }
}

function renderPageLabels() {
  const page = getCurrentPage();
  if (page === "attendance") {
    if (typeof updateAttendanceSummary === "function") updateAttendanceSummary();
    if (typeof filterBossList === "function") filterBossList();
    if (typeof filterManualMemberList === "function") filterManualMemberList();
  }
}
