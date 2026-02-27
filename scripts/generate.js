// scripts/generate.js
// Generuje index.html pro GitHub Pages z nejnovější weekly note,
// která má ve frontmatteru (Properties) is_current: true.

const fs = require("fs");
const path = require("path");

const WEEKLY_DIR = String.raw`C:\98_Obsidian\PKB\PKB\10_Calendar\Weekly notes`;
const OUTPUT_HTML = path.join(__dirname, "..", "index.html");

// ---------- YAML / frontmatter helpers ----------

function getFrontmatter(md) {
  const m = md.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*/);
  return m ? m[1] : null;
}

// Jednoduchý parser pro "Key: value" řádky (skaláry).
// Pro checkboxy v Obsidianu typicky stačí true/false.
function parseFrontmatterMap(frontmatterText) {
  const map = {};
  if (!frontmatterText) return map;

  const lines = frontmatterText.split(/\r?\n/);
  for (const line of lines) {
    // ignoruj prázdné / komentáře
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;

    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();

    // ořízni uvozovky
    val = val.replace(/^["']|["']$/g, "");

    // boolean
    if (/^(true|false)$/i.test(val)) {
      map[key] = /^true$/i.test(val);
      continue;
    }

    map[key] = val;
  }

  return map;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function nowCz() {
  return new Date().toLocaleString("cs-CZ");
}

// ---------- Find current weekly note ----------

function listWeeklyNotes(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md"))
    .map((e) => path.join(dir, e.name));
}

function readFrontmatterMap(filePath) {
  const md = fs.readFileSync(filePath, "utf8");
  const fmText = getFrontmatter(md);
  const fm = parseFrontmatterMap(fmText);
  return { md, fm };
}

function pickCurrentWeeklyNote(dir) {
  const files = listWeeklyNotes(dir);

  const candidates = [];
  for (const fp of files) {
    try {
      const { fm } = readFrontmatterMap(fp);
      if (fm.is_current === true) {
        const st = fs.statSync(fp);
        candidates.push({ fp, mtimeMs: st.mtimeMs });
      }
    } catch {
      // ignoruj rozbité soubory
    }
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs); // nejnovější nahoře
  return candidates[0].fp;
}

// ---------- Render ----------

function renderMeta(items) {
  return items
    .map(({ label, text }) => {
      const safeLabel = escapeHtml(label);
      const safeText = escapeHtml(text || "—");
      return `<div class="meta"><strong>${safeLabel}</strong> ${safeText}</div>`;
    })
    .join("\n");
}

function renderHtml({ lastTue, lastThu, status, sourceName }) {
  const updated = nowCz();
  const tueItems = [
    { label: "Vějíř:", text: "celá sestava (od 10. 3. dva vějíře)" },
    { label: "19:00:", text: status.status_UtCt19 },
    { label: "20:00:", text: status.status_Ut20 },
  ];

  const thuItems = [
    { label: "17:00:", text: status.status_ct17 },
    { label: "19:00:", text: status.status_UtCt19 },
    { label: "20:00:", text: status.status_ct20 },
  ];

  return `<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kurzy Lucka</title>

  <style>
    :root {
      --text: #1f2328;
      --muted: #667085;
      --accent: #6b4f3b;

      --bg: #F3F1EB;

      --card: #FFFFFF;
      --card-border: #545454;

      --badge-bg: #F9F7F7;
      --border-soft: #e6e7ea;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 16px/1.6 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    }

    .wrap {
      max-width: 920px;
      margin: 64px auto;
      padding: 0 20px;
    }

    h1 {
      margin: 0 0 10px;
      font-size: 44px;
      line-height: 1.1;
      letter-spacing: .02em;
      color: var(--accent);
      text-transform: uppercase;
    }

    .lead {
      margin: 0 0 28px;
      color: var(--muted);
      font-size: 18px;
      max-width: 70ch;
    }

    .grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }

    .card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 16px 16px 14px;
    }

    .row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }

    .course {
      font-weight: 700;
      font-size: 18px;
    }

    .badge {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--border-soft);
      background: var(--badge-bg);
      color: var(--muted);
      white-space: nowrap;
    }

    .meta {
      color: var(--muted);
      font-size: 14px;
      margin-bottom: 4px;
    }

    .meta strong {
      color: var(--text);
      font-weight: 600;
    }

    footer {
      margin-top: 26px;
      color: var(--muted);
      font-size: 13px;
    }
  </style>
</head>

<body>
  <main class="wrap">
    <h1>Kurzy Lucka</h1>
    <p class="lead">Co kde děláme</p>

    <section class="grid">
      <article class="card">
        <div class="row">
          <div class="course">Úterý</div>
          <div class="badge">naposledy: ${escapeHtml(lastTue || "—")}</div>
        </div>
        ${renderMeta(tueItems)}
      </article>

      <article class="card">
        <div class="row">
          <div class="course">Čtvrtek</div>
          <div class="badge">naposledy: ${escapeHtml(lastThu || "—")}</div>
        </div>
        ${renderMeta(thuItems)}
      </article>
    </section>

    <footer>
      Aktualizováno: ${escapeHtml(updated)}<br>
      Zdroj: ${escapeHtml(sourceName)}
    </footer>
  </main>
</body>
</html>
`;
}

// ---------- Main ----------

function main() {
  const current = pickCurrentWeeklyNote(WEEKLY_DIR);
  if (!current) {
    console.error("ERROR: Nenašel jsem žádnou weekly note s is_current: true v:", WEEKLY_DIR);
    process.exit(1);
  }

  const { fm } = readFrontmatterMap(current);

  const lastTue = fm.LastAkaTuesday;
  const lastThu = fm.LastAkaThursday;

  const status = {
    status_UtCt19: fm.status_UtCt19,
    status_Ut20: fm.status_Ut20,
    status_ct17: fm.status_ct17,
    status_ct20: fm.status_ct20,
  };

const sourceName = path.basename(current);
const html = renderHtml({ lastTue, lastThu, status, sourceName });
  fs.writeFileSync(OUTPUT_HTML, html, "utf8");

  console.log("OK: current weekly note =", current);
  console.log("OK: vygenerováno =", OUTPUT_HTML);
  console.log("LastAkaTuesday =", lastTue);
  console.log("LastAkaThursday =", lastThu);
  console.log("status_UtCt19 =", status.status_UtCt19);
  console.log("status_Ut20 =", status.status_Ut20);
  console.log("status_ct17 =", status.status_ct17);
  console.log("status_ct20 =", status.status_ct20);
}

main();