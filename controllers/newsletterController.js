const Newsletter = require('../models/newsletterModel');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email already exists
    let subscriber = await Newsletter.findOne({ email });

    if (subscriber) {
      // If already subscribed, return success
      if (subscriber.isSubscribed) {
        return res.status(200).json({
          success: true,
          message: 'You are already subscribed to our newsletter'
        });
      }
      
      // If previously unsubscribed, reactivate
      subscriber.isSubscribed = true;
      subscriber.unsubscribeToken = undefined;
      await subscriber.save();
      
      return res.status(200).json({
        success: true,
        message: 'You have been resubscribed to our newsletter'
      });
    }

    // Generate unsubscribe token
    const unsubscribeToken = crypto.randomBytes(20).toString('hex');

    // Create new subscriber
    subscriber = await Newsletter.create({
      email,
      unsubscribeToken
    });

    // Send welcome email
    const unsubscribeUrl = `${process.env.CLIENT_URL}/newsletter/unsubscribe/${unsubscribeToken}`;
    
    await sendEmail({
      to: email,
      subject: 'Welcome to Tornado Watches Newsletter',
      text: `Thank you for subscribing to our newsletter! You'll now receive updates about our latest products and offers. If you wish to unsubscribe, please click this link: ${unsubscribeUrl}`
    });

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to newsletter'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Unsubscribe from newsletter
// @route   GET /api/newsletter/unsubscribe/:token
// @access  Public
exports.unsubscribe = async (req, res) => {
  try {
    const { token } = req.params;

    // Find subscriber with the token
    const subscriber = await Newsletter.findOne({ unsubscribeToken: token });

    if (!subscriber) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Update subscriber status
    subscriber.isSubscribed = false;
    await subscriber.save();

    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all newsletter subscribers
// @route   GET /api/newsletter
// @access  Private/Admin
exports.getSubscribers = async (req, res) => {
  try {
    const subscribers = await Newsletter.find().sort('-createdAt');

    res.status(200).json({
      success: true,
      count: subscribers.length,
      data: subscribers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete a subscriber
// @route   DELETE /api/newsletter/:id
// @access  Private/Admin
exports.deleteSubscriber = async (req, res) => {
  try {
    const subscriber = await Newsletter.findById(req.params.id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Subscriber not found'
      });
    }

    await subscriber.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Subscriber deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Send newsletter to all subscribers
// @route   POST /api/newsletter/send
// @access  Private/Admin
exports.sendNewsletter = async (req, res) => {
  try {
    const { subject, content } = req.body;

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        message: 'Please provide subject and content'
      });
    }

    // Get all active subscribers
    const subscribers = await Newsletter.find({ isSubscribed: true });

    if (subscribers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active subscribers found'
      });
    }

    // Send email to all subscribers
    const emails = subscribers.map(subscriber => subscriber.email);
    
    // Send in batches of 50 to avoid email service limitations
    const batchSize = 50;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      await sendEmail({
        to: batch,
        subject,
        html: content
      });
    }

    res.status(200).json({
      success: true,
      message: `Newsletter sent to ${subscribers.length} subscribers`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};