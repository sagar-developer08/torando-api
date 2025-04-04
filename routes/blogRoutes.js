const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const uploadMiddleware = require('../middlewares/uploadMiddleware');
const {
  createBlog,
  getBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  addComment,
  getComments
} = require('../controllers/blogController');

// Public routes
router.get('/', getBlogs);
router.get('/:id', getBlogById);
router.get('/:id/comments', getComments);
router.post('/:id/comments', addComment);

// Admin routes
router.post(
  '/',
  protect,
  authorize('admin'),
  uploadMiddleware.single('featuredImage'),
  createBlog
);
router.put(
  '/:id',
  protect,
  authorize('admin'),
  uploadMiddleware.single('featuredImage'),
  updateBlog
);
router.delete('/:id', protect, authorize('admin'), deleteBlog);

module.exports = router;