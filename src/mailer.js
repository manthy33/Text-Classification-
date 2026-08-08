const nodemailer = require('nodemailer');

const hasSmtpConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

async function sendMail({ subject, text, html }) {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) {
    console.warn('[mailer] Δεν έχει οριστεί NOTIFY_EMAIL στο .env — παραλείπεται η αποστολή email.');
    return;
  }
  if (!transporter) {
    console.warn('[mailer] Δεν έχουν ρυθμιστεί στοιχεία SMTP στο .env — παραλείπεται η αποστολή email.');
    console.warn(`[mailer] Θα είχε σταλεί: "${subject}" -> ${to}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error('[mailer] Αποτυχία αποστολής email:', err.message);
  }
}

function sendAssignmentEmail({ equipment, assignment, technician }) {
  const subject = `Χρέωση εξοπλισμού: ${equipment.name} (${equipment.serial_number})`;
  const text = [
    `Ο εξοπλισμός "${equipment.name}" (S/N: ${equipment.serial_number}) χρεώθηκε.`,
    `Παραλήπτης: ${assignment.assigned_to}`,
    `Τεχνικός: ${technician.full_name} (${technician.username})`,
    assignment.notes ? `Σημειώσεις: ${assignment.notes}` : null,
    `Ημερομηνία χρέωσης: ${assignment.assigned_at}`,
  ].filter(Boolean).join('\n');

  return sendMail({ subject, text });
}

function sendReturnEmail({ equipment, assignment, technician }) {
  const subject = `Αποχρέωση εξοπλισμού: ${equipment.name} (${equipment.serial_number})`;
  const text = [
    `Ο εξοπλισμός "${equipment.name}" (S/N: ${equipment.serial_number}) επιστράφηκε (αποχρεώθηκε).`,
    `Παραλήπτης: ${assignment.assigned_to}`,
    `Τεχνικός: ${technician.full_name} (${technician.username})`,
    assignment.return_notes ? `Σημειώσεις επιστροφής: ${assignment.return_notes}` : null,
    `Ημερομηνία χρέωσης: ${assignment.assigned_at}`,
    `Ημερομηνία αποχρέωσης: ${assignment.returned_at}`,
  ].filter(Boolean).join('\n');

  return sendMail({ subject, text });
}

module.exports = { sendAssignmentEmail, sendReturnEmail };
