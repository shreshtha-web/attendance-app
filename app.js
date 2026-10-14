const STORAGE_KEY = "scrs-attendance-v1";
let students = [];
let attendance = {};
let toastTimer;

const $ = (id) => document.getElementById(id);
const dateInput = $("sessionDate");

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}
function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
}
function storageKey() { return `${STORAGE_KEY}:${dateInput.value}`; }

async function init() {
  dateInput.value = localDateString();
  $("todayLabel").textContent = new Date().toLocaleDateString(undefined, {weekday:"short", month:"short", day:"numeric", year:"numeric"});
  try {
    const response = await fetch("./students.json");
    if (!response.ok) throw new Error("Could not load students.json");
    students = await response.json();
  } catch (error) {
    $("studentRows").innerHTML = '<tr><td colspan="5">Could not load students.json. Open this app through GitHub Pages or a local web server.</td></tr>';
    showToast("Roster could not be loaded.");
    return;
  }
  loadAttendance();
  populateSections();
  render();
  bindEvents();
}
function loadAttendance() {
  try { attendance = JSON.parse(localStorage.getItem(storageKey()) || "{}"); }
  catch { attendance = {}; }
}
function saveAttendance() {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(attendance));
  } catch {
    showToast("Browser storage is unavailable. Your latest changes may not persist.");
  }
}
function populateSections() {
  const sections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();
  $("sectionFilter").innerHTML = '<option value="all">All sections</option>' +
    sections.map(section => `<option value="${escapeHtml(section)}">${escapeHtml(section)}</option>`).join("");
}
function getCounts() {
  const present = students.filter(s => attendance[s.rollNo] === "present").length;
  const absent = students.filter(s => attendance[s.rollNo] === "absent").length;
  return { total: students.length, present, absent, unmarked: students.length - present - absent };
}
function renderStats() {
  const c = getCounts();
  $("totalCount").textContent = c.total;
  $("presentCount").textContent = c.present;
  $("absentCount").textContent = c.absent;
  $("unmarkedCount").textContent = c.unmarked;
  $("presentPercent").textContent = `${c.total ? Math.round(c.present / c.total * 100) : 0}% of students`;
  $("absentPercent").textContent = `${c.total ? Math.round(c.absent / c.total * 100) : 0}% of students`;
  $("submitHint").textContent = c.unmarked
    ? `${c.unmarked} student${c.unmarked === 1 ? "" : "s"} still need a status. You can submit anyway.`
    : `All ${c.total} students are marked. Your PDF is ready to generate.`;
}
function filteredStudents() {
  const q = $("searchInput").value.trim().toLowerCase();
  const section = $("sectionFilter").value;
  const status = $("statusFilter").value;
  return students.filter(s => {
    const matchesQuery = !q || s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q);
    const matchesSection = section === "all" || s.section === section;
    const studentStatus = attendance[s.rollNo] || "unmarked";
    const matchesStatus = status === "all" || studentStatus === status;
    return matchesQuery && matchesSection && matchesStatus;
  });
}
function render() {
  const list = filteredStudents();
  $("studentRows").innerHTML = list.map(s => {
    const status = attendance[s.rollNo] || "";
    return `<tr>
      <td class="num-col">${s.sno}</td>
      <td><div class="student-cell"><span class="avatar">${escapeHtml(initials(s.name))}</span><span>${escapeHtml(s.name)}</span></div></td>
      <td class="roll">${escapeHtml(s.rollNo)}</td>
      <td><span class="section-pill">${escapeHtml(s.section || "—")}</span></td>
      <td><div class="status-toggle" role="group" aria-label="Attendance for ${escapeHtml(s.name)}">
        <button class="status-btn present ${status === "present" ? "selected" : ""}" data-roll="${escapeHtml(s.rollNo)}" data-status="present" aria-pressed="${status === "present"}">✓ Present</button>
        <button class="status-btn absent ${status === "absent" ? "selected" : ""}" data-roll="${escapeHtml(s.rollNo)}" data-status="absent" aria-pressed="${status === "absent"}">× Absent</button>
      </div>${status ? "" : '<div class="unmarked-label">Not marked</div>'}</td>
    </tr>`;
  }).join("");
  $("emptyState").hidden = list.length !== 0;
  $("showingCount").textContent = `Showing ${list.length} of ${students.length} students`;
  renderStats();
}
function setStatus(rollNo, status) {
  attendance[rollNo] = status;
  saveAttendance();
  render();
}
function bindEvents() {
  $("studentRows").addEventListener("click", event => {
    const button = event.target.closest("button[data-roll]");
    if (button) setStatus(button.dataset.roll, button.dataset.status);
  });
  ["searchInput", "sectionFilter", "statusFilter"].forEach(id => $(id).addEventListener(id === "searchInput" ? "input" : "change", render));
  dateInput.addEventListener("change", () => {
    if (!dateInput.value) dateInput.value = localDateString();
    loadAttendance();
    render();
  });
  $("markAllPresent").addEventListener("click", () => { students.forEach(s => attendance[s.rollNo] = "present"); saveAttendance(); render(); showToast("All students marked present."); });
  $("markAllAbsent").addEventListener("click", () => { students.forEach(s => attendance[s.rollNo] = "absent"); saveAttendance(); render(); showToast("All students marked absent."); });
  $("resetButton").addEventListener("click", () => {
    if (!confirm("Reset all attendance statuses for this date?")) return;
    attendance = {}; saveAttendance(); render(); showToast("Statuses reset.");
  });
  $("submitButton").addEventListener("click", submitAttendance);
  $("goBackButton").addEventListener("click", () => $("confirmModal").hidden = true);
  $("submitAnywayButton").addEventListener("click", () => { $("confirmModal").hidden = true; generatePdf(); });
  $("confirmModal").addEventListener("click", event => { if (event.target === $("confirmModal")) $("confirmModal").hidden = true; });
}
function submitAttendance() {
  const c = getCounts();
  if (c.unmarked) {
    $("modalMessage").textContent = `${c.unmarked} student${c.unmarked === 1 ? " has" : "s have"} not been marked. You can go back and finish, or submit a report with only the students already marked present.`;
    $("confirmModal").hidden = false;
    return;
  }
  generatePdf();
}
function generatePdf() {
  const present = students.filter(s => attendance[s.rollNo] === "present");
  const absent = students.filter(s => attendance[s.rollNo] === "absent");
  const date = dateInput.value || localDateString();
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast("PDF library did not load. Check your internet connection and try again.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:"mm", format:"a4"});
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(49, 94, 251);
  doc.rect(0, 0, pageWidth, 39, "F");
  doc.setTextColor(255,255,255);
  doc.setFont("helvetica","bold"); doc.setFontSize(19);
  doc.text("SCRS Attendance Report", 15, 17);
  doc.setFont("helvetica","normal"); doc.setFontSize(10);
  doc.text(`Date: ${date}`, 15, 26);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 32);
  doc.setTextColor(23,43,77);
  doc.setFont("helvetica","bold"); doc.setFontSize(12);
  doc.text("Attendance summary", 15, 50);
  doc.setFont("helvetica","normal"); doc.setFontSize(10);
  doc.text(`Total students: ${students.length}`, 15, 59);
  doc.text(`Present: ${present.length}`, 78, 59);
  doc.text(`Absent: ${absent.length}`, 125, 59);
  doc.setFont("helvetica","bold"); doc.setFontSize(12);
  doc.text(`Present students (${present.length})`, 15, 73);
  let y = 81;
  doc.setFillColor(242,245,251); doc.rect(15,y,pageWidth-30,8,"F");
  doc.setFontSize(8); doc.setTextColor(90,105,128); doc.setFont("helvetica","bold");
  doc.text("S.NO.",18,y+5.4); doc.text("STUDENT NAME",35,y+5.4); doc.text("UNIVERSITY ROLL NO.",115,y+5.4); doc.text("SECTION",174,y+5.4);
  y += 8;
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(45,60,83);
  if (!present.length) {
    doc.text("No students marked present.", 18, y+7); y += 13;
  } else {
    present.forEach((s, i) => {
      if (y > 270) { doc.addPage(); y = 18; }
      if (i % 2 === 1) { doc.setFillColor(250,251,253); doc.rect(15,y,pageWidth-30,8,"F"); }
      doc.text(String(s.sno),18,y+5.4);
      doc.text(doc.splitTextToSize(s.name, 72)[0],35,y+5.4);
      doc.text(String(s.rollNo),115,y+5.4);
      doc.text(String(s.section || "—"),174,y+5.4);
      y += 8;
    });
  }
  if (y > 255) { doc.addPage(); y = 18; }
  y += 8;
  doc.setDrawColor(225,231,240); doc.line(15,y,pageWidth-15,y); y += 8;
  doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(23,43,77);
  doc.text("Absent students",15,y); y += 6;
  doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
  const absentNames = absent.length ? absent.map(s => `${s.name} (${s.rollNo})`).join(", ") : "None";
  const lines = doc.splitTextToSize(absentNames, pageWidth-30);
  lines.forEach(line => { if (y > 280) { doc.addPage(); y=18; } doc.text(line,15,y); y += 5; });
  const unmarked = students.filter(s => !attendance[s.rollNo]);
  if (unmarked.length) {
    y += 4; doc.setFont("helvetica","italic"); doc.setTextColor(160,100,0);
    const warning = doc.splitTextToSize(`Note: ${unmarked.length} student(s) were not marked and are excluded from present/absent totals.`, pageWidth-30);
    warning.forEach(line => { if (y > 280) { doc.addPage(); y=18; } doc.text(line,15,y); y += 5; });
  }
  const safeDate = date.replace(/[^0-9-]/g,"");
  doc.save(`SCRS-attendance-${safeDate}.pdf`);
  showToast(`PDF downloaded: ${present.length} present student${present.length === 1 ? "" : "s"}.`);
}
function showToast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
}
init();
