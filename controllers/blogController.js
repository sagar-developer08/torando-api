const Blog = require('../models/blogModel');
const { uploadToS3, deleteFromS3 } = require('../config/s3');
const { asyncHandler, sendSuccessResponse } = require('../utils/errorHandler');

// @desc    Create a new blog post
// @route   POST /api/blogs
// @access  Private/Admin
exports.createBlog = asyncHandler(async (req, res) => {
  const { title, content, summary, tags, author } = req.body;

  // Handle featured image upload
  let featuredImageUrl = '';
  if (req.file) {
    featuredImageUrl = await uploadToS3(req.file, 'blogs');
  }

  // Create blog post
  const blog = await Blog.create({
    title,
    content,
    summary,
    featuredImage: featuredImageUrl,
    tags: tags ? JSON.parse(tags) : [],
    author: author || req.user.name,
    user: req.user._id
  });

  res.status(201).json({
    success: true,
    data: blog
  });
});

// @desc    Get all blog posts with filtering, sorting, and pagination
// @route   GET /api/blogs
// @access  Public
exports.getBlogs = async (req, res) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit', 'search'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Filter for published blogs only if not admin
    if (!req.user || req.user.role !== 'admin') {
      reqQuery.isPublished = true;
    }

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    let query = Blog.find(JSON.parse(queryStr));

    // Search functionality
    if (req.query.search) {
      query = query.find({
        $or: [
          { title: { $regex: req.query.search, $options: 'i' } },
          { content: { $regex: req.query.search, $options: 'i' } },
          { tags: { $in: [req.query.search] } }
        ]
      });
    }

    // Select fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Blog.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const blogs = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: blogs.length,
      pagination,
      total,
      data: blogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single blog post
// @route   GET /api/blogs/:id
// @access  Public
exports.getBlogById = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Check if blog is published or user is admin
    if (!blog.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Increment views count
    blog.views += 1;
    await blog.save();

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update blog post
// @route   PUT /api/blogs/:id
// @access  Private/Admin
exports.updateBlog = async (req, res) => {
  try {
    const { title, content, summary, tags, isPublished } = req.body;

    // Find blog
    let blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Build update object
    const updateFields = {};
    if (title) updateFields.title = title;
    if (content) updateFields.content = content;
    if (summary) updateFields.summary = summary;
    if (tags) updateFields.tags = JSON.parse(tags);
    if (isPublished !== undefined) updateFields.isPublished = isPublished;

    // Handle featured image upload if provided
    if (req.file) {
      // Delete old image from S3 if exists
      if (blog.featuredImage) {
        await deleteFromS3(blog.featuredImage);
      }
      
      // Upload new image to S3
      updateFields.featuredImage = await uploadToS3(req.file, 'blogs');
    }

    // Update blog
    blog = await Blog.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete blog post
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Delete featured image from S3 if exists
    if (blog.featuredImage) {
      await deleteFromS3(blog.featuredImage);
    }

    await blog.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add comment to blog post
// @route   POST /api/blogs/:id/comments
// @access  Public
exports.addComment = async (req, res) => {
  try {
    const { name, email, content } = req.body;

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Check if blog is published
    if (!blog.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Cannot comment on unpublished blog post'
      });
    }

    // Create comment object
    const comment = {
      name,
      email,
      content,
      user: req.user ? req.user._id : null
    };

    // Add comment to blog
    blog.comments.push(comment);
    await blog.save();

    res.status(201).json({
      success: true,
      message: 'Comment added successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get comments for a blog post
// @route   GET /api/blogs/:id/comments
// @access  Public
exports.getComments = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Check if blog is published or user is admin
    if (!blog.isPublished && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({
        success: false,
        message: 'Blog post not found'
      });
    }

    // Get approved comments only if not admin
    const comments = req.user && req.user.role === 'admin'
      ? blog.comments
      : blog.comments.filter(comment => comment.isApproved);

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};