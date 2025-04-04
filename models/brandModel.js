const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Brand name is required'],
      trim: true,
      unique: true
    },
    description: {
      type: String,
      required: [true, 'Brand description is required']
    },
    logo: {
      type: String,
      required: [true, 'Brand logo is required']
    },
    featured: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    country: {
      type: String,
      required: false
    },
    foundedYear: {
      type: Number,
      required: false
    },
    website: {
      type: String,
      required: false
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for products
brandSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'brand',
  justOne: false
});

module.exports = mongoose.model('Brand', brandSchema);