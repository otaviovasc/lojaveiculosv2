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
  const rows = data.slices.map(renderSlice).join("\n");
  const stats = countBy(data.slices, "priority");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Loja Veiculos V2 Frontend Migration Plan</title>
    <style>
      :root{--bg:#f7f8fb;--panel:#fff;--text:#141826;--muted:#606878;--line:#dce3ef;--accent:#0f6fff;--ok:#2f8a58;--warn:#a46f00;--bad:#b42318;--shadow:0 10px 24px rgba(22,34,55,.08);font-family:"Inter","Segoe UI",Arial,sans-serif}
      *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--text)} header{padding:24px clamp(16px,4vw,42px);background:var(--panel);border-bottom:1px solid var(--line)} h1{margin:0;font-size:1.65rem} .meta{margin-top:6px;color:var(--muted)} main{max-width:1320px;margin:0 auto;padding:22px;display:grid;gap:18px}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.card,.table-wrap{background:var(--panel);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow)}.card{padding:14px}.card strong{display:block;font-size:1.4rem}.card span{color:var(--muted)}.toolbar{display:flex;gap:8px;flex-wrap:wrap}.toolbar button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 12px;font-weight:650;cursor:pointer}.toolbar button.active{background:var(--accent);border-color:var(--accent);color:#fff}table{width:100%;border-collapse:collapse;font-size:.9rem}th,td{padding:10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.04em}.pill{display:inline-flex;border-radius:999px;border:1px solid var(--line);padding:3px 8px;margin:1px;background:#fff;font-size:.78rem}.P0{color:var(--bad)}.P1{color:var(--warn)}.P2{color:var(--accent)}.defer{color:var(--muted)}.ready-for-merge,.merged{color:var(--ok)}.blocked,.changes-requested{color:var(--bad)}.planned,.not-opened,.needs-review{color:var(--muted)}.hidden{display:none}@media(max-width:820px){.summary{grid-template-columns:repeat(2,1fr)}th:nth-child(4),td:nth-child(4){display:none}}@media(max-width:560px){.summary{grid-template-columns:1fr}main{padding:14px}table{font-size:.82rem}}
    </style>
  </head>
  <body>
    <header>
      <h1>Loja Veiculos V2 Frontend Migration Plan</h1>
      <div class="meta">Generated from docs/frontend-migration/board.json · ${escapeHtml(data.updated_at)} · source-of-truth board, PR dependency graph, QA metadata, and agent loop contracts.</div>
    </header>
    <main>
      <section class="summary">
        ${summaryCard("P0", stats.P0 ?? 0, "Core operator workflows")}
        ${summaryCard("P1", stats.P1 ?? 0, "Important operational depth")}
        ${summaryCard("P2", stats.P2 ?? 0, "Later product depth")}
        ${summaryCard("Deferred", stats.defer ?? 0, "Deferred or do-not-port")}
      </section>
      <section class="toolbar" aria-label="filters">
        ${["all", "P0", "P1", "P2", "defer"].map((f, i) => `<button class="${i === 0 ? "active" : ""}" data-filter="${f}">${f}</button>`).join("")}
      </section>
      <section class="table-wrap">
        <table>
          <thead><tr><th>Slice</th><th>State</th><th>Refs</th><th>Dependencies</th><th>QA</th></tr></thead>
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

function renderSlice(slice) {
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
