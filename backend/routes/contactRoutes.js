const express = require('express');
const router = express.Router();
const { sendContactMessage } = require('../controllers/contactController');

// Route publique pour les messages de contact (pas d'authentification requise)
router.post('/', sendContactMessage);

console.log('[CONTACT ROUTES] ✅ Routes de contact chargées');
console.log('[CONTACT ROUTES]   - POST /api/contact (public)');

module.exports = router;

