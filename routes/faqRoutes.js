const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  createFAQ,
  getFAQs,
  getFAQsByCategory,
  getFAQById,
  updateFAQ,
  deleteFAQ
} = require('../controllers/faqController');

// Public routes
router.get('/', getFAQs);
router.get('/category/:category', getFAQsByCategory);
router.get('/:id', getFAQById);

// Admin routes
router.post('/', protect, authorize('admin'), createFAQ);
router.put('/:id', protect, authorize('admin'), updateFAQ);
router.delete('/:id', protect, authorize('admin'), deleteFAQ);

module.exports = router;