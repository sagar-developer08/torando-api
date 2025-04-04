const mongoose = require('mongoose');

const warrantySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    serialNumber: {
      type: String,
      required: [true, 'Serial number is required'],
      unique: true
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required']
    },
    expiryDate: {
      type: Date,
      required: [true, 'Warranty expiry date is required']
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'void'],
      default: 'active'
    },
    documents: [{
      type: String
    }],
    notes: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Warranty', warrantySchema);