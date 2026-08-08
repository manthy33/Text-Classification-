function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.locals.currentUser = req.session.user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).render('error', { message: 'Δεν έχετε δικαίωμα πρόσβασης σε αυτή τη σελίδα.' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
