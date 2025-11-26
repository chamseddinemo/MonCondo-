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
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/documentCategoryController');
const {
  getTags,
  createTag,
  updateTag,
  deleteTag
} = require('../controllers/documentTagController');
const {
  getFolders,
  getFolderTree,
  createFolder,
  updateFolder,
  deleteFolder
} = require('../controllers/documentFolderController');
const { protect } = require('../middlewares/auth');
const roleAuth = require('../middlewares/roleAuth');
const upload = require('../middlewares/upload');

router.use(protect);

// Routes pour les documents
router.route('/')
  .get(getDocuments)
  .post(upload.single('file'), uploadDocument);

router.get('/:id/download', downloadDocument);

router.route('/:id')
  .get(getDocument)
  .put(updateDocument)
  .delete(deleteDocument);

// Routes pour les catégories
router.route('/categories')
  .get(getCategories)
  .post(roleAuth('admin'), createCategory);

router.route('/categories/:id')
  .put(roleAuth('admin'), updateCategory)
  .delete(roleAuth('admin'), deleteCategory);

// Routes pour les tags
router.route('/tags')
  .get(getTags)
  .post(createTag);

router.route('/tags/:id')
  .put(updateTag)
  .delete(deleteTag);

// Routes pour les dossiers
router.route('/folders')
  .get(getFolders)
  .post(createFolder);

router.get('/folders/tree', getFolderTree);

router.route('/folders/:id')
  .put(updateFolder)
  .delete(deleteFolder);

module.exports = router;

