const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  createProductReview,
  getTopProducts,
  getFeaturedProducts,
  getBestSellerProducts,  // Add this new controller
  getNewArrivalProducts   // Add this new controller
} = require('../controllers/productController');

// Public routes
router.get('/', getProducts);
router.get('/top', getTopProducts);
router.get('/featured', getFeaturedProducts);
router.get('/best-sellers', getBestSellerProducts);  // Add this new route
router.get('/new-arrivals', getNewArrivalProducts);  // Add this new route
router.get('/:id', getProductById);

// Protected routes
router.post('/:id/reviews', protect, createProductReview);

// Admin routes
router.post(
  '/',
  protect,
  authorize('admin'),
  uploadMiddleware.array('images', 5),
  createProduct
);
router.put(
  '/:id',
  protect,
  authorize('admin'),
  uploadMiddleware.array('images', 5),
  updateProduct
);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

module.exports = router;