const express = require('express');
const router = express.Router();
const propertyService = require('../services/propertyService');
const { validateAddress } = require('../middleware/validation');

// Search for property by address
router.get('/search', validateAddress, async (req, res, next) => {
  try {
    const { address, city, state, zip } = req.query;
    const fullAddress = `${address}, ${city}, ${state} ${zip}`;

    console.log(`Searching for property: ${fullAddress}`);

    const propertyData = await propertyService.getPropertyData({
      address,
      city,
      state,
      zip
    });

    res.json(propertyData);
  } catch (error) {
    next(error);
  }
});

// Get property details by ID (from specific provider)
router.get('/details/:propertyId', async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { provider } = req.query;

    const details = await propertyService.getPropertyDetails(propertyId, provider);
    res.json(details);
  } catch (error) {
    next(error);
  }
});

// Get property valuation
router.get('/valuation', validateAddress, async (req, res, next) => {
  try {
    const { address, city, state, zip } = req.query;

    const valuation = await propertyService.getPropertyValuation({
      address,
      city,
      state,
      zip
    });

    res.json(valuation);
  } catch (error) {
    next(error);
  }
});

// Get mortgage/lien information
router.get('/mortgage', validateAddress, async (req, res, next) => {
  try {
    const { address, city, state, zip } = req.query;

    const mortgageData = await propertyService.getMortgageData({
      address,
      city,
      state,
      zip
    });

    res.json(mortgageData);
  } catch (error) {
    next(error);
  }
});

// Get owner information
router.get('/owner', validateAddress, async (req, res, next) => {
  try {
    const { address, city, state, zip } = req.query;

    const ownerData = await propertyService.getOwnerData({
      address,
      city,
      state,
      zip
    });

    res.json(ownerData);
  } catch (error) {
    next(error);
  }
});

// Get comprehensive property report
router.get('/report', validateAddress, async (req, res, next) => {
  try {
    const { address, city, state, zip } = req.query;

    const report = await propertyService.getComprehensiveReport({
      address,
      city,
      state,
      zip
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
});

// Address autocomplete
router.get('/autocomplete', async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 3) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await propertyService.getAddressSuggestions(query);
    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
