const Testimonial = require('../models/testimonialModel');
const { uploadToS3, deleteFromS3 } = require('../config/s3');

// @desc    Create a new testimonial
// @route   POST /api/testimonials
// @access  Private/Admin
exports.createTestimonial = async (req, res) => {
  try {
    const { name, position, company, content, rating, isApproved, featured } = req.body;

    // Handle image upload
    let imageUrl = '';
    if (req.file) {
      imageUrl = await uploadToS3(req.file, 'testimonials');
    }

    // Create testimonial
    const testimonial = await Testimonial.create({
      name,
      position,
      company,
      image: imageUrl,
      content,
      rating: Number(rating),
      isApproved: isApproved !== undefined ? isApproved : false,
      featured: featured !== undefined ? featured : false
    });

    res.status(201).json({
      success: true,
      data: testimonial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all testimonials
// @route   GET /api/testimonials
// @access  Public
exports.getTestimonials = async (req, res) => {
  try {
    // Filter for approved and active testimonials only if not admin
    const filter = req.user && req.user.role === 'admin' 
      ? {} 
      : { isApproved: true, isActive: true };
    
    // Get testimonials sorted by creation date
    const testimonials = await Testimonial.find(filter).sort('-createdAt');

    res.status(200).json({
      success: true,
      count: testimonials.length,
      data: testimonials
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get featured testimonials
// @route   GET /api/testimonials/featured
// @access  Public
exports.getFeaturedTestimonials = async (req, res) => {
  try {
    // Get featured, approved, and active testimonials
    const testimonials = await Testimonial.find({
      featured: true,
      isApproved: true,
      isActive: true
    }).sort('-createdAt').limit(6);

    res.status(200).json({
      success: true,
      count: testimonials.length,
      data: testimonials
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single testimonial
// @route   GET /api/testimonials/:id
// @access  Private/Admin
exports.getTestimonialById = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    res.status(200).json({
      success: true,
      data: testimonial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update testimonial
// @route   PUT /api/testimonials/:id
// @access  Private/Admin
exports.updateTestimonial = async (req, res) => {
  try {
    const { name, position, company, content, rating, isApproved, featured, isActive } = req.body;

    // Find testimonial
    let testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (position) updateFields.position = position;
    if (company) updateFields.company = company;
    if (content) updateFields.content = content;
    if (rating) updateFields.rating = Number(rating);
    if (isApproved !== undefined) updateFields.isApproved = isApproved;
    if (featured !== undefined) updateFields.featured = featured;
    if (isActive !== undefined) updateFields.isActive = isActive;

    // Handle image upload if provided
    if (req.file) {
      // Delete old image from S3 if exists
      if (testimonial.image) {
        await deleteFromS3(testimonial.image);
      }
      
      // Upload new image to S3
      updateFields.image = await uploadToS3(req.file, 'testimonials');
    }

    // Update testimonial
    testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: testimonial
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete testimonial
// @route   DELETE /api/testimonials/:id
// @access  Private/Admin
exports.deleteTestimonial = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        success: false,
        message: 'Testimonial not found'
      });
    }

    // Delete image from S3 if exists
    if (testimonial.image) {
      await deleteFromS3(testimonial.image);
    }

    await testimonial.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Testimonial deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};