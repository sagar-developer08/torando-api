/**
 * Custom error handler utility for consistent error management
 */

// Custom error class with status code
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Async handler to eliminate try-catch blocks
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Check if entity exists in database
const checkExists = async (Model, field, value, message) => {
  const exists = await Model.findOne({ [field]: value });
  if (exists) {
    throw new AppError(message || `${Model.modelName} with this ${field} already exists`, 400);
  }
  return false;
};

// Validate entity exists in database
const validateExists = async (Model, id, message) => {
  const entity = await Model.findById(id);
  if (!entity) {
    throw new AppError(message || `${Model.modelName} not found with id of ${id}`, 404);
  }
  return entity;
};

// Send standardized error response
const sendErrorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

// Send standardized success response
const sendSuccessResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message
  };

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  AppError,
  asyncHandler,
  checkExists,
  validateExists,
  sendErrorResponse,
  sendSuccessResponse
};