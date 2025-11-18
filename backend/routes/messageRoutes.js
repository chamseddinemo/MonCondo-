const express = require('express');
const router = express.Router();
const {
  getMessages,
  getConversation,
  getMessage,
  createMessage,
  updateMessage,
  deleteMessage,
  markAsRead,
  getUnreadMessages,
  getUnreadCount
} = require('../controllers/messageController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/unread', getUnreadMessages);
router.get('/unread/count', getUnreadCount);
router.get('/conversation/:userId', getConversation);

router.route('/')
  .get(getMessages)
  .post(createMessage);

router.route('/:id')
  .get(getMessage)
  .put(updateMessage)
  .delete(deleteMessage);

router.put('/:id/read', markAsRead);

module.exports = router;

