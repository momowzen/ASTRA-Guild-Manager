let currentPage = "dashboard";
let firebaseReady = false;

document.addEventListener("DOMContentLoaded", async () => {
  loadLanguage();
  updateAllLabels();

  const firebaseLoaded = initFirebase();
  firebaseReady = firebaseLoaded;

  await initTesseract();
  await loadMembers();
  await loadBossConfig();

  setupNavigation();
  setupLanguageToggle();
  navigateTo("dashboard");
});

function setupNavigation() {
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page) navigateTo(page);
    });
  });
}

async function navigateTo(page) {
  currentPage = page;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("page-active"));
  const targetPage = $(page + "Page");
  if (targetPage) targetPage.classList.add("page-active");

  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("nav-active", item.dataset.page === page);
  });

  await renderPage(page);
}

function getCurrentPage() {
  return currentPage;
}

async function renderPage(page) {
  switch (page) {
    case "dashboard":
      await renderDashboard();
      break;
    case "attendance":
      renderAttendancePage();
      break;
    case "ranking":
      renderRankingPage();
      break;
    case "members":
      renderMembersPage();
      break;
    case "bossConfig":
      renderBossConfigPage();
      break;
    case "history":
      renderHistoryPage();
      break;
  }
}

function setupLanguageToggle() {
  const toggle = $("langToggle");
  if (!toggle) return;
  toggle.textContent = currentLang.toUpperCase();

  toggle.addEventListener("click", () => {
    const langs = ["en", "ko", "ja"];
    const idx = langs.indexOf(currentLang);
    const next = langs[(idx + 1) % langs.length];
    setLanguage(next);

    const page = getCurrentPage();
    renderPage(page);
  });
}
