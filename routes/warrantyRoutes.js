const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const {
  registerWarranty,
  getUserWarranties,
  getWarrantyById,
  updateWarrantyStatus,
  getAllWarranties,
  deleteWarranty
} = require('../controllers/warrantyController');

// Protected routes
router.post(
  '/',
  protect,
  uploadMiddleware.array('documents', 3),
  registerWarranty
);
router.get('/', protect, getUserWarranties);
router.get('/:id', protect, getWarrantyById);

// Admin routes
router.get('/all', protect, authorize('admin'), getAllWarranties);
router.put('/:id', protect, authorize('admin'), updateWarrantyStatus);
router.delete('/:id', protect, authorize('admin'), deleteWarranty);

module.exports = router;