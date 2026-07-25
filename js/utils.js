function $(id) {
  return document.getElementById(id);
}

function $$(selector, parent) {
  return (parent || document).querySelectorAll(selector);
}

function qs(selector, parent) {
  return (parent || document).querySelector(selector);
}

function createElement(tag, className, attributes) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
  }
  return el;
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

function formatDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  return d.toISOString().split("T")[0];
}

function formatDateTime(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleString();
}

const CJK = "\\u4e00-\\u9fff\\u3040-\\u309f\\u30a0-\\u30ff\\u3000-\\u303f";

function normalizeText(text) {
  return text
    .replace(/rn/g, "m")
    .replace(/vv/g, "w")
    .replace(new RegExp(`[^a-zA-Z0-9가-힣${CJK}\\s'-]`, "g"), "")
    .trim();
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function similarity(a, b) {
  const aNorm = a.toLowerCase().trim();
  const bNorm = b.toLowerCase().trim();
  if (aNorm === bNorm) return 100;
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) {
    const maxLen = Math.max(aNorm.length, bNorm.length);
    const minLen = Math.min(aNorm.length, bNorm.length);
    return Math.round((minLen / maxLen) * 90 + 10);
  }
  const dist = levenshteinDistance(aNorm, bNorm);
  const maxLen = Math.max(aNorm.length, bNorm.length);
  if (maxLen === 0) return 100;
  return Math.round((1 - dist / maxLen) * 100);
}

function getConfidenceClass(confidence) {
  if (confidence >= 95) return "confidence-high";
  if (confidence >= 80) return "confidence-mid";
  return "confidence-low";
}

function showToast(message, type) {
  const container = qs(".toast-container");
  if (!container) return;

  const toast = createElement("div", `toast toast-${type || "info"}`);
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("toast-visible");
  });

  setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showConfirm(message) {
  return new Promise(resolve => {
    const overlay = createElement("div", "confirm-overlay");
    const dialog = createElement("div", "confirm-dialog");
    const msg = createElement("p", "confirm-message");
    msg.textContent = message;
    const btnRow = createElement("div", "confirm-buttons");
    const cancelBtn = createElement("button", "btn btn-secondary");
    cancelBtn.textContent = t("cancel");
    const confirmBtn = createElement("button", "btn btn-primary");
    confirmBtn.textContent = t("confirm");

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    dialog.appendChild(msg);
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => overlay.classList.add("confirm-visible"));

    const cleanup = result => {
      overlay.classList.remove("confirm-visible");
      setTimeout(() => overlay.remove(), 300);
      resolve(result);
    };

    cancelBtn.onclick = () => cleanup(false);
    confirmBtn.onclick = () => cleanup(true);
    overlay.onclick = e => {
      if (e.target === overlay) cleanup(false);
    };
  });
}

function showLoading(show) {
  const existing = qs(".loading-overlay");
  if (show) {
    if (existing) return;
    const overlay = createElement("div", "loading-overlay");
    const spinner = createElement("div", "loading-spinner");
    overlay.appendChild(spinner);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("loading-visible"));
  } else {
    if (existing) {
      existing.classList.remove("loading-visible");
      setTimeout(() => existing.remove(), 300);
    }
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function nowJST() {
  const now = new Date();
  const jstOffset = 9 * 60;
  const localOffset = now.getTimezoneOffset();
  return new Date(now.getTime() + (jstOffset + localOffset) * 60000);
}

function jstDatetimeString() {
  return nowJST().toISOString().slice(0, 16);
}
