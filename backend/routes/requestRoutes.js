const express = require('express');
const router = express.Router();
const {
  getRequests,
  getRequest,
  createRequest,
  updateRequest,
  deleteRequest,
  updateStatus,
  assignRequest,
  createVisitorRequest,
  acceptRequest,
  rejectRequest,
  addAdminNote,
  signDocument,
  validateInitialPayment,
  assignUnit,
  downloadDocument,
  initiateInitialPayment,
  getPaymentStatus
} = require('../controllers/requestController');
const { protect } = require('../middlewares/auth');
const roleAuth = require('../middlewares/roleAuth');

// Middleware de débogage pour toutes les requêtes
router.use((req, res, next) => {
  if (req.path.includes('payment/initiate')) {
    console.log('[REQUEST ROUTES DEBUG] 🔍 Requête détectée:', req.method, req.path);
    console.log('[REQUEST ROUTES DEBUG]    Original URL:', req.originalUrl);
    console.log('[REQUEST ROUTES DEBUG]    Base URL:', req.baseUrl);
  }
  next();
});

// Appliquer le middleware protect à toutes les routes
router.use(protect);


router.post('/visitor-request', createVisitorRequest);

router.route('/')
  .get(getRequests)
  .post(createRequest);

// Routes spécifiques doivent être définies AVANT la route générique /:id
// IMPORTANT: L'ordre est critique - Express match les routes dans l'ordre
// Les routes avec plus de segments (ex: /:id/payment/initiate) doivent être EN PREMIER

// Route pour initier le paiement initial (pour propriétaire dans le cas d'un achat)
router.get('/:id/payment-status', getPaymentStatus);
router.post('/:id/payment/initiate', initiateInitialPayment);
router.put('/:id/payment/validate', roleAuth('admin'), validateInitialPayment);
router.put('/:id/documents/:docId/sign', signDocument);
router.get('/:id/documents/:docId/download', downloadDocument);
router.put('/:id/assign-unit', roleAuth('admin'), assignUnit);

// Routes avec un seul segment supplémentaire
router.put('/:id/status', roleAuth('admin'), updateStatus);
router.put('/:id/assign', roleAuth('admin'), assignRequest);
router.put('/:id/reject', roleAuth('admin'), rejectRequest);
router.post('/:id/notes', roleAuth('admin'), addAdminNote);

// Route pour accepter une demande - Route spécifique AVANT /:id
router.put('/:id/accept', (req, res, next) => {
  console.log('[REQUEST ROUTES] 🔵 Route PUT /:id/accept appelée');
  console.log('[REQUEST ROUTES]    ID:', req.params.id);
  console.log('[REQUEST ROUTES]    Method:', req.method);
  console.log('[REQUEST ROUTES]    URL:', req.originalUrl);
  console.log('[REQUEST ROUTES]    Path:', req.path);
  console.log('[REQUEST ROUTES]    User:', req.user ? req.user.email : 'non authentifié');
  next();
}, roleAuth('admin'), acceptRequest);

// Route générique doit être définie APRÈS les routes spécifiques
router.route('/:id')
  .get(getRequest)
  .put(updateRequest)
  .delete(deleteRequest);

// Log de confirmation que les routes sont bien enregistrées
console.log('[REQUEST ROUTES] ✅ Routes requests enregistrées');
console.log('[REQUEST ROUTES]    Nombre de layers:', router.stack ? router.stack.length : 0);

// Vérifier que les routes importantes sont bien enregistrées
if (router.stack) {
  const acceptRoute = router.stack.find(layer => 
    layer.route && 
    layer.route.path === '/:id/accept' && 
    layer.route.methods.put
  );
  if (acceptRoute) {
    console.log('[REQUEST ROUTES] ✅✅ Route PUT /:id/accept confirmée');
  } else {
    console.error('[REQUEST ROUTES] ❌❌ Route PUT /:id/accept NON TROUVÉE!');
  }

}

module.exports = router;

