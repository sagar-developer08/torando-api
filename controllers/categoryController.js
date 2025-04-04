const Category = require('../models/categoryModel');
const { uploadToS3, deleteFromS3 } = require('../config/s3');
const { asyncHandler, AppError, checkExists } = require('../utils/errorHandler');

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description, parent } = req.body;

  // Check if category already exists
  await checkExists(Category, 'name', name, 'Category already exists');

  // Handle image upload
  let imageUrl = '';
  if (req.file) {
    imageUrl = await uploadToS3(req.file, 'categories');
  }

  // Create category
  const category = await Category.create({
    name,
    description,
    image: imageUrl,
    parent: parent || null
  });

  res.status(201).json({
    success: true,
    data: category
  });
});

// @desc    Get all top-level categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = asyncHandler(async (req, res) => {
  // Get only top-level categories (parent is null)
  // Filter for active categories only if not admin
  const filter = req.user && req.user.role === 'admin' 
    ? { parent: null } 
    : { parent: null, isActive: true };
  
  const categories = await Category.find(filter).populate('subcategories');

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories
  });
});

// @desc    Get all categories (flat structure)
// @route   GET /api/categories/all
// @access  Public
exports.getAllCategories = asyncHandler(async (req, res) => {
  // Filter for active categories only if not admin
  const filter = req.user && req.user.role === 'admin' 
    ? {} 
    : { isActive: true };
  
  const categories = await Category.find(filter);

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories
  });
});

// @desc    Get single category with subcategories
// @route   GET /api/categories/:id
// @access  Public
exports.getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id).populate('subcategories');

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Check if category is active or user is admin
  if (!category.isActive && (!req.user || req.user.role !== 'admin')) {
    throw new AppError('Category not found', 404);
  }

  res.status(200).json({
    success: true,
    data: category
  });
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = asyncHandler(async (req, res) => {
  const { name, description, parent, isActive } = req.body;

  // Find category
  let category = await Category.findById(req.params.id);

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Build update object
  const updateFields = {};
  if (name) updateFields.name = name;
  if (description) updateFields.description = description;
  if (parent !== undefined) updateFields.parent = parent || null;
  if (isActive !== undefined) updateFields.isActive = isActive;

  // Handle image upload if provided
  if (req.file) {
    // Delete old image from S3 if exists
    if (category.image) {
      await deleteFromS3(category.image);
    }
    
    // Upload new image to S3
    updateFields.image = await uploadToS3(req.file, 'categories');
  }

  // Update category
  category = await Category.findByIdAndUpdate(
    req.params.id,
    updateFields,
    { new: true, runValidators: true }
  ).populate('subcategories');

  res.status(200).json({
    success: true,
    data: category
  });
});

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  // Check if category has subcategories
  const subcategories = await Category.find({ parent: req.params.id });
  if (subcategories.length > 0) {
    throw new AppError('Cannot delete category with subcategories. Please delete or reassign subcategories first.', 400);
  }

  // Delete image from S3 if exists
  if (category.image) {
    await deleteFromS3(category.image);
  }

  await category.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully'
  });
});