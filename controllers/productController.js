const Product = require('../models/productModel');
const { uploadToS3, deleteFromS3 } = require('../config/s3');

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      price, 
      discountPrice, 
      quantity,
      category, 
      categoryString,
      country,
      stock, 
      featured, 
      tags, 
      brand,
      brandName,
      specifications,
      features,
      isBestSeller,
      isNewArrival,
      watchDetails
    } = req.body;

    // Handle image uploads
    let images = [];
    if (req.files && req.files.length > 0) {
      // Upload each image to S3
      for (const file of req.files) {
        const imageUrl = await uploadToS3(file, 'products');
        images.push(imageUrl);
      }
    }

    // Parse image links from request if provided
    let imageLinks = {};
    if (req.body.imageLinks) {
      try {
        imageLinks = JSON.parse(req.body.imageLinks);
      } catch (error) {
        imageLinks = req.body.imageLinks; // If already an object
      }
    }

    // Create product
    const product = await Product.create({
      name,
      productTitle: productTitle || name,
      sku,
      barcode,
      itemType,
      description,
      price,
      discountPrice,
      quantity: quantity || stock,
      category,
      categoryString,
      country,
      images,
      stock,
      featured: featured || false,
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
      brand,
      brandName,
      specifications: specifications ? (typeof specifications === 'string' ? JSON.parse(specifications) : specifications) : {},
      features,
      isBestSeller: isBestSeller || false,
      isNewArrival: isNewArrival || false,
      watchDetails: watchDetails ? (typeof watchDetails === 'string' ? JSON.parse(watchDetails) : watchDetails) : {},
      imageLinks
    });

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all products with filtering, sorting, and pagination
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude
    const removeFields = ['select', 'sort', 'page', 'limit', 'search'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    let query = Product.find(JSON.parse(queryStr)).populate('category').populate('brand').populate('watchDetails').populate('reviews');

    // Search functionality
    if (req.query.search) {
      query = query.find({ $text: { $search: req.query.search } });
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
    const total = await Product.countDocuments(JSON.parse(queryStr));

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const products = await query;

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
      count: products.length,
      pagination,
      total,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
  try {
    const { 
      name, 
      productTitle,
      sku,
      barcode,
      itemType,
      description, 
      price, 
      discountPrice, 
      quantity,
      category, 
      categoryString,
      country,
      stock, 
      featured, 
      tags, 
      brand,
      brandName,
      specifications,
      features,
      isBestSeller,
      isNewArrival,
      watchDetails
    } = req.body;

    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Handle image uploads
    let images = [...product.images]; // Start with existing images
    if (req.files && req.files.length > 0) {
      // Upload each new image to S3
      for (const file of req.files) {
        const imageUrl = await uploadToS3(file, 'products');
        images.push(imageUrl);
      }
    }

    // Handle image deletions if specified
    if (req.body.deleteImages && req.body.deleteImages.length > 0) {
      let deleteImages = req.body.deleteImages;
      if (typeof deleteImages === 'string') {
        deleteImages = JSON.parse(deleteImages);
      }
      
      for (const imageUrl of deleteImages) {
        // Delete from S3
        await deleteFromS3(imageUrl);
        // Remove from images array
        images = images.filter(img => img !== imageUrl);
      }
    }

    // Parse image links from request if provided
    let imageLinks = { ...product.imageLinks } || {};
    if (req.body.imageLinks) {
      try {
        const newImageLinks = typeof req.body.imageLinks === 'string' 
          ? JSON.parse(req.body.imageLinks) 
          : req.body.imageLinks;
        imageLinks = { ...imageLinks, ...newImageLinks };
      } catch (error) {
        console.error('Error parsing imageLinks', error);
      }
    }

    // Update product
    product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name: name || product.name,
        productTitle: productTitle || product.productTitle || name,
        sku: sku || product.sku,
        barcode: barcode || product.barcode,
        itemType: itemType || product.itemType,
        description: description || product.description,
        price: price || product.price,
        discountPrice: discountPrice !== undefined ? discountPrice : product.discountPrice,
        quantity: quantity || product.quantity || stock,
        category: category || product.category,
        categoryString: categoryString || product.categoryString,
        country: country || product.country,
        brand: brand || product.brand,
        brandName: brandName || product.brandName,
        images,
        stock: stock || product.stock,
        featured: featured !== undefined ? featured : product.featured,
        tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : product.tags,
        specifications: specifications ? (typeof specifications === 'string' ? JSON.parse(specifications) : specifications) : product.specifications,
        features: features || product.features,
        isBestSeller: isBestSeller !== undefined ? isBestSeller : product.isBestSeller,
        isNewArrival: isNewArrival !== undefined ? isNewArrival : product.isNewArrival,
        watchDetails: watchDetails ? 
          (typeof watchDetails === 'string' ? 
            { ...product.watchDetails, ...JSON.parse(watchDetails) } : 
            { ...product.watchDetails, ...watchDetails }) : 
          product.watchDetails,
        imageLinks
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete product images from S3
    for (const imageUrl of product.images) {
      await deleteFromS3(imageUrl);
    }

    await product.remove();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
exports.createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check if user already reviewed
    const alreadyReviewed = product.reviews.find(
      r => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: 'Product already reviewed'
      });
    }

    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.ratings = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

    await product.save();

    res.status(201).json({
      success: true,
      message: 'Review added'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get top rated products
// @route   GET /api/products/top
// @access  Public
exports.getTopProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ ratings: -1 }).limit(5);

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ featured: true }).limit(8);

    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get best seller products
// @route   GET /api/products/best-sellers
// @access  Public
exports.getBestSellerProducts = async (req, res) => {
  try {
    // Get limit from query or default to 8
    const limit = parseInt(req.query.limit) || 8;
    
    // Find active best seller products
    const products = await Product.find({ 
      isActive: true, 
      isBestSeller: true 
    })
    .populate('category', 'name')
    .populate('brand', 'name')
    .limit(limit);

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get new arrival products
// @route   GET /api/products/new-arrivals
// @access  Public
exports.getNewArrivalProducts = async (req, res) => {
  try {
    // Get limit from query or default to 8
    const limit = parseInt(req.query.limit) || 8;
    
    // Find active new arrival products
    // Option 1: Using the isNewArrival flag
    const products = await Product.find({ 
      isActive: true, 
      isNewArrival: true 
    })
    .populate('category', 'name')
    .populate('brand', 'name')
    .limit(limit);

    // Option 2: Alternative approach - get products created in the last 30 days
    // Uncomment this if you prefer to use creation date instead of a flag
    /*
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const products = await Product.find({
      isActive: true,
      createdAt: { $gte: thirtyDaysAgo }
    })
    .populate('category', 'name')
    .populate('brand', 'name')
    .sort('-createdAt')
    .limit(limit);
    */

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};