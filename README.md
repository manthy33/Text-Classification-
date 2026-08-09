# Πλάνο Τεχνικών (Αυτοματοποιημένο)

Αυτόματη δημιουργία web σελίδας (dashboard) με το ημερήσιο πλάνο των τεχνικών, από ένα αρχείο Excel/CSV.

## Πώς λειτουργεί

1. Ενημερώνεις το αρχείο δεδομένων: [`data/technicians_schedule.csv`](data/technicians_schedule.csv)
   (ή ανεβάζεις `data/technicians_schedule.xlsx`).
2. Με κάθε push στο `main` που αλλάζει το αρχείο δεδομένων, το GitHub Action
   ([`.github/workflows/generate-schedule.yml`](.github/workflows/generate-schedule.yml))
   τρέχει αυτόματα το script, παράγει το `docs/index.html` και το δημοσιεύει
   στο GitHub Pages.
3. Δεν χρειάζεται καμία χειροκίνητη ενέργεια — απλά επεξεργάζεσαι το αρχείο δεδομένων.

## Μορφή αρχείου δεδομένων

Οι στήλες που χρειάζεται το αρχείο (CSV ή Excel):

| Ημερομηνία | Τεχνικός | Ώρα Έναρξης | Ώρα Λήξης | Πελάτης | Εργασία | Τοποθεσία | Κατάσταση |
|---|---|---|---|---|---|---|---|
| 2026-08-10 | Γιάννης Παπαδόπουλος | 08:00 | 10:00 | Ξενοδοχείο Άλφα | Επισκευή κλιματιστικού | Θεσσαλονίκη | Προγραμματισμένο |

- **Ημερομηνία**: `YYYY-MM-DD` (ή `DD/MM/YYYY`)
- **Κατάσταση**: `Προγραμματισμένο`, `Ολοκληρωμένο` ή `Ακυρώθηκε`

## Τοπική εκτέλεση (προαιρετικό)

```bash
pip install -r requirements.txt
python scripts/generate_schedule.py            # χρησιμοποιεί data/technicians_schedule.csv
python scripts/generate_schedule.py data/technicians_schedule.xlsx docs/index.html
```

Το αποτέλεσμα γράφεται στο `docs/index.html` και ανοίγει σε οποιοδήποτε browser.

## Ενεργοποίηση GitHub Pages (μία φορά)

Στο repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Μετά το επόμενο push, η σελίδα θα είναι διαθέσιμη στο URL που θα εμφανιστεί εκεί.
