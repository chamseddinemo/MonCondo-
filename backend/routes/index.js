const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API MonCondo+ - Bienvenue',
    version: '1.0.0',
      endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      buildings: '/api/buildings',
      units: '/api/units',
      requests: '/api/requests',
      documents: '/api/documents',
      messages: '/api/messages',
      payments: '/api/payments'
    }
  });
});

module.exports = router;

