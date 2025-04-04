const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
  markAbandonedCarts,
  getAbandonedCarts,
  recoverAbandonedCart,
  getAbandonedCartStats
} = require('../controllers/abandonCartController');

// All routes are protected and require admin access
router.use(protect);
router.use(authorize('admin'));

router.post('/mark-abandoned', markAbandonedCarts);
router.get('/abandoned', getAbandonedCarts);
router.post('/:id/recover', recoverAbandonedCart);
router.get('/abandoned/stats', getAbandonedCartStats);

module.exports = router;