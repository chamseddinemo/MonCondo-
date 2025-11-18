const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  promoteToOwner
} = require('../controllers/userController');
const { protect } = require('../middlewares/auth');
const roleAuth = require('../middlewares/roleAuth');

router.use(protect);

router.route('/')
  .get(roleAuth('admin'), getUsers)
  .post(roleAuth('admin'), createUser);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(roleAuth('admin'), deleteUser);

router.put('/:id/promote', roleAuth('admin'), promoteToOwner);

module.exports = router;

