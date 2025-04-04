const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  createContact,
  getContacts,
  getContactById,
  updateContactStatus,
  deleteContact
} = require('../controllers/contactController');

// Public routes
router.post('/', createContact);

// Admin routes
router.get('/', protect, authorize('admin'), getContacts);
router.get('/:id', protect, authorize('admin'), getContactById);
router.put('/:id', protect, authorize('admin'), updateContactStatus);
router.delete('/:id', protect, authorize('admin'), deleteContact);

module.exports = router;