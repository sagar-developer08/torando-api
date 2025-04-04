const FAQ = require('../models/faqModel');

// @desc    Create a new FAQ
// @route   POST /api/faqs
// @access  Private/Admin
exports.createFAQ = async (req, res) => {
  try {
    const { question, answer, category, order } = req.body;

    // Create FAQ
    const faq = await FAQ.create({
      question,
      answer,
      category,
      order: order || 0
    });

    res.status(201).json({
      success: true,
      data: faq
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all FAQs
// @route   GET /api/faqs
// @access  Public
exports.getFAQs = async (req, res) => {
  try {
    // Filter for active FAQs only if not admin
    const filter = req.user && req.user.role === 'admin' ? {} : { isActive: true };
    
    // Get FAQs sorted by category and order
    const faqs = await FAQ.find(filter).sort({ category: 1, order: 1 });

    res.status(200).json({
      success: true,
      count: faqs.length,
      data: faqs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get FAQs by category
// @route   GET /api/faqs/category/:category
// @access  Public
exports.getFAQsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    
    // Filter for active FAQs only if not admin
    const filter = req.user && req.user.role === 'admin' 
      ? { category } 
      : { category, isActive: true };
    
    const faqs = await FAQ.find(filter).sort({ order: 1 });

    res.status(200).json({
      success: true,
      count: faqs.length,
      data: faqs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single FAQ
// @route   GET /api/faqs/:id
// @access  Public
exports.getFAQById = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    // Check if FAQ is active or user is admin
    if (!faq.isActive && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    res.status(200).json({
      success: true,
      data: faq
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update FAQ
// @route   PUT /api/faqs/:id
// @access  Private/Admin
exports.updateFAQ = async (req, res) => {
  try {
    const { question, answer, category, order, isActive } = req.body;

    // Find FAQ
    let faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    // Build update object
    const updateFields = {};
    if (question) updateFields.question = question;
    if (answer) updateFields.answer = answer;
    if (category) updateFields.category = category;
    if (order !== undefined) updateFields.order = order;
    if (isActive !== undefined) updateFields.isActive = isActive;

    // Update FAQ
    faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: faq
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete FAQ
// @route   DELETE /api/faqs/:id
// @access  Private/Admin
exports.deleteFAQ = async (req, res) => {
  try {
    const faq = await FAQ.findById(req.params.id);

    if (!faq) {
      return res.status(404).json({
        success: false,
        message: 'FAQ not found'
      });
    }

    await faq.remove();

    res.status(200).json({
      success: true,
      message: 'FAQ deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};