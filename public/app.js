const goal = document.querySelector("#goal");
const note = document.querySelector("#note");
const form = document.querySelector("#goal-form");
const runButton = document.querySelector("#run-btn");
const demoButton = document.querySelector("#demo-btn");
const empty = document.querySelector("#empty");
const trace = document.querySelector("#trace");
const statusText = document.querySelector("#status-text");

function showTrace(data) {
  empty.classList.add("hidden");
  trace.classList.remove("hidden");
  const blocked = data.status !== "allowed";
  const label = data.status === "blocked" ? "BLOCKED" : "FAILED";
  trace.innerHTML = `
    <div class="trace-row"><span class="trace-label">Policy decision</span><span class="trace-value ${blocked ? "result-blocked" : "result-allowed"}">${blocked ? `⛔ ${label}` : "✅ ALLOWED"}${data.status === "failed" ? "" : " by ArmorIQ"}</span></div>
    <div class="trace-row"><span class="trace-label">MCP tool</span><span class="trace-value">${data.tool ?? "—"}</span></div>
    <div class="trace-row"><span class="trace-label">${blocked ? "Reason" : "MCP result"}</span><span class="trace-value">${escapeHtml(blocked ? data.reason : data.result)}</span></div>
    <div class="trace-row"><span class="trace-label">Audit</span><span class="trace-value">${data.status === "failed" ? "Execution failed; check server logs" : "Outcome reported to ArmorIQ"}</span></div>`;
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}
async function run() {
  runButton.disabled = true;
  runButton.innerHTML = "Checking intent <span>…</span>";
  try {
    const response = await fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ goal: goal.value, note: note.value }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "The action failed.");
    showTrace(data);
  } catch (error) {
    showTrace({ status: "failed", tool: "not executed", reason: error.message });
  } finally {
    runButton.disabled = false;
    runButton.innerHTML = "Run guarded action <span>→</span>";
  }
}
form.addEventListener("submit", (event) => { event.preventDefault(); run(); });
document.querySelectorAll("[data-goal]").forEach((button) => button.addEventListener("click", () => { goal.value = button.dataset.goal; run(); }));
demoButton.addEventListener("click", () => { goal.value = "Read the non-sensitive demo brief"; run(); });
fetch("/api/status")
  .then((response) => response.json())
  .then((data) => {
    statusText.textContent = data.configured ? "Configuration ready" : "Setup required";
    if (!data.configured) statusText.previousElementSibling.style.background = "#ffb26d";
  })
  .catch(() => {
    statusText.textContent = "Service unavailable";
    statusText.previousElementSibling.style.background = "#ff806d";
  });
