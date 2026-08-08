const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', (req, res) => {
  const users = db.prepare('SELECT id, username, full_name, email, role, created_at FROM users ORDER BY full_name').all();
  res.render('users/list', { users });
});

router.get('/new', (req, res) => {
  res.render('users/form', { error: null, form: {} });
});

router.post('/', (req, res) => {
  const { username, password, full_name, email, role } = req.body;
  if (!username || !password || !full_name || !email || !['admin', 'technician'].includes(role)) {
    return res.render('users/form', { error: 'Συμπληρώστε όλα τα πεδία σωστά.', form: req.body });
  }
  try {
    const password_hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (username, password_hash, full_name, email, role) VALUES (?, ?, ?, ?, ?)')
      .run(username, password_hash, full_name, email, role);
    res.redirect('/users');
  } catch (err) {
    res.render('users/form', { error: 'Το όνομα χρήστη υπάρχει ήδη.', form: req.body });
  }
});

router.post('/:id/delete', (req, res) => {
  if (Number(req.params.id) === req.session.user.id) {
    return res.status(400).render('error', { message: 'Δεν μπορείτε να διαγράψετε τον δικό σας λογαριασμό.' });
  }
  const hasAssignments = db.prepare('SELECT COUNT(*) AS c FROM assignments WHERE technician_id = ?').get(req.params.id).c;
  if (hasAssignments > 0) {
    return res.status(400).render('error', { message: 'Δεν μπορείτε να διαγράψετε τεχνικό που έχει ιστορικό χρεώσεων.' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.redirect('/users');
});

module.exports = router;
