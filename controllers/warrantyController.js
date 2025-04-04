const Warranty = require('../models/warrantyModel');
const Product = require('../models/productModel');
const Order = require('../models/orderModel');
const { uploadToS3, deleteFromS3 } = require('../config/s3');
const { asyncHandler, validateExists, AppError } = require('../utils/errorHandler');

// @desc    Register a warranty
// @route   POST /api/warranty
// @access  Private
exports.registerWarranty = asyncHandler(async (req, res) => {
  const { productId, orderId, serialNumber, purchaseDate } = req.body;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check if order exists and belongs to user
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError('Order not found', 404);
  }

  // Verify that the order belongs to the user
  if (order.user.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to register warranty for this order', 403);
  }

  // Check if warranty already exists for this serial number
  const existingWarranty = await Warranty.findOne({ serialNumber });
  if (existingWarranty) {
    throw new AppError('Warranty already registered for this serial number', 400);
  }

  // Calculate warranty expiry date (based on product's warranty period)
  const warrantyPeriod = product.watchDetails?.warrantyPeriod || 12; // Default to 12 months
  const expiryDate = new Date(purchaseDate);
  expiryDate.setMonth(expiryDate.getMonth() + warrantyPeriod);

  // Handle document uploads
  const documents = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const documentUrl = await uploadToS3(file, 'warranty-documents');
      documents.push(documentUrl);
    }
  }

  // Create warranty
  const warranty = await Warranty.create({
    user: req.user._id,
    product: productId,
    order: orderId,
    serialNumber,
    purchaseDate,
    expiryDate,
    documents,
    status: 'pending'
  });

  res.status(201).json({
    success: true,
    data: warranty
  });
});

// @desc    Get user warranties
// @route   GET /api/warranty
// @access  Private
exports.getUserWarranties = async (req, res) => {
  try {
    const warranties = await Warranty.find({ user: req.user._id })
      .populate('product', 'name images')
      .populate('order', 'orderNumber');

    res.status(200).json({
      success: true,
      count: warranties.length,
      data: warranties
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get warranty by ID
// @route   GET /api/warranty/:id
// @access  Private
exports.getWarrantyById = async (req, res) => {
  try {
    const warranty = await Warranty.findById(req.params.id)
      .populate('product')
      .populate('order')
      .populate('user', 'name email');

    if (!warranty) {
      return res.status(404).json({
        success: false,
        message: 'Warranty not found'
      });
    }

    // Check if warranty belongs to user or user is admin
    if (warranty.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this warranty'
      });
    }

    res.status(200).json({
      success: true,
      data: warranty
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update warranty status
// @route   PUT /api/warranty/:id
// @access  Private/Admin
exports.updateWarrantyStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;

    // Find warranty
    let warranty = await Warranty.findById(req.params.id);

    if (!warranty) {
      return res.status(404).json({
        success: false,
        message: 'Warranty not found'
      });
    }

    // Build update object
    const updateFields = {};
    if (status) updateFields.status = status;
    if (notes) updateFields.notes = notes;

    // Update warranty
    warranty = await Warranty.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: warranty
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all warranties
// @route   GET /api/warranty/all
// @access  Private/Admin
exports.getAllWarranties = async (req, res) => {
  try {
    const warranties = await Warranty.find()
      .populate('product', 'name')
      .populate('user', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: warranties.length,
      data: warranties
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete warranty
// @route   DELETE /api/warranty/:id
// @access  Private/Admin
exports.deleteWarranty = async (req, res) => {
  try {
    const warranty = await Warranty.findById(req.params.id);

    if (!warranty) {
      return res.status(404).json({
        success: false,
        message: 'Warranty not found'
      });
    }

    // Delete warranty documents from S3
    for (const documentUrl of warranty.documents) {
      await deleteFromS3(documentUrl);
    }

    await warranty.remove();

    res.status(200).json({
      success: true,
      message: 'Warranty deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};