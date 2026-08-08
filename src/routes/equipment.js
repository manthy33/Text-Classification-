const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const equipment = db.prepare('SELECT * FROM equipment ORDER BY name').all();
  res.render('equipment/list', { equipment });
});

router.get('/new', requireAdmin, (req, res) => {
  res.render('equipment/form', { equipment: null, error: null });
});

router.post('/', requireAdmin, (req, res) => {
  const { name, serial_number, category, description } = req.body;
  if (!name || !serial_number) {
    return res.render('equipment/form', { equipment: req.body, error: 'Το όνομα και ο σειριακός αριθμός είναι υποχρεωτικά.' });
  }
  try {
    db.prepare('INSERT INTO equipment (name, serial_number, category, description) VALUES (?, ?, ?, ?)')
      .run(name, serial_number, category || null, description || null);
    res.redirect('/equipment');
  } catch (err) {
    res.render('equipment/form', { equipment: req.body, error: 'Ο σειριακός αριθμός υπάρχει ήδη.' });
  }
});

router.get('/:id/edit', requireAdmin, (req, res) => {
  const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
  if (!equipment) return res.status(404).render('error', { message: 'Ο εξοπλισμός δεν βρέθηκε.' });
  res.render('equipment/form', { equipment, error: null });
});

router.post('/:id', requireAdmin, (req, res) => {
  const { name, serial_number, category, description } = req.body;
  if (!name || !serial_number) {
    return res.render('equipment/form', { equipment: { ...req.body, id: req.params.id }, error: 'Το όνομα και ο σειριακός αριθμός είναι υποχρεωτικά.' });
  }
  try {
    db.prepare('UPDATE equipment SET name = ?, serial_number = ?, category = ?, description = ? WHERE id = ?')
      .run(name, serial_number, category || null, description || null, req.params.id);
    res.redirect('/equipment');
  } catch (err) {
    res.render('equipment/form', { equipment: { ...req.body, id: req.params.id }, error: 'Ο σειριακός αριθμός υπάρχει ήδη.' });
  }
});

router.post('/:id/delete', requireAdmin, (req, res) => {
  const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
  if (!equipment) return res.status(404).render('error', { message: 'Ο εξοπλισμός δεν βρέθηκε.' });
  if (equipment.status === 'assigned') {
    return res.status(400).render('error', { message: 'Δεν μπορείτε να διαγράψετε εξοπλισμό που είναι χρεωμένος.' });
  }
  db.prepare('DELETE FROM equipment WHERE id = ?').run(req.params.id);
  res.redirect('/equipment');
});

module.exports = router;
