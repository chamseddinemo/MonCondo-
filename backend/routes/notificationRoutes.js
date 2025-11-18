const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  exportHistory
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/export/:format', exportHistory);
router.patch('/read/all', markAllAsRead);
router.patch('/read/:id', markAsRead);
router.delete('/:id', deleteNotification);
router.get('/', getNotifications);

module.exports = router;

