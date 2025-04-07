const User = require('../models/userModel');
const { asyncHandler, checkExists, sendSuccessResponse } = require('../utils/errorHandler');
const { uploadToS3, deleteFromS3 } = require('../config/s3');

// Helper function to send token response
const sendTokenResponse = (user, statusCode, res) => {
  // Generate token
  const token = user.getSignedJwtToken();

  // Set cookie options
  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res.status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Check if user already exists before attempting to create
  await checkExists(User, 'email', email, 'User with this email already exists');

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role
  });

  // Send token response
  sendTokenResponse(user, 201, res);
});

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an email and password'
    });
  }

  // Check for user
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Send token response
  sendTokenResponse(user, 200, res);
});

// @desc    Logout user / clear cookie
// @route   GET /api/users/logout
// @access  Private
exports.logoutUser = asyncHandler((req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
});

// @desc    Get current logged in user
// @route   GET /api/users/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, email, phoneNumber } = req.body;
  
  // Build update object
  const updateFields = {};
  if (name) updateFields.name = name;
  if (email) updateFields.email = email;
  if (phoneNumber) updateFields.phoneNumber = phoneNumber;

  // Handle profile image upload if provided
  if (req.file) {
    const imageUrl = await uploadToS3(req.file, 'profiles');
    updateFields.profileImage = imageUrl;

    // Delete old profile image if exists
    const user = await User.findById(req.user.id);
    if (user.profileImage) {
      await deleteFromS3(user.profileImage);
    }
  }

  // Update user
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    updateFields,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: updatedUser
  });
});

// @desc    Get all user addresses
// @route   GET /api/users/addresses
// @access  Private
exports.getUserAddresses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  res.status(200).json({
    success: true,
    count: user.addresses.length,
    data: user.addresses
  });
});

// @desc    Add a new address for user
// @route   POST /api/users/addresses
// @access  Private
exports.addUserAddress = asyncHandler(async (req, res) => {
  const { name, street, city, state, zipCode, country, phoneNumber, isDefault } = req.body;
  
  const user = await User.findById(req.user.id);
  
  // Check if this is the first address or if isDefault is true
  const shouldBeDefault = isDefault || user.addresses.length === 0;
  
  // If this address should be default, unset any existing default address
  if (shouldBeDefault && user.addresses.length > 0) {
    user.addresses.forEach(address => {
      address.isDefault = false;
    });
  }
  
  const newAddress = {
    name,
    street,
    city,
    state,
    zipCode,
    country,
    phoneNumber,
    isDefault: shouldBeDefault
  };
  
  user.addresses.push(newAddress);
  await user.save();
  
  res.status(201).json({
    success: true,
    data: newAddress,
    message: 'Address added successfully'
  });
});

// @desc    Update a user address
// @route   PUT /api/users/addresses/:addressId
// @access  Private
exports.updateUserAddress = asyncHandler(async (req, res) => {
  const { name, street, city, state, zipCode, country, phoneNumber, isDefault } = req.body;
  
  const user = await User.findById(req.user.id);
  
  // Find the address by ID
  const address = user.addresses.id(req.params.addressId);
  
  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }
  
  // If setting this address as default, unset any existing default
  if (isDefault && !address.isDefault) {
    user.addresses.forEach(addr => {
      if (addr.isDefault) {
        addr.isDefault = false;
      }
    });
  }
  
  // Update address fields
  if (name) address.name = name;
  if (street) address.street = street;
  if (city) address.city = city;
  if (state) address.state = state;
  if (zipCode) address.zipCode = zipCode;
  if (country) address.country = country;
  if (phoneNumber) address.phoneNumber = phoneNumber;
  if (isDefault !== undefined) address.isDefault = isDefault;
  
  await user.save();
  
  res.status(200).json({
    success: true,
    data: address,
    message: 'Address updated successfully'
  });
});

// @desc    Delete a user address
// @route   DELETE /api/users/addresses/:addressId
// @access  Private
exports.deleteUserAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  // Find and remove the address
  const address = user.addresses.id(req.params.addressId);
  
  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }
  
  const wasDefault = address.isDefault;
  
  // Remove the address
  address.remove();
  
  // If it was the default address and there are other addresses, make the first one default
  if (wasDefault && user.addresses.length > 0) {
    user.addresses[0].isDefault = true;
  }
  
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'Address deleted successfully'
  });
});

// @desc    Set an address as default
// @route   PUT /api/users/addresses/:addressId/default
// @access  Private
exports.setDefaultAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  // Find the specified address
  const address = user.addresses.id(req.params.addressId);
  
  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }
  
  // Remove default flag from all addresses
  user.addresses.forEach(addr => {
    addr.isDefault = false;
  });
  
  // Set this address as default
  address.isDefault = true;
  
  await user.save();
  
  res.status(200).json({
    success: true,
    data: address,
    message: 'Default address updated successfully'
  });
});

// @desc    Get user's order history
// @route   GET /api/users/orders
// @access  Private
exports.getUserOrders = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate({
    path: 'orderHistory',
    options: { sort: { createdAt: -1 } }
  });
  
  res.status(200).json({
    success: true,
    count: user.orderHistory.length,
    data: user.orderHistory
  });
});

// @desc    Get user's wishlist
// @route   GET /api/users/wishlist
// @access  Private
exports.getUserWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('wishlist');
  
  res.status(200).json({
    success: true,
    count: user.wishlist.length,
    data: user.wishlist
  });
});

// @desc    Add product to wishlist
// @route   POST /api/users/wishlist/:productId
// @access  Private
exports.addToWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  // Check if product is already in the wishlist
  if (user.wishlist.includes(req.params.productId)) {
    return res.status(400).json({
      success: false,
      message: 'Product already in wishlist'
    });
  }
  
  // Add product to wishlist
  user.wishlist.push(req.params.productId);
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'Product added to wishlist'
  });
});

// @desc    Remove product from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
exports.removeFromWishlist = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  // Check if product is in the wishlist
  if (!user.wishlist.includes(req.params.productId)) {
    return res.status(400).json({
      success: false,
      message: 'Product not in wishlist'
    });
  }
  
  // Remove product from wishlist
  user.wishlist = user.wishlist.filter(
    product => product.toString() !== req.params.productId
  );
  
  await user.save();
  
  res.status(200).json({
    success: true,
    message: 'Product removed from wishlist'
  });
});

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    
    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (role) updateFields.role = role;
    if (isActive !== undefined) updateFields.isActive = isActive;

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete profile image if exists
    if (user.profileImage) {
      await deleteFromS3(user.profileImage);
    }

    await user.remove();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};