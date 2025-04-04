const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const {
  createCategory,
  getCategories,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

// Public routes
router.get('/', getCategories);
router.get('/all', getAllCategories);
router.get('/:id', getCategoryById);

// Admin routes
router.post(
  '/',
  protect,
  authorize('admin'),
  uploadMiddleware.single('image'),
  createCategory
);
router.put(
  '/:id',
  protect,
  authorize('admin'),
  uploadMiddleware.single('image'),
  updateCategory
);
router.delete('/:id', protect, authorize('admin'), deleteCategory);

module.exports = router;