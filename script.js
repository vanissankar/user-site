/**** 1) Configure your Google Drive RAW JSON URL here ****/
// Example: https://drive.google.com/uc?export=download&id=YOUR_FILE_ID
const TASKS_URL = "https://drive.google.com/uc?export=download&id=1s_Ee28zFCuRQf5WIA_v6n8gvNPrNlSCu";

/**** 2) Small helper: parse date safely ****/
function toDate(d) {
  if (!d) return null;
  // If date-only (YYYY-MM-DD), treat as local midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(`${d}T00:00:00`);
  // Otherwise let Date parse ISO (with timezone if present)
  const dt = new Date(d);
  return isNaN(dt) ? null : dt;
}

/**** 3) Time remaining text ****/
function remainingText(deadline) {
  const now = new Date();
  const diff = deadline - now;
  if (diff <= 0) return "⏰ Deadline passed";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${d}d ${h}h ${m}m left`;
}

/**** 4) Status badge class ****/
function statusClass(deadline) {
  const now = new Date();
  const diff = deadline - now;
  if (diff <= 0) return "overdue";
  if (diff < 3 * 86400000) return "soon"; // < 3 days
  return "ok";
}

/**** 5) Render tasks ****/
function render(tasks) {
  const container = document.getElementById("task-container");
  const empty = document.getElementById("empty");
  container.innerHTML = "";

  if (!tasks || tasks.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  // Sort by deadline (earliest first), undefined deadlines last
  tasks.sort((a, b) => {
    const da = toDate(a.deadline), db = toDate(b.deadline);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });

  for (const t of tasks) {
    const dl = toDate(t.deadline);
    const hasDeadline = !!dl;
    const status = hasDeadline ? statusClass(dl) : "ok";
    const left = hasDeadline ? remainingText(dl) : "No deadline";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${t.name || "(Untitled task)"}</h3>
      <div class="meta">
        <span><strong>ID:</strong> ${t.id || "-"}</span>
        ${hasDeadline ? ` • <span class="deadline"><strong>Deadline:</strong> ${dl.toLocaleString()}</span>` : ""}
        <span class="badge ${status}" style="margin-left:6px">${left}</span>
      </div>
      <p>${t.description ? escapeHtml(t.description) : ""}</p>
      ${t.attachment ? `<a class="button" href="${t.attachment}" target="_blank" rel="noopener">📎 Attachment</a>` : ""}
    `;
    container.appendChild(card);
  }
}

/**** 6) Basic XSS-safe text ****/
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/**** 7) Fetch with cache-bust & robust JSON parse (Drive sometimes sets content-type oddly) ****/
async function fetchTasks() {
  const errorEl = document.getElementById("error");
  try {
    const res = await fetch(TASKS_URL + (TASKS_URL.includes('?') ? '&' : '?') + 't=' + Date.now());
    const text = await res.text();
    // If Drive ever returns HTML (e.g., permission error), this will throw:
    const data = JSON.parse(text);
    errorEl.hidden = true;
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Failed to fetch/parse tasks.json", e);
    errorEl.hidden = false;
    return [];
  }
}

/**** 8) Live search ****/
function setupSearch(tasks) {
  const input = document.getElementById("search");
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    const filtered = tasks.filter(t =>
      (t.name || "").toLowerCase().includes(q) ||
      (t.id || "").toLowerCase().includes(q)
    );
    render(filtered);
  });
}

/**** 9) Last updated stamp ****/
function setLastUpdated() {
  const el = document.getElementById("last-updated");
  el.textContent = "Last updated: " + new Date().toLocaleString();
}

/**** 10) Bootstrap ****/
let allTasks = [];
async function loadAndRender() {
  allTasks = await fetchTasks();
  render(allTasks);
  setLastUpdated();
  // Connect search after initial load
  if (!loadAndRender._inited) {
    setupSearch(allTasks);
    loadAndRender._inited = true;
  }
}

loadAndRender();
// Refresh every 60s
setInterval(loadAndRender, 60000);
