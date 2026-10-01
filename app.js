const config = window.CAPSTONE_CONFIG || { apiUrl: "" };
const storageKey = "capstone-research-hub-v2";
const projects = [
  { id:"SoAI-092", shortTitle:"Face Recognition Attendance", title:"Mark Attendance Using Face Recognition and Login System", guide:"Bipul Kumar", domain:"Artificial Intelligence, Computer Vision, Biometrics", students:["Prakriti Kumari","Prakriti Singh"], description:"A privacy-aware attendance system designed to reduce proxy attendance and improve marking reliability under real-world conditions." },
  { id:"LA7187", shortTitle:"Traffic Control with Agentic AI", title:"Traffic Control System Using ML and Agentic AI", guide:"Bipul Kumar", domain:"Decision Systems, Agentic and Autonomous Intelligence", students:["Manthan Mehra","Ayush Mehta"], description:"A predictive traffic-control system that evaluates live and historical conditions to support proactive lane allocation and signal decisions." },
  { id:"SoAI-424", shortTitle:"Smart Video Learning Assistant", title:"Smart Video Learning Assistant", guide:"Bipul Shahi", domain:"Artificial Intelligence, Natural Language Processing, Educational Technology", students:["Aman Kaushal","Vedant Kasaudhan"], description:"Timestamp-aware note and quiz generation from YouTube lectures using semantic segmentation." },
];
const milestones = [
  ["Problem identification and literature review · 21 Sep–7 Oct", "Approved problem, 40 screened sources, review matrix, gap statement, and venue shortlist"],
  ["Methodology · 8–14 Oct", "System design, data/permission record, baselines, metrics, experiment protocol, and contribution claim"],
  ["Result analysis · 1–10 Nov", "Experiment log, comparison table, figures, error analysis, and ablation or sensitivity check where feasible"],
  ["Conclusion and first draft · 11–25 Nov", "Evidence-based conclusion, complete draft, citation audit, authorship record, and guide review"],
  ["Presentation, viva and TRL/submission status · 26 Nov–5 Dec", "Viva evidence, reproducibility package, venue checklist, submission/TRL status, and guide sign-off"],
];
const defaultState = { activeProjectId:"SoAI-092", papers:[], interactions:[] };
let state = JSON.parse(localStorage.getItem(storageKey) || "null") || defaultState;
if (!projects.some(project => project.id === state.activeProjectId)) state = defaultState;

function saveState() { localStorage.setItem(storageKey, JSON.stringify(state)); }
function esc(value) { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function currentProject() { return projects.find(project => project.id === state.activeProjectId); }
function currentPapers() { return state.papers.filter(p => p.projectId === state.activeProjectId); }
function count(type) { return currentPapers().filter(p => p.type === type).length; }
function render() {
  const project = currentProject(), papers = currentPapers(), total = papers.length, journals = count("Journal"), conferences = count("Conference");
  const selector = document.querySelector("#project-selector");
  selector.innerHTML = projects.map(item => `<option value="${item.id}">${item.id} · ${esc(item.shortTitle)}</option>`).join(""); selector.value = project.id;
  document.querySelector("#project-kicker").textContent = `${project.id} · ${project.students.join(" and ")} · Guide: ${project.guide}`;
  document.querySelector("#project-title").textContent = project.title;
  document.querySelector("#project-description").textContent = `${project.description} Domain: ${project.domain}.`;
  document.querySelector("#paper-count").textContent = `${total} / 40 papers`;
  document.querySelector("#journal-count").textContent = `${journals} / 30`;
  document.querySelector("#conference-count").textContent = `${conferences} / 10`;
  document.querySelector("#reviewed-count").textContent = papers.filter(p => p.reviewed).length;
  document.querySelector("#interaction-count").textContent = state.interactions.filter(item => item.projectId === project.id).length;
  document.querySelector("#paper-progress").style.width = `${Math.min(100, total / 40 * 100)}%`;
  document.querySelector("#milestone-list").innerHTML = milestones.map(([title, detail]) => `<li>${esc(title)}<small>${esc(detail)}</small></li>`).join("");
  document.querySelector("#assignments").innerHTML = project.students.map(name => `<div class="assignment"><div class="assignment-header"><span>${esc(name)}</span><span class="status status-progress">Pending</span></div><p>Find and screen 20 sources, then complete review fields for assigned papers.</p></div>`).join("");
  document.querySelector("[name=owner]").innerHTML = project.students.map(name => `<option>${esc(name)}</option>`).join("");
  document.querySelector("#paper-table").innerHTML = papers.length ? papers.map(p => `<tr><td><a href="${esc(p.sourceUrl)}" target="_blank" rel="noreferrer">${esc(p.title)}</a><small>${esc(p.authorYear)}</small></td><td><span class="tag">${esc(p.type)}</span></td><td>${esc(p.owner)}</td><td>${p.reviewed ? "Reviewed" : "Screened"}</td></tr>`).join("") : `<tr><td colspan="4">No papers added yet. Start with title screening before downloading or reviewing.</td></tr>`;
  const latest = state.interactions.filter(item => item.projectId === project.id).at(-1);
  document.querySelector("#latest-interaction").innerHTML = latest ? `<div class="interaction-record"><strong>${esc(latest.date)} · ${esc(latest.mode)}</strong><p>${esc(latest.feedback)}</p><span>Next action: ${esc(latest.actionItems)}</span></div>` : "No guide interaction has been recorded yet.";
}
async function sync(action, payload) {
  if (!config.apiUrl) return false;
  await fetch(config.apiUrl, { method:"POST", mode:"no-cors", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({action,payload}) });
  return true;
}
document.querySelector("#project-selector").addEventListener("change", event => { state.activeProjectId = event.target.value; saveState(); render(); });
document.querySelector("#paper-form").addEventListener("submit", async event => {
  event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); const papers = currentPapers();
  const duplicate = papers.some(p => p.title.trim().toLowerCase() === data.title.trim().toLowerCase() || p.sourceUrl === data.sourceUrl); const message = document.querySelector("#form-message");
  if (duplicate) { message.textContent = "This paper is already in this project tracker."; return; }
  const paper = { ...data, projectId:state.activeProjectId, reviewed:false }; state.papers.push(paper); saveState(); render(); event.currentTarget.reset();
  try { if (await sync("addPaper", paper)) { message.textContent = "Added to the shared tracker."; document.querySelector("#sync-status").textContent = "Connected to Google Sheets"; } }
  catch (_) { message.textContent = "Saved locally. Connect Google Apps Script to sync this record."; }
});
const dialog = document.querySelector("#interaction-dialog");
document.querySelector("#interaction-button").addEventListener("click", () => { dialog.querySelector("[name=date]").value = new Date().toISOString().slice(0,10); dialog.showModal(); });
document.querySelector("#interaction-form").addEventListener("submit", async event => {
  event.preventDefault(); const interaction = { ...Object.fromEntries(new FormData(event.currentTarget)), projectId:state.activeProjectId }; state.interactions.push(interaction); saveState(); render(); dialog.close();
  try { if (await sync("addInteraction", interaction)) document.querySelector("#sync-status").textContent = "Connected to Google Sheets"; } catch (_) { document.querySelector("#sync-status").textContent = "Saved locally; sync pending"; }
});
render();

document.querySelector("#cancel-interaction").addEventListener("click", () => { dialog.querySelector("form").reset(); dialog.close(); });

if (!config.apiUrl) config.apiUrl = "https://script.google.com/macros/s/AKfycbx0OZPzIwgfNCkqVyfSg9wJqBN_dM2AzS2CD8sea0ZwpkrMgA3OY0CJrF8flbCJG2WMHw/exec";
