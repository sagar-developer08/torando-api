const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  subscribe,
  unsubscribe,
  getSubscribers,
  deleteSubscriber,
  sendNewsletter
} = require('../controllers/newsletterController');

// Public routes
router.post('/subscribe', subscribe);
router.get('/unsubscribe/:token', unsubscribe);

// Admin routes
router.get('/', protect, authorize('admin'), getSubscribers);
router.delete('/:id', protect, authorize('admin'), deleteSubscriber);
router.post('/send', protect, authorize('admin'), sendNewsletter);

module.exports = router;