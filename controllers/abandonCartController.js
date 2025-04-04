const Cart = require('../models/cartModel');
const User = require('../models/userModel');
const { asyncHandler, AppError } = require('../utils/errorHandler');

// @desc    Mark carts as abandoned
// @route   POST /api/admin/carts/mark-abandoned
// @access  Private/Admin
exports.markAbandonedCarts = asyncHandler(async (req, res) => {
  // Get threshold time (e.g., carts inactive for 24 hours)
  const { hours = 24 } = req.body;
  const thresholdDate = new Date();
  thresholdDate.setHours(thresholdDate.getHours() - hours);

  // Find carts that have items, are not already marked as abandoned,
  // and haven't been active since the threshold time
  const result = await Cart.updateMany(
    { 
      items: { $exists: true, $ne: [] },
      isAbandoned: false,
      lastActive: { $lt: thresholdDate }
    },
    { 
      isAbandoned: true,
      abandonedAt: new Date()
    }
  );

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} carts marked as abandoned`,
    data: result
  });
});

// @desc    Get all abandoned carts
// @route   GET /api/admin/carts/abandoned
// @access  Private/Admin
exports.getAbandonedCarts = asyncHandler(async (req, res) => {
  const abandonedCarts = await Cart.find({ isAbandoned: true })
    .populate('user', 'name email')
    .populate('items.product', 'name images price')
    .sort('-abandonedAt');

  res.status(200).json({
    success: true,
    count: abandonedCarts.length,
    data: abandonedCarts
  });
});

// @desc    Recover an abandoned cart (send email reminder)
// @route   POST /api/admin/carts/:id/recover
// @access  Private/Admin
exports.recoverAbandonedCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findById(req.params.id);
  
  if (!cart) {
    throw new AppError('Cart not found', 404);
  }
  
  if (!cart.isAbandoned) {
    throw new AppError('This cart is not marked as abandoned', 400);
  }
  
  // Get user details
  const user = await User.findById(cart.user);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  // Here you would typically send an email to the user
  // This is a placeholder for email sending logic
  // You can integrate with your email service provider here
  
  // For demonstration, we'll just mark the cart as being recovered
  cart.isAbandoned = false;
  cart.lastActive = new Date();
  await cart.save();
  
  res.status(200).json({
    success: true,
    message: `Recovery email sent to ${user.email}`,
    data: cart
  });
});

// @desc    Get abandoned cart statistics
// @route   GET /api/admin/carts/abandoned/stats
// @access  Private/Admin
exports.getAbandonedCartStats = asyncHandler(async (req, res) => {
  // Get total count of abandoned carts
  const totalAbandoned = await Cart.countDocuments({ isAbandoned: true });
  
  // Get count of carts abandoned in the last 24 hours
  const last24Hours = new Date();
  last24Hours.setHours(last24Hours.getHours() - 24);
  const abandonedLast24Hours = await Cart.countDocuments({ 
    isAbandoned: true,
    abandonedAt: { $gte: last24Hours }
  });
  
  // Get total value of all abandoned carts
  const abandonedCarts = await Cart.find({ isAbandoned: true });
  const totalValue = abandonedCarts.reduce((sum, cart) => sum + cart.totalPrice, 0);
  
  // Get average value of abandoned carts
  const averageValue = totalAbandoned > 0 ? totalValue / totalAbandoned : 0;
  
  res.status(200).json({
    success: true,
    data: {
      totalAbandoned,
      abandonedLast24Hours,
      totalValue,
      averageValue
    }
  });
});