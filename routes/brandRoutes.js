const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const {
  createBrand,
  getBrands,
  getFeaturedBrands,
  getBrandById,
  updateBrand,
  deleteBrand
} = require('../controllers/brandController');

// Public routes
router.get('/', getBrands);
router.get('/featured', getFeaturedBrands);
router.get('/:id', getBrandById);

// Admin routes
router.post(
  '/',
  protect,
  authorize('admin'),
  uploadMiddleware.single('logo'),
  createBrand
);
router.put(
  '/:id',
  protect,
  authorize('admin'),
  uploadMiddleware.single('logo'),
  updateBrand
);
router.delete('/:id', protect, authorize('admin'), deleteBrand);

module.exports = router;