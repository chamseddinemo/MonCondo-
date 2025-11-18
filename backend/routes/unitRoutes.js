const express = require('express');
const router = express.Router();
const {
  getUnits,
  getUnit,
  createUnit,
  updateUnit,
  deleteUnit,
  assignOwner,
  assignTenant,
  releaseUnit,
  getAvailableUnits,
  getNouvellesUnits,
  getUnitsStats
} = require('../controllers/unitController');
const { protect, optionalAuth } = require('../middlewares/auth');
const roleAuth = require('../middlewares/roleAuth');

// Route publique pour les unités disponibles (à louer ou à vendre)
// Utiliser optionalAuth pour permettre l'accès sans token, mais utiliser req.user si disponible
router.get('/available', optionalAuth, getAvailableUnits);

// Toutes les autres routes nécessitent une authentification
router.use(protect);

router.get('/nouvelles', getNouvellesUnits); // Route pour les unités récentes
router.get('/stats', roleAuth('admin'), getUnitsStats); // Route pour les statistiques (protect déjà appliqué via router.use)

router.route('/')
  .get(getUnits)
  .post(roleAuth('admin'), createUnit);

router.route('/:id')
  .get(getUnit)
  .put(updateUnit)
  .delete(roleAuth('admin'), deleteUnit);

router.put('/:id/assign-owner', roleAuth('admin'), assignOwner);
router.put('/:id/assign-tenant', assignTenant);
router.put('/:id/release', releaseUnit);

module.exports = router;

