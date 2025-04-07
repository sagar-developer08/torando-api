const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateProfile,
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultAddress,
  getUserOrders,
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/userController');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/logout', logoutUser);

// Protected routes - User profile
router.get('/me', protect, getMe);
router.put('/profile', protect, uploadMiddleware.single('profileImage'), updateProfile);

// Add a specific GET route for /profile that redirects to the /me endpoint
router.get('/profile', protect, getMe);

// Protected routes - User addresses
router.get('/addresses', protect, getUserAddresses);
router.post('/addresses', protect, addUserAddress);
router.put('/addresses/:addressId', protect, updateUserAddress);
router.delete('/addresses/:addressId', protect, deleteUserAddress);
router.put('/addresses/:addressId/default', protect, setDefaultAddress);

// Protected routes - Order history
router.get('/orders', protect, getUserOrders);

// Protected routes - Wishlist
router.get('/wishlist', protect, getUserWishlist);
router.post('/wishlist/:productId', protect, addToWishlist);
router.delete('/wishlist/:productId', protect, removeFromWishlist);

// Admin routes
router.get('/', protect, authorize('admin'), getUsers);
router.get('/:id', protect, authorize('admin'), getUserById);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;