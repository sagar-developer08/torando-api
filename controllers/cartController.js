const Cart = require('../models/cartModel');
const Product = require('../models/productModel');
const { asyncHandler, AppError } = require('../utils/errorHandler');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
exports.getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id }).populate({
    path: 'items.product',
    select: 'name images price stock'
  });

  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [],
      totalPrice: 0
    });
  }

  res.status(200).json({
    success: true,
    data: cart
  });
});

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  // Validate product
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check if product is in stock
  if (product.stock < quantity) {
    throw new AppError('Product is out of stock or has insufficient quantity', 400);
  }

  // Find user's cart or create a new one
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = await Cart.create({
      user: req.user._id,
      items: [],
      totalPrice: 0
    });
  }

  // Check if product already exists in cart
  const existingItemIndex = cart.items.findIndex(
    item => item.product.toString() === productId
  );

  if (existingItemIndex > -1) {
    // Product exists, update quantity
    const newQuantity = cart.items[existingItemIndex].quantity + parseInt(quantity);
    
    // Check if new quantity exceeds stock
    if (newQuantity > product.stock) {
      throw new AppError(`Cannot add more than ${product.stock} units of this product`, 400);
    }
    
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // Product doesn't exist in cart, add new item
    cart.items.push({
      product: productId,
      name: product.name,
      image: product.images[0],
      price: product.discountPrice || product.price,
      quantity: parseInt(quantity)
    });
  }

  // Calculate total price
  cart.calculateTotalPrice();
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Item added to cart',
    data: cart
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/:itemId
// @access  Private
exports.updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { itemId } = req.params;

  // Validate quantity
  if (!quantity || quantity < 1) {
    throw new AppError('Quantity must be at least 1', 400);
  }

  // Find user's cart
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  // Find the item in the cart
  const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
  if (itemIndex === -1) {
    throw new AppError('Item not found in cart', 404);
  }

  // Get product to check stock
  const product = await Product.findById(cart.items[itemIndex].product);
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  // Check if quantity exceeds stock
  if (quantity > product.stock) {
    throw new AppError(`Cannot add more than ${product.stock} units of this product`, 400);
  }

  // Update quantity
  cart.items[itemIndex].quantity = quantity;
  
  // Recalculate total price
  cart.calculateTotalPrice();
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Cart updated',
    data: cart
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/:itemId
// @access  Private
exports.removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  // Find user's cart
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  // Remove the item from cart
  cart.items = cart.items.filter(item => item._id.toString() !== itemId);
  
  // Recalculate total price
  cart.calculateTotalPrice();
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Item removed from cart',
    data: cart
  });
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = asyncHandler(async (req, res) => {
  // Find user's cart
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    throw new AppError('Cart not found', 404);
  }

  // Clear cart items
  cart.items = [];
  cart.totalPrice = 0;
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Cart cleared',
    data: cart
  });
});

// @desc    Checkout cart
// @route   POST /api/cart/checkout
// @access  Private
exports.checkout = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;

  // Validate required fields
  if (!shippingAddress || !paymentMethod) {
    throw new AppError('Shipping address and payment method are required', 400);
  }

  // Find user's cart
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart || cart.items.length === 0) {
    throw new AppError('Cart is empty', 400);
  }

  // Verify all products are in stock
  for (const item of cart.items) {
    const product = await Product.findById(item.product);
    if (!product) {
      throw new AppError(`Product ${item.name} no longer exists`, 400);
    }
    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}`, 400);
    }
  }

  // Calculate prices
  const itemsPrice = cart.totalPrice;
  const taxPrice = itemsPrice * 0.15; // 15% tax
  const shippingPrice = itemsPrice > 100 ? 0 : 10; // Free shipping for orders over $100
  const totalPrice = itemsPrice + taxPrice + shippingPrice;

  // Create order object
  const orderData = {
    user: req.user._id,
    orderItems: cart.items.map(item => ({
      product: item.product,
      name: item.name,
      image: item.image,
      price: item.price,
      quantity: item.quantity
    })),
    shippingAddress,
    paymentMethod,
    itemsPrice,
    taxPrice,
    shippingPrice,
    totalPrice
  };

  // Return checkout data (to be processed by frontend)
  res.status(200).json({
    success: true,
    message: 'Checkout successful',
    data: {
      orderData,
      cart
    }
  });
});