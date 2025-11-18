const express = require('express');
const router = express.Router();
const {
  getConversations,
  getConversation,
  createOrGetDirectConversation,
  createUnitConversation,
  archiveConversation,
  getContacts,
  getConversationMessages
} = require('../controllers/conversationController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/contacts', getContacts);
router.get('/:id/messages', getConversationMessages);
router.post('/direct', createOrGetDirectConversation);
router.post('/unit', createUnitConversation);
router.put('/:id/archive', archiveConversation);

router.route('/')
  .get(getConversations);

router.route('/:id')
  .get(getConversation);

module.exports = router;

