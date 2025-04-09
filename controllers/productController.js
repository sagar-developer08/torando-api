const mongoose = require('mongoose');
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



// Route: POST /api/products/search

// Simple function to check if products exist in the database
exports.checkProducts = async (req, res) => {
  try {
    // Count total products in the database
    const totalProducts = await Product.countDocuments();
    
    // Get a sample of products (first 5)
    const sampleProducts = await Product.find().limit(5).select('name sku productId');
    
    return res.status(200).json({
      success: true,
      totalProducts,
      sampleProducts
    });
  } catch (error) {
    console.error('Error checking products:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    console.log('Search query:', q);

    // First check if we have any products at all
    const totalProducts = await Product.countDocuments();
    console.log(`Total products in database: ${totalProducts}`);
    
    if (totalProducts === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        message: "No products found in the database.",
        data: []
      });
    }

    if (!q) {
      return res.status(400).json({ success: false, message: "Search query is required." });
    }

    // Use a simpler approach with text search instead of regex
    try {
      // First try a direct search on basic fields
      const basicSearchQuery = {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { sku: { $regex: q, $options: 'i' } },
          { productTitle: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { brandName: { $regex: q, $options: 'i' } },
          { categoryString: { $regex: q, $options: 'i' } }
        ]
      };

      console.log('Executing basic search query');
      const products = await Product.find(basicSearchQuery)
        .populate('brand category')
        .limit(50);

      if (products.length > 0) {
        console.log(`Found ${products.length} products for basic query: ${q}`);
        return res.status(200).json({
          success: true,
          count: products.length,
          data: products
        });
      }

      // If no results, try extended search including nested fields
      console.log('No results found with basic search, trying extended search');
      const extendedSearchQuery = {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { sku: { $regex: q, $options: 'i' } },
          { productTitle: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { brandName: { $regex: q, $options: 'i' } },
          { categoryString: { $regex: q, $options: 'i' } },
          { 'watchDetails.targetGroup': { $regex: q, $options: 'i' } },
          { 'watchDetails.watchType': { $regex: q, $options: 'i' } },
          { 'watchDetails.displayType': { $regex: q, $options: 'i' } },
          { 'watchDetails.dialColor': { $regex: q, $options: 'i' } },
          { 'watchDetails.caseColor': { $regex: q, $options: 'i' } },
          { 'watchDetails.bandColor': { $regex: q, $options: 'i' } },
          { 'watchDetails.bandMaterial': { $regex: q, $options: 'i' } },
          { 'watchDetails.caseMaterial': { $regex: q, $options: 'i' } },
          { 'watchDetails.caseShape': { $regex: q, $options: 'i' } },
          { 'watchDetails.bandClosure': { $regex: q, $options: 'i' } },
          { 'watchDetails.glass': { $regex: q, $options: 'i' } },
          { 'watchDetails.movement': { $regex: q, $options: 'i' } },
          { 'watchDetails.waterResistant': { $regex: q, $options: 'i' } },
          { 'watchDetails.warranty': { $regex: q, $options: 'i' } },
          { 'watchDetails.gender': { $regex: q, $options: 'i' } },
          { 'watchDetails.style': { $regex: q, $options: 'i' } }
        ]
      };

      // Try to find products with the extended search
      const extendedProducts = await Product.find(extendedSearchQuery)
        .populate('brand category')
        .limit(50);

      if (extendedProducts.length > 0) {
        console.log(`Found ${extendedProducts.length} products for extended query: ${q}`);
        return res.status(200).json({
          success: true,
          count: extendedProducts.length,
          data: extendedProducts
        });
      }

      // If still no results, try to search by brand and category
      console.log('No results found with extended search, trying brand/category search');
      const brands = await mongoose.model('Brand').find({ name: { $regex: q, $options: 'i' } }).select('_id');
      const categories = await mongoose.model('Category').find({ name: { $regex: q, $options: 'i' } }).select('_id');

      if (brands.length > 0 || categories.length > 0) {
        const refSearchQuery = { $or: [] };
        
        if (brands.length > 0) {
          const brandIds = brands.map(brand => brand._id);
          refSearchQuery.$or.push({ brand: { $in: brandIds } });
        }
        
        if (categories.length > 0) {
          const categoryIds = categories.map(category => category._id);
          refSearchQuery.$or.push({ category: { $in: categoryIds } });
        }

        const refProducts = await Product.find(refSearchQuery)
          .populate('brand category')
          .limit(50);

        if (refProducts.length > 0) {
          console.log(`Found ${refProducts.length} products via brand/category search for: ${q}`);
          return res.status(200).json({
            success: true,
            count: refProducts.length,
            data: refProducts
          });
        }
      }

      // If we get here, no products were found
      console.log('No products found for any search method with query:', q);
      return res.status(200).json({
        success: true,
        count: 0,
        message: "No products found matching your search criteria.",
        data: []
      });

    } catch (searchError) {
      console.error('Error during search operations:', searchError);
      // Fall back to text search as a last resort
      try {
        console.log('Attempting text search as fallback');
        const textSearchProducts = await Product.find(
          { $text: { $search: q } },
          { score: { $meta: "textScore" } }
        )
        .sort({ score: { $meta: "textScore" } })
        .populate('brand category')
        .limit(50);

        if (textSearchProducts.length > 0) {
          console.log(`Found ${textSearchProducts.length} products via text search for: ${q}`);
          return res.status(200).json({
            success: true,
            count: textSearchProducts.length,
            data: textSearchProducts
          });
        } else {
          return res.status(200).json({
            success: true,
            count: 0,
            message: "No products found matching your search criteria.",
            data: []
          });
        }
      } catch (textSearchError) {
        console.error('Text search error:', textSearchError);
        throw textSearchError;
      }
    }
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
