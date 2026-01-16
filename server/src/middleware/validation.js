const { AppError } = require('./errorHandler');

/**
 * Validate address parameters in request
 */
const validateAddress = (req, res, next) => {
  const { address, city, state, zip } = req.query;

  const errors = [];

  if (!address || address.trim().length < 3) {
    errors.push('Street address is required and must be at least 3 characters');
  }

  if (!city || city.trim().length < 2) {
    errors.push('City is required and must be at least 2 characters');
  }

  if (!state || !isValidState(state)) {
    errors.push('Valid US state code is required (e.g., CA, NY, TX)');
  }

  if (!zip || !isValidZipCode(zip)) {
    errors.push('Valid 5-digit ZIP code is required');
  }

  if (errors.length > 0) {
    return next(new AppError(`Validation failed: ${errors.join('; ')}`, 400));
  }

  // Normalize the address data
  req.query.address = address.trim();
  req.query.city = city.trim();
  req.query.state = state.trim().toUpperCase();
  req.query.zip = zip.trim();

  next();
};

/**
 * Check if state code is valid
 */
const isValidState = (state) => {
  const validStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  ];

  return validStates.includes(state.trim().toUpperCase());
};

/**
 * Check if ZIP code is valid
 */
const isValidZipCode = (zip) => {
  const zipRegex = /^\d{5}(-\d{4})?$/;
  return zipRegex.test(zip.trim());
};

/**
 * Validate property ID
 */
const validatePropertyId = (req, res, next) => {
  const { propertyId } = req.params;

  if (!propertyId || propertyId.trim().length === 0) {
    return next(new AppError('Property ID is required', 400));
  }

  next();
};

/**
 * Sanitize user input to prevent XSS
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
};

/**
 * Rate limit by address to prevent abuse
 */
const addressRateLimits = new Map();

const rateLimitByAddress = (windowMs = 60000, maxRequests = 10) => {
  return (req, res, next) => {
    const { address, city, state, zip } = req.query;

    if (!address) return next();

    const key = `${address}-${city}-${state}-${zip}`.toLowerCase().replace(/\s+/g, '');
    const now = Date.now();

    if (!addressRateLimits.has(key)) {
      addressRateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const limit = addressRateLimits.get(key);

    if (now > limit.resetTime) {
      addressRateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (limit.count >= maxRequests) {
      return next(new AppError('Too many requests for this address. Please try again later.', 429));
    }

    limit.count++;
    next();
  };
};

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of addressRateLimits.entries()) {
    if (now > value.resetTime) {
      addressRateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  validateAddress,
  validatePropertyId,
  sanitizeInput,
  rateLimitByAddress,
  isValidState,
  isValidZipCode
};
