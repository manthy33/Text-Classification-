require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;
const email = process.env.ADMIN_EMAIL;
const full_name = process.env.ADMIN_FULLNAME || 'Διαχειριστής';

if (!username || !password || !email) {
  console.error('Ορίστε ADMIN_USERNAME, ADMIN_PASSWORD και ADMIN_EMAIL στο .env πριν τρέξετε το seed.');
  process.exit(1);
}

const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
if (existing) {
  console.log(`Ο χρήστης "${username}" υπάρχει ήδη — δεν έγινε καμία αλλαγή.`);
  process.exit(0);
}

const password_hash = bcrypt.hashSync(password, 10);
db.prepare('INSERT INTO users (username, password_hash, full_name, email, role) VALUES (?, ?, ?, ?, ?)')
  .run(username, password_hash, full_name, email, 'admin');

console.log(`Δημιουργήθηκε ο λογαριασμός διαχειριστή "${username}".`);
