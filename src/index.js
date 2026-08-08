require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./db');
const { requireAuth } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const equipmentRoutes = require('./routes/equipment');
const assignmentRoutes = require('./routes/assignments');
const userRoutes = require('./routes/users');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 },
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

app.use('/', authRoutes);
app.use('/equipment', equipmentRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/users', userRoutes);

app.get('/', requireAuth, (req, res) => {
  const isAdmin = req.session.user.role === 'admin';
  const totalEquipment = db.prepare('SELECT COUNT(*) AS c FROM equipment').get().c;
  const assignedEquipment = db.prepare("SELECT COUNT(*) AS c FROM equipment WHERE status = 'assigned'").get().c;
  const myActiveAssignments = db.prepare(
    'SELECT COUNT(*) AS c FROM assignments WHERE technician_id = ? AND returned_at IS NULL'
  ).get(req.session.user.id).c;

  res.render('dashboard', {
    totalEquipment,
    assignedEquipment,
    availableEquipment: totalEquipment - assignedEquipment,
    myActiveAssignments,
    isAdmin,
  });
});

app.use((req, res) => {
  res.status(404).render('error', { message: 'Η σελίδα δεν βρέθηκε.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Equipment Manager running on http://localhost:${PORT}`);
});
