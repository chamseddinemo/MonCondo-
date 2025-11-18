const express = require('express');
const router = express.Router();
const {
  getBuildings,
  getBuilding,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  getBuildingsStats
} = require('../controllers/buildingController');
const { protect } = require('../middlewares/auth');
const roleAuth = require('../middlewares/roleAuth');

// Log de confirmation que les routes sont chargées
console.log('[BUILDING ROUTES] ✅ Routes buildings chargées');

// Middleware pour passer io (Socket.io) aux contrôleurs
router.use((req, res, next) => {
  // Récupérer io depuis app.locals si disponible
  req.io = req.app.get('io');
  next();
});

// Middleware de debug pour toutes les requêtes
router.use((req, res, next) => {
  console.log('[BUILDING ROUTES] 📡 Requête reçue:', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    hasAuth: !!req.headers.authorization
  });
  next();
});

// Toutes les routes nécessitent une authentification
router.use(protect);

// Log de confirmation après middleware protect
router.use((req, res, next) => {
  console.log('[BUILDING ROUTES] ✅ Utilisateur authentifié:', req.user ? req.user.email : 'non');
  next();
});

// Route pour les statistiques (Admin seulement)
router.get('/stats', roleAuth('admin'), getBuildingsStats);

// Routes CRUD
router.route('/')
  .get((req, res, next) => {
    console.log('[BUILDING ROUTES] 🔵 Route GET / appelée');
    next();
  }, getBuildings)
  .post(roleAuth('admin'), createBuilding);

router.route('/:id')
  .get(getBuilding)
  .put(roleAuth('admin'), updateBuilding)
  .delete(roleAuth('admin'), deleteBuilding);

// Log final de confirmation
console.log('[BUILDING ROUTES] ✅✅ Route GET /api/buildings confirmée et enregistrée!');

module.exports = router;

