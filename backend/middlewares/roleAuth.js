/**
 * Middleware de vérification des rôles
 * Doit être utilisé APRÈS le middleware protect()
 * Autorise l'accès uniquement aux rôles spécifiés
 * Logs chaque tentative d'accès refusé pour sécurité
 */
const roleAuth = (...roles) => {
  return (req, res, next) => {
    // Vérifier que l'utilisateur est authentifié (doit être fait par protect() avant)
    if (!req.user) {
      console.warn(`[ROLE_AUTH] Tentative d'accès sans authentification - IP: ${req.ip} - Route: ${req.method} ${req.originalUrl}`);
      return res.status(401).json({
        success: false,
        message: 'Non autorisé - Utilisateur non authentifié',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Les administrateurs ont accès à tout, peu importe les rôles requis
    if (req.user.role === 'admin') {
      console.log(`[ROLE_AUTH] ✅ Accès admin autorisé automatiquement`);
      console.log(`[ROLE_AUTH]    User: ${req.user.email} (${req.user.role})`);
      console.log(`[ROLE_AUTH]    Route: ${req.method} ${req.originalUrl}`);
      return next();
    }

    // Vérifier que le rôle de l'utilisateur est autorisé
    console.log(`[ROLE_AUTH] Vérification - User: ${req.user.email}, Role: "${req.user.role}", Rôles requis: [${roles.join(', ')}]`);
    console.log(`[ROLE_AUTH] Comparaison: roles.includes("${req.user.role}") = ${roles.includes(req.user.role)}`);
    
    if (!roles.includes(req.user.role)) {
      console.warn(`[ROLE_AUTH] ❌ Accès refusé - User: ${req.user.email} (${req.user.role}) - Rôles requis: ${roles.join(' ou ')} - IP: ${req.ip} - Route: ${req.method} ${req.originalUrl}`);
      return res.status(403).json({
        success: false,
        message: `Accès refusé - Rôle requis: ${roles.join(' ou ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    // Log de succès (toujours en développement, ou si c'est un propriétaire)
    console.log(`[ROLE_AUTH] ✅ Accès autorisé - User: ${req.user.email} (${req.user.role}) - Route: ${req.method} ${req.originalUrl}`);

    next();
  };
};

module.exports = roleAuth;

