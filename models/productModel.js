const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    productId: {
      type: String,
      // trim: true
    },
    productTitle: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true
    },
    barcode: {
      type: String,
      trim: true
    },
    itemType: {
      type: String,
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
    quantity: {
      type: Number,
      required: [true, 'Product quantity is required'],
      min: 0,
      default: 0
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    categoryString: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      trim: true
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true
    },
    brandName: {
      type: String,
      trim: true
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
    features: {
      type: String,
      trim: true
    },
    // Watch-specific attributes
    watchDetails: {
      targetGroup: {
        type: String,
        enum: ['Men', 'Women', 'Unisex', 'Kids'],
        required: false
      },
      watchType: {
        type: String,
        enum: ['Casual', 'Dress', 'Sport', 'Luxury', 'Smart', 'Other'],
        required: false
      },
      displayType: {
        type: String,
        enum: ['Analog', 'Digital', 'Analog-Digital'],
        required: false
      },
      dialColor: {
        type: String,
        required: false
      },
      caseColor: {
        type: String,
        required: false
      },
      bandColor: {
        type: String,
        required: false
      },
      bandMaterial: {
        type: String,
        required: false
      },
      caseMaterial: {
        type: String,
        required: false
      },
      caseShape: {
        type: String,
        enum: ['Round', 'Square', 'Rectangular', 'Tonneau', 'Oval', 'Other'],
        required: false
      },
      caseDiameter: {
        type: Number, // in mm
        required: false
      },
      bandClosure: {
        type: String,
        required: false
      },
      glass: {
        type: String,
        required: false
      },
      movement: {
        type: String,
        required: false
      },
      waterResistant: {
        type: String,
        required: false
      },
      warranty: {
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
    },
    // Image links from Excel sheet
    imageLinks: {
      image1: { type: String },
      image2: { type: String },
      image3: { type: String },
      image4: { type: String },
      image5: { type: String },
      image6: { type: String },
      image7: { type: String },
      image8: { type: String },
      image9: { type: String },
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
productSchema.index({ name: 'text', productTitle: 'text', description: 'text', tags: 'text', sku: 'text', barcode: 'text' });

module.exports = mongoose.model('Product', productSchema);