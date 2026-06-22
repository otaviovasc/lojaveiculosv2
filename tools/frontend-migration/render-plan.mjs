import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { planPath, readBoard } from "./board-utils.mjs";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const board = readBoard();
  const html = await renderFormatted(board);
  writeFileSync(planPath, html);
  console.log(`Rendered ${planPath}`);
}

export async function renderFormatted(data) {
  const prettier = await import("prettier");
  return prettier.format(render(data), { parser: "html" });
}

export function render(data) {
  const current = currentPhase(data);
  const rows = data.slices.map((slice) => renderSlice(slice, data)).join("\n");
  const stats = countBy(data.slices, "priority");
  const blockedCount = (current?.audit?.findings ?? []).length;
  const remediationCount = (current?.audit?.remediation_slice_ids ?? [])
    .map((id) => data.slices.find((slice) => slice.id === id))
    .filter((slice) => slice && slice.status !== "merged").length;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Loja Veiculos V2 Frontend Migration Plan</title>
    <style>
      :root{--bg:#f6f7f9;--panel:#fff;--text:#141826;--muted:#606878;--line:#d7dee8;--accent:#155eef;--ok:#237a4b;--warn:#9a6400;--bad:#b42318;--chip:#eef2f6;--shadow:0 10px 24px rgba(22,34,55,.08);font-family:"Inter","Segoe UI",Arial,sans-serif}
      *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text)} header{padding:24px clamp(16px,4vw,42px);background:var(--panel);border-bottom:1px solid var(--line)} h1{margin:0;font-size:1.65rem} h2{margin:0;font-size:1.05rem}.meta{margin-top:6px;color:var(--muted)} main{max-width:1380px;margin:0 auto;padding:22px;display:grid;gap:18px}.summary,.phase-grid,.remediation-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.card,.phase-card,.panel,.table-wrap{background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow)}.card,.phase-card,.panel{padding:14px}.card strong{display:block;font-size:1.4rem}.card span,.muted{color:var(--muted)}.phase-card{display:grid;gap:10px}.phase-card.current{border-color:var(--bad);box-shadow:0 0 0 2px rgba(180,35,24,.08),var(--shadow)}.phase-title{display:flex;align-items:start;justify-content:space-between;gap:10px}.phase-title strong{display:block}.phase-meta{display:flex;gap:6px;flex-wrap:wrap}.finding-list{display:grid;gap:8px;margin-top:12px}.finding{border-left:3px solid var(--bad);padding:8px 10px;background:#fff6f5;border-radius:6px}.remediation-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.remediation{display:grid;gap:7px}.toolbar{display:flex;gap:8px;flex-wrap:wrap}.toolbar button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 12px;font-weight:650;cursor:pointer}.toolbar button.active{background:var(--accent);border-color:var(--accent);color:#fff}table{width:100%;border-collapse:collapse;font-size:.9rem}th,td{padding:10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}.pill{display:inline-flex;border-radius:999px;border:1px solid var(--line);padding:3px 8px;margin:1px;background:#fff;font-size:.78rem}.status{font-weight:800}.P0{color:var(--bad)}.P1{color:var(--warn)}.P2{color:var(--accent)}.defer{color:var(--muted)}.passed,.ready-for-merge,.merged{color:var(--ok)}.active{color:var(--accent)}.blocked,.changes-requested{color:var(--bad)}.planned,.not-opened,.needs-review,.deferred{color:var(--muted)}.hidden{display:none}@media(max-width:980px){.summary,.phase-grid,.remediation-grid{grid-template-columns:repeat(2,1fr)}th:nth-child(5),td:nth-child(5){display:none}}@media(max-width:620px){.summary,.phase-grid,.remediation-grid{grid-template-columns:1fr}main{padding:14px}table{font-size:.82rem}}
    </style>
  </head>
  <body>
    <header>
      <h1>Loja Veiculos V2 Frontend Migration Plan</h1>
      <div class="meta">Generated from docs/frontend-migration/board.json · ${escapeHtml(data.updated_at)} · current phase: ${escapeHtml(data.current_phase_id ?? "n/a")} · source-of-truth board, PR dependency graph, QA metadata, and phase gates.</div>
    </header>
    <main>
      <section class="summary">
        ${summaryCard("P0", stats.P0 ?? 0, "Core operator workflows")}
        ${summaryCard("P1", stats.P1 ?? 0, "Important operational depth")}
        ${summaryCard("Blocked findings", blockedCount, current?.name ?? "No current phase")}
        ${summaryCard("Open remediation", remediationCount, "Current phase blockers")}
      </section>
      <section class="phase-grid" aria-label="phase gates">
        ${(data.phases ?? []).map((phase) => renderPhaseCard(phase, data)).join("")}
      </section>
      <section class="panel">
        <h2>Blocked Findings</h2>
        ${renderBlockedFindings(current)}
      </section>
      <section class="panel">
        <h2>Next Remediation Slices</h2>
        <div class="remediation-grid">
          ${renderRemediationSlices(current, data)}
        </div>
      </section>
      <section class="toolbar" aria-label="filters">
        ${["all", "P0", "P1", "P2", "defer"].map((f, i) => `<button class="${i === 0 ? "active" : ""}" data-filter="${f}">${f}</button>`).join("")}
      </section>
      <section class="table-wrap">
        <table>
          <thead><tr><th>Slice</th><th>State</th><th>Phase</th><th>Refs</th><th>Dependencies</th><th>QA</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
    </main>
    <script>
      const buttons=[...document.querySelectorAll("button[data-filter]")];
      const rows=[...document.querySelectorAll("tr[data-priority]")];
      buttons.forEach((button)=>button.addEventListener("click",()=>{buttons.forEach((b)=>b.classList.remove("active"));button.classList.add("active");const filter=button.dataset.filter;rows.forEach((row)=>row.classList.toggle("hidden",filter!=="all"&&row.dataset.priority!==filter));}));
    </script>
  </body>
</html>
`;
}

function renderPhaseCard(phase, data) {
  const assigned = data.slices.filter((slice) => slice.phase === phase.id);
  const merged = assigned.filter((slice) => slice.status === "merged").length;
  const currentClass = phase.id === data.current_phase_id ? " current" : "";
  return `<article class="phase-card${currentClass}">
    <div class="phase-title">
      <div><strong>${escapeHtml(phase.name)}</strong><span class="muted">${escapeHtml(phase.id)}</span></div>
      <span class="status ${escapeHtml(phase.status)}">${escapeHtml(phase.status)}</span>
    </div>
    <p class="muted">${escapeHtml(phase.scope ?? phase.description ?? "")}</p>
    <div class="phase-meta">
      <span class="pill">${merged}/${assigned.length} merged</span>
      <span class="pill">audit: ${escapeHtml(phase.audit?.status ?? "n/a")}</span>
      <span class="pill">${(phase.audit?.findings ?? []).length} finding(s)</span>
    </div>
  </article>`;
}

function renderBlockedFindings(phase) {
  const findings = phase?.audit?.findings ?? [];
  if (findings.length === 0) return '<p class="muted">No blocked findings.</p>';
  return `<div class="finding-list">${findings
    .map(
      (finding) =>
        `<div class="finding"><strong>${escapeHtml(finding.id)} · ${escapeHtml(finding.severity ?? "blocker")}</strong><br />${escapeHtml(finding.summary)}<br /><span class="muted">Remediation: ${escapeHtml(finding.remediation_slice_id ?? (finding.remediation_slice_ids ?? []).join(", "))}</span></div>`,
    )
    .join("")}</div>`;
}

function renderRemediationSlices(phase, data) {
  const ids = phase?.audit?.remediation_slice_ids ?? [];
  if (ids.length === 0) return '<p class="muted">No remediation slices recorded.</p>';
  return ids
    .map((id) => data.slices.find((slice) => slice.id === id))
    .filter(Boolean)
    .map(
      (slice) =>
        `<article class="card remediation"><strong>${escapeHtml(slice.id)}</strong><span>${escapeHtml(slice.name)}</span><span class="status ${escapeHtml(slice.status)}">${escapeHtml(slice.status)}</span><span class="muted">Depends on ${(slice.depends_on ?? []).join(", ") || "none"}</span></article>`,
    )
    .join("");
}

function renderSlice(slice, data) {
  const phase = (data.phases ?? []).find((item) => item.id === slice.phase);
  const refs = [...(slice.source_refs ?? []), ...(slice.target_refs ?? [])]
    .slice(0, 4)
    .map(
      (ref) =>
        `<span class="pill">${escapeHtml(ref.repo)}:${escapeHtml(ref.path)}</span>`,
    )
    .join("");
  const deps = (slice.depends_on ?? []).length
    ? slice.depends_on
        .map((dep) => `<span class="pill">${escapeHtml(dep)}</span>`)
        .join("")
    : '<span class="pill">parallel/root</span>';
  return `<tr data-priority="${escapeHtml(slice.priority)}">
    <td><strong>${escapeHtml(slice.id)}</strong><br />${escapeHtml(slice.name)}<br /><span class="${escapeHtml(slice.priority)}">${escapeHtml(slice.priority)}</span> · ${escapeHtml(slice.domain)}</td>
    <td><span class="${escapeHtml(slice.status)}">${escapeHtml(slice.status)}</span><br />${escapeHtml(slice.classification)}<br />review: <span class="${escapeHtml(slice.pr.review_status)}">${escapeHtml(slice.pr.review_status)}</span></td>
    <td>${escapeHtml(phase?.name ?? slice.phase ?? "none")}<br /><span class="${escapeHtml(phase?.status ?? "planned")}">${escapeHtml(phase?.status ?? "n/a")}</span></td>
    <td>${refs}</td>
    <td>${deps}</td>
    <td>${slice.qa.visual.required ? "visual required" : "visual optional"}<br /><code>${escapeHtml(slice.qa.visual.command ?? "n/a")}</code></td>
  </tr>`;
}

function summaryCard(label, value, copy) {
  return `<div class="card"><strong>${value}</strong><span>${escapeHtml(label)} · ${escapeHtml(copy)}</span></div>`;
}

function countBy(items, field) {
  return items.reduce((acc, item) => {
    acc[item[field]] = (acc[item[field]] ?? 0) + 1;
    return acc;
  }, {});
}

function currentPhase(data) {
  return (data.phases ?? []).find((phase) => phase.id === data.current_phase_id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
