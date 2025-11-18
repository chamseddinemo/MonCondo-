const express = require('express');
const router = express.Router();
const {
  getDocuments,
  getDocument,
  downloadDocument,
  uploadDocument,
  updateDocument,
  deleteDocument
} = require('../controllers/documentController');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.use(protect);

router.route('/')
  .get(getDocuments)
  .post(upload.single('file'), uploadDocument);

router.get('/:id/download', downloadDocument);

router.route('/:id')
  .get(getDocument)
  .put(updateDocument)
  .delete(deleteDocument);

module.exports = router;

