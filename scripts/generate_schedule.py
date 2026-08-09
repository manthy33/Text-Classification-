#!/usr/bin/env python3
"""Δημιουργεί μια στατική web σελίδα (docs/index.html) με το πλάνο τεχνικών
από ένα αρχείο CSV ή Excel (.xlsx).

Χρήση:
    python scripts/generate_schedule.py [πηγή] [έξοδος]

    πηγή    -> προεπιλογή: data/technicians_schedule.csv
    έξοδος  -> προεπιλογή: docs/index.html
"""
import html
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from string import Template

import pandas as pd

REQUIRED_COLUMNS = [
    "Ημερομηνία",
    "Τεχνικός",
    "Ώρα Έναρξης",
    "Ώρα Λήξης",
    "Πελάτης",
    "Εργασία",
    "Τοποθεσία",
    "Κατάσταση",
]

STATUS_CLASS = {
    "Προγραμματισμένο": "status-scheduled",
    "Ολοκληρωμένο": "status-done",
    "Ακυρώθηκε": "status-cancelled",
}

DATE_FORMATS = ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y")

TEMPLATE = Template("""<!doctype html>
<html lang="el">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Πλάνο Τεχνικών</title>
<style>
:root {
  --bg: #f5f6f8;
  --surface: #ffffff;
  --border: #e2e4e9;
  --text: #1b1f24;
  --text-muted: #6b7280;
  --accent: #2563eb;
  --scheduled: #2563eb;
  --done: #16a34a;
  --cancelled: #9ca3af;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f1115;
    --surface: #1a1d23;
    --border: #2a2e37;
    --text: #e6e8eb;
    --text-muted: #9aa0aa;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
}
header {
  padding: 24px clamp(16px, 4vw, 48px);
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 10;
}
header h1 { margin: 0 0 4px; font-size: 1.5rem; }
.generated-at { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px; }
.controls { display: flex; gap: 12px; flex-wrap: wrap; }
.controls input, .controls select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 0.95rem;
}
.controls input { flex: 1; min-width: 200px; }
main { padding: 24px clamp(16px, 4vw, 48px) 48px; max-width: 1000px; margin: 0 auto; }
.day-block { margin-bottom: 32px; }
.day-block h2 { font-size: 1.1rem; text-transform: capitalize; margin-bottom: 12px; }
.job-list { display: flex; flex-direction: column; gap: 10px; }
.job-card {
  display: grid;
  grid-template-columns: 100px 1fr auto;
  gap: 16px;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 4px solid var(--scheduled);
  border-radius: 10px;
  padding: 12px 16px;
}
.job-card.status-done { border-left-color: var(--done); }
.job-card.status-cancelled { border-left-color: var(--cancelled); opacity: 0.7; }
.job-time { font-weight: 600; font-variant-numeric: tabular-nums; color: var(--text-muted); }
.job-tech { font-weight: 600; }
.job-task { margin-top: 2px; }
.job-meta { margin-top: 2px; color: var(--text-muted); font-size: 0.85rem; }
.job-status { font-size: 0.8rem; color: var(--text-muted); white-space: nowrap; }
.empty-state { color: var(--text-muted); padding: 40px 0; text-align: center; }
</style>
</head>
<body>
<header>
  <h1>Πλάνο Τεχνικών</h1>
  <div class="generated-at">Ενημερώθηκε: $generated_at</div>
  <div class="controls">
    <input type="text" id="search" placeholder="Αναζήτηση (τεχνικός, εργασία, πελάτης, τοποθεσία)...">
    <select id="tech-filter">
      <option value="">Όλοι οι τεχνικοί</option>
      $options
    </select>
  </div>
</header>
<main id="main">
$day_sections
<p class="empty-state" id="empty-state" style="display:none;">Δεν βρέθηκαν αποτελέσματα.</p>
</main>
<script>
const search = document.getElementById('search');
const techFilter = document.getElementById('tech-filter');
const cards = Array.from(document.querySelectorAll('.job-card'));
const dayBlocks = Array.from(document.querySelectorAll('.day-block'));
const emptyState = document.getElementById('empty-state');

function applyFilters() {
  const q = search.value.trim().toLowerCase();
  const tech = techFilter.value;
  let visibleTotal = 0;

  dayBlocks.forEach(block => {
    let visibleInBlock = 0;
    block.querySelectorAll('.job-card').forEach(card => {
      const matchesTech = !tech || card.dataset.tech === tech;
      const matchesQuery = !q || card.textContent.toLowerCase().includes(q);
      const show = matchesTech && matchesQuery;
      card.style.display = show ? '' : 'none';
      if (show) visibleInBlock++;
    });
    block.style.display = visibleInBlock ? '' : 'none';
    visibleTotal += visibleInBlock;
  });

  emptyState.style.display = visibleTotal ? 'none' : 'block';
}

search.addEventListener('input', applyFilters);
techFilter.addEventListener('change', applyFilters);
</script>
</body>
</html>
""")


def load_data(path: Path) -> pd.DataFrame:
    if path.suffix.lower() in (".xlsx", ".xls"):
        df = pd.read_excel(path, dtype=str)
    else:
        df = pd.read_csv(path, dtype=str)
    df = df.fillna("")

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(
            "Λείπουν στήλες από το αρχείο δεδομένων: " + ", ".join(missing)
        )
    return df


def parse_date(value: str):
    value = (value or "").strip()
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    return None


def build_html(df: pd.DataFrame, generated_at: str) -> str:
    rows = df.to_dict("records")
    rows.sort(
        key=lambda r: (
            parse_date(r["Ημερομηνία"]) or datetime.max,
            r["Ώρα Έναρξης"],
            r["Τεχνικός"],
        )
    )

    by_date = defaultdict(list)
    for r in rows:
        by_date[r["Ημερομηνία"]].append(r)

    technicians = sorted({r["Τεχνικός"] for r in rows if r["Τεχνικός"]})
    options = "".join(
        f'<option value="{html.escape(t)}">{html.escape(t)}</option>'
        for t in technicians
    )

    day_sections = []
    for date in sorted(by_date, key=lambda d: parse_date(d) or datetime.max):
        entries = by_date[date]
        parsed = parse_date(date)
        display_date = parsed.strftime("%A %d/%m/%Y") if parsed else date

        cards = []
        for r in entries:
            status = (r.get("Κατάσταση") or "").strip()
            status_class = STATUS_CLASS.get(status, "status-scheduled")
            cards.append(f"""
            <article class="job-card {status_class}" data-tech="{html.escape(r['Τεχνικός'])}">
              <div class="job-time">{html.escape(r['Ώρα Έναρξης'])}&ndash;{html.escape(r['Ώρα Λήξης'])}</div>
              <div class="job-main">
                <div class="job-tech">{html.escape(r['Τεχνικός'])}</div>
                <div class="job-task">{html.escape(r['Εργασία'])}</div>
                <div class="job-meta">{html.escape(r['Πελάτης'])} · {html.escape(r['Τοποθεσία'])}</div>
              </div>
              <div class="job-status">{html.escape(status)}</div>
            </article>""")

        day_sections.append(f"""
        <section class="day-block">
          <h2>{html.escape(display_date)}</h2>
          <div class="job-list">{''.join(cards)}</div>
        </section>""")

    return TEMPLATE.substitute(
        generated_at=html.escape(generated_at),
        options=options,
        day_sections="".join(day_sections),
    )


def main():
    data_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("data/technicians_schedule.csv")
    output_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("docs/index.html")

    if not data_path.exists():
        sys.exit(f"Δεν βρέθηκε το αρχείο δεδομένων: {data_path}")

    df = load_data(data_path)
    generated_at = datetime.now().strftime("%d/%m/%Y %H:%M")
    output_html = build_html(df, generated_at)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(output_html, encoding="utf-8")
    print(f"Δημιουργήθηκε το {output_path} με {len(df)} εγγραφές.")


if __name__ == "__main__":
    main()
