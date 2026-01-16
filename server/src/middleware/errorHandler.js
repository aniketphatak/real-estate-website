/**
 * Global error handler middleware
 */

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method
  });

  // Different error responses for development vs production
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  }

  // Production error response
  if (err.isOperational) {
    // Operational, trusted error: send message to client
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // Programming or other unknown error: don't leak error details
  console.error('ERROR:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong. Please try again later.'
  });
};

// Handle specific error types
const handleAxiosError = (err) => {
  if (err.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    return new AppError(
      `External API error: ${err.response.data?.message || err.message}`,
      err.response.status
    );
  } else if (err.request) {
    // The request was made but no response was received
    return new AppError('External service unavailable. Please try again later.', 503);
  }
  return new AppError('An unexpected error occurred.', 500);
};

const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsError = (err) => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)?.[0];
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, 400);
};

module.exports = {
  AppError,
  errorHandler,
  handleAxiosError,
  handleValidationError,
  handleDuplicateFieldsError
};
