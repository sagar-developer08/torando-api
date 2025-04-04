const Contact = require('../models/contactModel');
const sendEmail = require('../utils/sendEmail');
const { asyncHandler, sendSuccessResponse } = require('../utils/errorHandler');

// @desc    Create a new contact message
// @route   POST /api/contact
// @access  Public
exports.createContact = asyncHandler(async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  // Create contact
  const contact = await Contact.create({
    name,
    email,
    phone,
    subject,
    message
  });

  // Send notification email to admin
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: 'New Contact Form Submission',
    text: `
      Name: ${name}
      Email: ${email}
      Phone: ${phone || 'Not provided'}
      Subject: ${subject}
      Message: ${message}
    `
  });

  // Send confirmation email to user
  await sendEmail({
    to: email,
    subject: 'Thank you for contacting us',
    text: `
      Dear ${name},

      Thank you for contacting us. We have received your message and will get back to you as soon as possible.

      Best regards,
      The Tornado Team
    `
  });

  res.status(201).json({
    success: true,
    message: 'Your message has been sent successfully'
  });
});

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private/Admin
exports.getContacts = async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const total = await Contact.countDocuments();

    // Get contacts with pagination
    const contacts = await Contact.find()
      .sort('-createdAt')
      .skip(startIndex)
      .limit(limit);

    // Pagination result
    const pagination = {};

    if (startIndex + limit < total) {
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
      count: contacts.length,
      pagination,
      total,
      data: contacts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single contact message
// @route   GET /api/contact/:id
// @access  Private/Admin
exports.getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update contact status
// @route   PUT /api/contact/:id
// @access  Private/Admin
exports.updateContactStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Find contact
    let contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    // Update contact status
    contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete contact message
// @route   DELETE /api/contact/:id
// @access  Private/Admin
exports.deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact message not found'
      });
    }

    await contact.remove();

    res.status(200).json({
      success: true,
      message: 'Contact message deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};