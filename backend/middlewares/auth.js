const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/jwt');

/**
 * Middleware d'authentification JWT amélioré
 * Vérifie la présence et la validité du token JWT
 * Ajoute l'utilisateur à req.user pour les routes suivantes
 * Logs chaque tentative d'accès refusé pour sécurité
 */
exports.protect = async (req, res, next) => {
  let token;

  // Récupérer le token depuis l'en-tête Authorization
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Vérifier si le token existe
  if (!token) {
    console.warn(`[AUTH] ❌ Tentative d'accès sans token`);
    console.warn(`[AUTH]    IP: ${req.ip || req.connection.remoteAddress}`);
    console.warn(`[AUTH]    Route: ${req.method} ${req.originalUrl}`);
    console.warn(`[AUTH]    Headers Authorization: ${req.headers.authorization || 'Non présent'}`);
    return res.status(401).json({
      success: false,
      message: 'Non autorisé - Token manquant',
      code: 'TOKEN_MISSING'
    });
  }

  try {
    // Décoder et vérifier le token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Récupérer l'utilisateur depuis la base de données
    req.user = await User.findById(decoded.id).select('-password');
    
    if (!req.user) {
      console.warn(`[AUTH] Utilisateur non trouvé pour token - User ID: ${decoded.id} - IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      });
    }

    // Vérifier si le compte est actif
    if (!req.user.isActive) {
      console.warn(`[AUTH] Tentative d'accès avec compte désactivé - User: ${req.user.email} - IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: 'Compte désactivé',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Log de succès (toujours actif pour diagnostic)
    console.log(`[AUTH] ✅ Accès autorisé`);
    console.log(`[AUTH]    User: ${req.user.email} (${req.user.role})`);
    console.log(`[AUTH]    Route: ${req.method} ${req.originalUrl}`);
    console.log(`[AUTH]    User ID: ${req.user._id}`);

    next();
  } catch (error) {
    // Gérer différents types d'erreurs JWT
    let errorMessage = 'Token invalide ou expiré';
    let errorCode = 'TOKEN_INVALID';

    if (error.name === 'TokenExpiredError') {
      errorMessage = 'Token expiré';
      errorCode = 'TOKEN_EXPIRED';
    } else if (error.name === 'JsonWebTokenError') {
      errorMessage = 'Token invalide';
      errorCode = 'TOKEN_MALFORMED';
    }

    console.warn(`[AUTH] ${errorMessage} - IP: ${req.ip} - Route: ${req.method} ${req.originalUrl}`);
    
    return res.status(401).json({
      success: false,
      message: errorMessage,
      code: errorCode
    });
  }
};

/**
 * Middleware d'authentification optionnel
 * Permet d'accéder à req.user si connecté, mais ne bloque pas si non connecté
 * Utile pour les routes qui peuvent être publiques ou privées
 */
exports.optionalAuth = async (req, res, next) => {
  // CRITIQUE: Cette fonction est pour les routes PUBLIQUES
  // Elle ne doit JAMAIS bloquer une requête, même sans token
  
  // Log immédiat pour voir si le middleware est appelé
  console.log('[optionalAuth] 🔓 Middleware appelé pour:', req.method, req.originalUrl || req.path);
  console.log('[optionalAuth] Headers Authorization:', req.headers.authorization ? 'Present' : 'Not present');
  
  let token;

  // Vérifier si un header Authorization est présent
  // IMPORTANT: Cette route est PUBLIQUE - on ne bloque JAMAIS même sans token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('[optionalAuth] Token détecté dans header');
  } else {
    console.log('[optionalAuth] Pas de token dans header - C\'EST NORMAL pour route publique');
  }

  // Si un token est présent, essayer de le valider
  // Mais ne JAMAIS bloquer la requête si le token est absent ou invalide
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (req.user) {
        console.log('[optionalAuth] ✅ Token valide, utilisateur:', req.user.email, '- Route:', req.method, req.path);
      } else {
        console.log('[optionalAuth] ⚠️ Token valide mais utilisateur non trouvé - Route:', req.method, req.path);
        req.user = null;
      }
    } catch (error) {
      // Ignorer les erreurs pour l'auth optionnelle - c'est NORMAL et ATTENDU
      // Un token invalide ou expiré ne doit PAS bloquer une route publique
      console.log('[optionalAuth] ℹ️ Token invalide/expiré, accès public autorisé - Route:', req.method, req.path);
      req.user = null;
    }
  } else {
    // Pas de token = accès public autorisé (C'EST NORMAL pour les routes publiques)
    console.log('[optionalAuth] ℹ️ Pas de token, accès public autorisé - Route:', req.method, req.path);
    req.user = null;
  }

  // CRITIQUE: TOUJOURS appeler next() - cette route est publique
  // Ne JAMAIS retourner une erreur 401 ici
  // Même si une erreur se produit, on continue quand même
  console.log('[optionalAuth] ✅ Appel de next() - Route publique autorisée');
  try {
    next();
  } catch (error) {
    // Si next() échoue, on continue quand même (route publique)
    console.error('[optionalAuth] Erreur dans next(), mais on continue (route publique):', error);
    next();
  }
};

// Générer un token JWT
exports.generateToken = (id) => {
  const { JWT_SECRET, JWT_EXPIRE } = require('../config/jwt');
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRE
  });
};

