const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Product description is required']
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: 0
    },
    discountPrice: {
      type: Number,
      min: 0
    },
    images: [
      {
        type: String,
        required: true
      }
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true
    },
    stock: {
      type: Number,
      required: [true, 'Product stock is required'],
      min: 0,
      default: 0
    },
    ratings: {
      type: Number,
      default: 0
    },
    numReviews: {
      type: Number,
      default: 0
    },
    featured: {
      type: Boolean,
      default: false
    },
    // Add new fields for best seller and new arrivals
    isBestSeller: {
      type: Boolean,
      default: false
    },
    isNewArrival: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tags: [
      {
        type: String
      }
    ],
    specifications: {
      type: Object,
      default: {}
    },
    // Watch-specific attributes
    watchDetails: {
      movement: {
        type: String,
        enum: ['automatic', 'mechanical', 'quartz', 'solar', 'other'],
        required: false
      },
      caseSize: {
        type: Number, // in mm
        required: false
      },
      caseMaterial: {
        type: String,
        required: false
      },
      bandMaterial: {
        type: String,
        required: false
      },
      waterResistance: {
        type: String,
        required: false
      },
      dialColor: {
        type: String,
        required: false
      },
      gender: {
        type: String,
        enum: ['men', 'women', 'unisex'],
        default: 'unisex'
      },
      style: {
        type: String,
        enum: ['dress', 'casual', 'sport', 'luxury', 'vintage', 'smart'],
        required: false
      },
      warrantyPeriod: {
        type: Number, // in months
        default: 12
      }
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        name: {
          type: String,
          required: true
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5
        },
        comment: {
          type: String,
          required: true
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add text index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);