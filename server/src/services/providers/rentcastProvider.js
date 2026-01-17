const axios = require('axios');

/**
 * RentCast API Provider
 * Free tier: 50 requests/month
 * Provides: property records, owner details, valuations, rent estimates
 * API Docs: https://developers.rentcast.io/
 */

class RentCastProvider {
  constructor() {
    this.apiKey = process.env.RENTCAST_API_KEY;
    this.baseUrl = 'https://api.rentcast.io/v1';
  }

  /**
   * Check if provider is configured
   */
  isConfigured() {
    return !!this.apiKey && this.apiKey.length > 10;
  }

  /**
   * Get headers for API requests
   */
  getHeaders() {
    return {
      'X-Api-Key': this.apiKey,
      'Accept': 'application/json'
    };
  }

  /**
   * Make API request with error handling
   */
  async makeRequest(endpoint, params = {}) {
    if (!this.isConfigured()) {
      console.log('RentCast API not configured');
      return null;
    }

    try {
      console.log(`RentCast API Request: ${endpoint}`, params);

      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: this.getHeaders(),
        params: params,
        timeout: 15000
      });

      console.log(`RentCast API Response status: ${response.status}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error(`RentCast API Error ${error.response.status}:`, error.response.data);
        if (error.response.status === 401) {
          console.error('RentCast: Invalid API key');
        }
        if (error.response.status === 429) {
          console.error('RentCast: Rate limit exceeded (50 requests/month on free tier)');
        }
      } else {
        console.error('RentCast API Error:', error.message);
      }
      return null;
    }
  }

  /**
   * Get property information by address
   */
  async getPropertyInfo(addressParams) {
    const { address, city, state, zip } = addressParams;

    const data = await this.makeRequest('/properties', {
      address: address,
      city: city,
      state: state,
      zipCode: zip
    });

    if (data && Array.isArray(data) && data.length > 0) {
      const prop = data[0];
      console.log('RentCast: Got property data');
      return this.normalizePropertyData(prop);
    }

    return null;
  }

  /**
   * Get property valuation
   */
  async getValuation(addressParams) {
    const { address, city, state, zip } = addressParams;

    // RentCast provides value estimates in the property endpoint
    const data = await this.makeRequest('/properties', {
      address: address,
      city: city,
      state: state,
      zipCode: zip
    });

    if (data && Array.isArray(data) && data.length > 0) {
      const prop = data[0];

      if (prop.price || prop.estimatedValue) {
        return {
          estimatedValue: prop.estimatedValue || prop.price,
          range: prop.priceRangeLow && prop.priceRangeHigh ? {
            low: prop.priceRangeLow,
            high: prop.priceRangeHigh
          } : null,
          confidence: 'medium',
          lastUpdated: new Date().toISOString(),
          source: 'RentCast',
          rentEstimate: prop.rentEstimate || null
        };
      }
    }

    // Try the dedicated value endpoint
    const valueData = await this.makeRequest('/avm/value', {
      address: address,
      city: city,
      state: state,
      zipCode: zip
    });

    if (valueData && valueData.price) {
      return {
        estimatedValue: valueData.price,
        range: valueData.priceRangeLow && valueData.priceRangeHigh ? {
          low: valueData.priceRangeLow,
          high: valueData.priceRangeHigh
        } : null,
        confidence: valueData.priceRangeHigh ? 'high' : 'medium',
        lastUpdated: new Date().toISOString(),
        source: 'RentCast AVM'
      };
    }

    return null;
  }

  /**
   * Get owner information
   */
  async getOwnerInfo(addressParams) {
    const { address, city, state, zip } = addressParams;

    const data = await this.makeRequest('/properties', {
      address: address,
      city: city,
      state: state,
      zipCode: zip
    });

    if (data && Array.isArray(data) && data.length > 0) {
      const prop = data[0];

      // RentCast includes owner info in property records
      if (prop.ownerName || prop.owner) {
        console.log('RentCast: Got owner data:', prop.ownerName || prop.owner);
        return {
          name: prop.ownerName || prop.owner,
          mailingAddress: prop.ownerMailingAddress ? {
            street: prop.ownerMailingAddress,
            city: prop.ownerMailingCity || city,
            state: prop.ownerMailingState || state,
            zip: prop.ownerMailingZip || zip
          } : {
            street: address,
            city: city,
            state: state,
            zip: zip
          },
          ownerType: prop.ownerType || 'Individual',
          ownerOccupied: prop.ownerOccupied !== false,
          purchaseDate: prop.lastSaleDate || null,
          purchasePrice: prop.lastSalePrice || null
        };
      }
    }

    return null;
  }

  /**
   * Get rent estimate
   */
  async getRentEstimate(addressParams) {
    const { address, city, state, zip } = addressParams;

    const data = await this.makeRequest('/avm/rent/long-term', {
      address: address,
      city: city,
      state: state,
      zipCode: zip
    });

    if (data && data.rent) {
      return {
        monthlyRent: data.rent,
        rentRange: data.rentRangeLow && data.rentRangeHigh ? {
          low: data.rentRangeLow,
          high: data.rentRangeHigh
        } : null,
        source: 'RentCast'
      };
    }

    return null;
  }

  /**
   * Normalize property data to standard format
   */
  normalizePropertyData(prop) {
    return {
      basic: {
        propertyType: prop.propertyType || 'Unknown',
        yearBuilt: prop.yearBuilt,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        squareFeet: prop.squareFootage,
        lotSize: prop.lotSize ? `${prop.lotSize.toLocaleString()} sqft` : null,
        stories: prop.stories,
        parking: prop.garageSpaces,
        pool: prop.features?.includes('Pool') || false,
        apn: prop.assessorParcelNumber,
        zoning: prop.zoning
      },
      location: {
        address: prop.formattedAddress || prop.addressLine1,
        city: prop.city,
        state: prop.state,
        zip: prop.zipCode,
        county: prop.county,
        latitude: prop.latitude,
        longitude: prop.longitude
      },
      valuation: {
        estimatedValue: prop.estimatedValue || prop.price,
        rentEstimate: prop.rentEstimate,
        source: 'RentCast'
      },
      taxInfo: {
        assessedValue: prop.assessedValue,
        taxAmount: prop.taxAmount,
        taxYear: prop.taxYear
      },
      ownerInfo: prop.ownerName ? {
        name: prop.ownerName,
        mailingAddress: prop.ownerMailingAddress,
        ownerOccupied: prop.ownerOccupied
      } : null,
      salesHistory: prop.lastSaleDate ? [{
        date: prop.lastSaleDate,
        price: prop.lastSalePrice,
        event: 'Sold'
      }] : []
    };
  }
}

module.exports = new RentCastProvider();
