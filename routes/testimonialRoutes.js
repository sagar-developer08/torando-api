const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const {
  createTestimonial,
  getTestimonials,
  getFeaturedTestimonials,
  getTestimonialById,
  updateTestimonial,
  deleteTestimonial
} = require('../controllers/testimonialController');

// Public routes
router.get('/', getTestimonials);
router.get('/featured', getFeaturedTestimonials);

// Admin routes
router.post(
  '/',
  protect,
  authorize('admin'),
  uploadMiddleware.single('image'),
  createTestimonial
);
router.get('/:id', protect, authorize('admin'), getTestimonialById);
router.put(
  '/:id',
  protect,
  authorize('admin'),
  uploadMiddleware.single('image'),
  updateTestimonial
);
router.delete('/:id', protect, authorize('admin'), deleteTestimonial);

module.exports = router;