const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { sendAssignmentEmail, sendReturnEmail } = require('../mailer');

const router = express.Router();

router.use(requireAuth);

function canAccess(assignment, sessionUser) {
  return sessionUser.role === 'admin' || assignment.technician_id === sessionUser.id;
}

// Λίστα χρεώσεων: όλοι οι συνδεδεμένοι χρήστες βλέπουν όλες τις χρεώσεις
// (ποιος τεχνικός έχει τι χρεωμένο), αλλά μόνο ο ιδιοκτήτης ή ο admin μπορεί
// να την αποχρεώσει (βλ. canAccess παρακάτω).
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT a.*, e.name AS equipment_name, e.serial_number, u.full_name AS technician_name
    FROM assignments a
    JOIN equipment e ON e.id = a.equipment_id
    JOIN users u ON u.id = a.technician_id
    ORDER BY a.assigned_at DESC
  `).all();

  res.render('assignments/list', { assignments: rows });
});

router.get('/new', (req, res) => {
  const availableEquipment = db.prepare("SELECT * FROM equipment WHERE status = 'available' ORDER BY name").all();
  res.render('assignments/form', { availableEquipment, error: null, form: {} });
});

// Χρέωση εξοπλισμού
router.post('/', (req, res) => {
  const { equipment_id, assigned_to, notes } = req.body;
  const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(equipment_id);

  if (!equipment || equipment.status !== 'available') {
    const availableEquipment = db.prepare("SELECT * FROM equipment WHERE status = 'available' ORDER BY name").all();
    return res.render('assignments/form', {
      availableEquipment,
      error: 'Ο εξοπλισμός δεν είναι διαθέσιμος.',
      form: req.body,
    });
  }
  if (!assigned_to) {
    const availableEquipment = db.prepare("SELECT * FROM equipment WHERE status = 'available' ORDER BY name").all();
    return res.render('assignments/form', {
      availableEquipment,
      error: 'Συμπληρώστε σε ποιον χρεώνεται ο εξοπλισμός.',
      form: req.body,
    });
  }

  const insert = db.prepare(`
    INSERT INTO assignments (equipment_id, technician_id, assigned_to, notes)
    VALUES (?, ?, ?, ?)
  `);
  const result = insert.run(equipment_id, req.session.user.id, assigned_to, notes || null);
  db.prepare("UPDATE equipment SET status = 'assigned' WHERE id = ?").run(equipment_id);

  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(result.lastInsertRowid);
  sendAssignmentEmail({ equipment, assignment, technician: req.session.user });

  res.redirect('/assignments');
});

router.get('/:id', (req, res) => {
  const assignment = db.prepare(`
    SELECT a.*, e.name AS equipment_name, e.serial_number, u.full_name AS technician_name
    FROM assignments a
    JOIN equipment e ON e.id = a.equipment_id
    JOIN users u ON u.id = a.technician_id
    WHERE a.id = ?
  `).get(req.params.id);

  if (!assignment) return res.status(404).render('error', { message: 'Η χρέωση δεν βρέθηκε.' });

  res.render('assignments/detail', { assignment });
});

// Αποχρέωση εξοπλισμού
router.post('/:id/return', (req, res) => {
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  if (!assignment) return res.status(404).render('error', { message: 'Η χρέωση δεν βρέθηκε.' });

  if (!canAccess(assignment, req.session.user)) {
    return res.status(403).render('error', { message: 'Μόνο ο τεχνικός που έκανε τη χρέωση (ή ο διαχειριστής) μπορεί να την αποχρεώσει.' });
  }
  if (assignment.returned_at) {
    return res.status(400).render('error', { message: 'Ο εξοπλισμός έχει ήδη αποχρεωθεί.' });
  }

  db.prepare("UPDATE assignments SET returned_at = datetime('now'), return_notes = ? WHERE id = ?")
    .run(req.body.return_notes || null, req.params.id);
  db.prepare("UPDATE equipment SET status = 'available' WHERE id = ?").run(assignment.equipment_id);

  const updatedAssignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(assignment.equipment_id);
  const technician = db.prepare('SELECT * FROM users WHERE id = ?').get(assignment.technician_id);
  sendReturnEmail({ equipment, assignment: updatedAssignment, technician });

  res.redirect('/assignments');
});

module.exports = router;
