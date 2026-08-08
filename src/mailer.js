// Στέλνουμε emails μέσω του HTTPS API της Resend αντί για SMTP socket, γιατί
// πολλά hosting platforms (π.χ. Railway) μπλοκάρουν εντελώς τις θύρες SMTP
// (25/465/587) αλλά ποτέ το HTTPS.
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function sendMail({ subject, text }) {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) {
    console.warn('[mailer] Δεν έχει οριστεί NOTIFY_EMAIL στο .env — παραλείπεται η αποστολή email.');
    return;
  }
  if (!RESEND_API_KEY) {
    console.warn('[mailer] Δεν έχει οριστεί RESEND_API_KEY στο .env — παραλείπεται η αποστολή email.');
    console.warn(`[mailer] Θα είχε σταλεί: "${subject}" -> ${to}`);
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'Equipment Manager <onboarding@resend.dev>',
        to,
        subject,
        text,
      }),
    });
    if (!res.ok) {
      console.error('[mailer] Αποτυχία αποστολής email:', res.status, await res.text());
    }
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
