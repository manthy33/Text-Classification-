const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.render('login', { error: 'Λάθος όνομα χρήστη ή κωδικός.' });
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
  };
  res.redirect('/');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
