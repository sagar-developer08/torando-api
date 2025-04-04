const Brand = require('../models/brandModel');
const { uploadToS3, deleteFromS3 } = require('../config/s3');

// @desc    Create a new brand
// @route   POST /api/brands
// @access  Private/Admin
exports.createBrand = async (req, res) => {
  try {
    const { name, description, featured, country, foundedYear, website } = req.body;

    // Check if brand already exists
    const brandExists = await Brand.findOne({ name });
    if (brandExists) {
      return res.status(400).json({
        success: false,
        message: 'Brand already exists'
      });
    }

    // Handle logo upload
    let logoUrl = '';
    if (req.file) {
      logoUrl = await uploadToS3(req.file, 'brands');
    } else {
      return res.status(400).json({
        success: false,
        message: 'Brand logo is required'
      });
    }

    // Create brand
    const brand = await Brand.create({
      name,
      description,
      logo: logoUrl,
      featured: featured !== undefined ? featured : false,
      country,
      foundedYear,
      website
    });

    res.status(201).json({
      success: true,
      data: brand
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all brands
// @route   GET /api/brands
// @access  Public
exports.getBrands = async (req, res) => {
  try {
    // Filter for active brands only if not admin
    const filter = req.user && req.user.role === 'admin' ? {} : { isActive: true };
    
    const brands = await Brand.find(filter);

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get featured brands
// @route   GET /api/brands/featured
// @access  Public
exports.getFeaturedBrands = async (req, res) => {
  try {
    const brands = await Brand.find({ featured: true, isActive: true });

    res.status(200).json({
      success: true,
      count: brands.length,
      data: brands
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single brand
// @route   GET /api/brands/:id
// @access  Public
exports.getBrandById = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id).populate('products');

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check if brand is active or user is admin
    if (!brand.isActive && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    res.status(200).json({
      success: true,
      data: brand
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update brand
// @route   PUT /api/brands/:id
// @access  Private/Admin
exports.updateBrand = async (req, res) => {
  try {
    const { name, description, featured, isActive, country, foundedYear, website } = req.body;

    // Find brand
    let brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (description) updateFields.description = description;
    if (featured !== undefined) updateFields.featured = featured;
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (country) updateFields.country = country;
    if (foundedYear) updateFields.foundedYear = foundedYear;
    if (website) updateFields.website = website;

    // Handle logo upload if provided
    if (req.file) {
      const logoUrl = await uploadToS3(req.file, 'brands');
      updateFields.logo = logoUrl;

      // Delete old logo
      await deleteFromS3(brand.logo);
    }

    // Update brand
    brand = await Brand.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: brand
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete brand
// @route   DELETE /api/brands/:id
// @access  Private/Admin
exports.deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    // Check if brand has products
    const products = await mongoose.model('Product').find({ brand: req.params.id });
    if (products.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete brand with associated products'
      });
    }

    // Delete brand logo from S3
    await deleteFromS3(brand.logo);

    await brand.remove();

    res.status(200).json({
      success: true,
      message: 'Brand deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};