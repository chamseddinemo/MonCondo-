/**
 * Middleware d'autorisation pour les paiements
 * Autorise les rôles: admin, proprietaire, locataire
 * Doit être utilisé APRÈS le middleware protect()
 */
const authorizePayment = (req, res, next) => {
  // Vérifier que l'utilisateur est authentifié (doit être fait par protect() avant)
  if (!req.user) {
    console.warn(`[AUTHORIZE_PAYMENT] ❌ Tentative d'accès sans authentification - IP: ${req.ip} - Route: ${req.method} ${req.originalUrl}`);
    return res.status(401).json({
      success: false,
      message: 'Non autorisé - Utilisateur non authentifié',
      code: 'NOT_AUTHENTICATED'
    });
  }

  // Rôles autorisés pour créer des paiements
  const allowedRoles = ['admin', 'proprietaire', 'locataire'];
  
  console.log(`[AUTHORIZE_PAYMENT] Vérification - User: ${req.user.email}, Role: "${req.user.role}"`);
  console.log(`[AUTHORIZE_PAYMENT] Rôles autorisés: [${allowedRoles.join(', ')}]`);
  console.log(`[AUTHORIZE_PAYMENT] Rôle autorisé: ${allowedRoles.includes(req.user.role)}`);
  
  if (!allowedRoles.includes(req.user.role)) {
    console.warn(`[AUTHORIZE_PAYMENT] ❌ Accès refusé - User: ${req.user.email} (${req.user.role}) - Rôles autorisés: ${allowedRoles.join(', ')} - IP: ${req.ip} - Route: ${req.method} ${req.originalUrl}`);
    return res.status(403).json({
      success: false,
      message: `Accès refusé. Rôles autorisés: ${allowedRoles.join(', ')}. Votre rôle: ${req.user.role}`,
      code: 'INSUFFICIENT_PERMISSIONS',
      allowedRoles: allowedRoles,
      userRole: req.user.role
    });
  }

  console.log(`[AUTHORIZE_PAYMENT] ✅ Accès autorisé - User: ${req.user.email} (${req.user.role}) - Route: ${req.method} ${req.originalUrl}`);
  next();
};

module.exports = authorizePayment;

