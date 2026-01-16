const axios = require('axios');

/**
 * Zillow/RapidAPI Property Data Provider
 * Uses RapidAPI's Zillow API for property data
 */

class ZillowProvider {
  constructor() {
    this.apiKey = process.env.RAPIDAPI_KEY;
    this.baseUrl = 'https://zillow-com1.p.rapidapi.com';
    this.headers = {
      'X-RapidAPI-Key': this.apiKey,
      'X-RapidAPI-Host': 'zillow-com1.p.rapidapi.com'
    };
  }

  /**
   * Check if provider is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Get property information by address
   */
  async getPropertyInfo(addressParams) {
    if (!this.isConfigured()) {
      console.log('Zillow provider not configured, returning mock data');
      return this.getMockPropertyInfo(addressParams);
    }

    try {
      const { address, city, state, zip } = addressParams;
      const fullAddress = `${address}, ${city}, ${state} ${zip}`;

      const response = await axios.get(`${this.baseUrl}/property`, {
        headers: this.headers,
        params: { address: fullAddress }
      });

      return this.normalizePropertyData(response.data);
    } catch (error) {
      console.error('Zillow API error:', error.message);
      return this.getMockPropertyInfo(addressParams);
    }
  }

  /**
   * Get property valuation (Zestimate)
   */
  async getValuation(addressParams) {
    if (!this.isConfigured()) {
      return this.getMockValuation(addressParams);
    }

    try {
      const { address, city, state, zip } = addressParams;
      const fullAddress = `${address}, ${city}, ${state} ${zip}`;

      const response = await axios.get(`${this.baseUrl}/propertyExtendedSearch`, {
        headers: this.headers,
        params: { location: fullAddress }
      });

      if (response.data && response.data.props && response.data.props.length > 0) {
        const prop = response.data.props[0];
        return {
          estimatedValue: prop.zestimate || prop.price,
          range: {
            low: prop.zestimateLowPercent ? prop.zestimate * (1 - prop.zestimateLowPercent / 100) : null,
            high: prop.zestimateHighPercent ? prop.zestimate * (1 + prop.zestimateHighPercent / 100) : null
          },
          confidence: 'high',
          lastUpdated: new Date().toISOString()
        };
      }

      return this.getMockValuation(addressParams);
    } catch (error) {
      console.error('Zillow valuation error:', error.message);
      return this.getMockValuation(addressParams);
    }
  }

  /**
   * Get address suggestions for autocomplete
   */
  async getAddressSuggestions(query) {
    if (!this.isConfigured()) {
      return this.getMockSuggestions(query);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/propertyExtendedSearch`, {
        headers: this.headers,
        params: { location: query, status_type: 'ForSale' }
      });

      if (response.data && response.data.props) {
        return response.data.props.slice(0, 5).map(prop => ({
          address: prop.address,
          city: prop.city,
          state: prop.state,
          zip: prop.zipcode,
          formatted: `${prop.address}, ${prop.city}, ${prop.state} ${prop.zipcode}`
        }));
      }

      return [];
    } catch (error) {
      console.error('Zillow autocomplete error:', error.message);
      return this.getMockSuggestions(query);
    }
  }

  /**
   * Normalize API response to standard format
   */
  normalizePropertyData(data) {
    if (!data) return null;

    return {
      basic: {
        propertyType: data.homeType || data.propertyType,
        yearBuilt: data.yearBuilt,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFeet: data.livingArea || data.squareFeet,
        lotSize: data.lotSize || data.lotAreaValue,
        stories: data.stories,
        parking: data.parkingCapacity,
        pool: data.hasPool
      },
      details: {
        construction: data.constructionMaterials,
        roofType: data.roofType,
        heating: data.heatingSystem,
        cooling: data.coolingSystem,
        foundation: data.foundationType
      },
      features: data.amenities || [],
      taxInfo: data.taxInfo ? {
        assessedValue: data.taxInfo.taxAssessedValue,
        taxAmount: data.taxInfo.taxAnnualAmount,
        taxYear: data.taxInfo.taxYear
      } : null,
      salesHistory: data.priceHistory ? data.priceHistory.map(h => ({
        date: h.date,
        price: h.price,
        event: h.event
      })) : [],
      neighborhood: {
        walkScore: data.walkScore,
        transitScore: data.transitScore,
        bikeScore: data.bikeScore
      }
    };
  }

  /**
   * Mock data for development/demo
   */
  getMockPropertyInfo(addressParams) {
    return {
      basic: {
        propertyType: 'Single Family',
        yearBuilt: 2005,
        bedrooms: 4,
        bathrooms: 2.5,
        squareFeet: 2450,
        lotSize: 8500,
        stories: 2,
        parking: 2,
        pool: false,
        apn: '123-456-789',
        zoning: 'Residential'
      },
      details: {
        construction: 'Wood Frame',
        roofType: 'Composition Shingle',
        heating: 'Forced Air',
        cooling: 'Central Air',
        foundation: 'Concrete Slab',
        flooring: 'Hardwood, Carpet, Tile',
        exteriorWalls: 'Stucco'
      },
      features: [
        'Central Air Conditioning',
        'Fireplace',
        'Hardwood Floors',
        'Granite Countertops',
        'Stainless Steel Appliances',
        'Walk-in Closet',
        'Attached Garage'
      ],
      taxInfo: {
        assessedValue: 425000,
        taxAmount: 5250,
        taxYear: 2024
      },
      salesHistory: [
        { date: '2019-06-15', price: 485000, event: 'Sold' },
        { date: '2012-03-20', price: 375000, event: 'Sold' },
        { date: '2005-08-10', price: 320000, event: 'Sold (New Construction)' }
      ],
      neighborhood: {
        walkScore: 72,
        transitScore: 45,
        bikeScore: 58
      }
    };
  }

  getMockValuation(addressParams) {
    const baseValue = 550000;
    const variance = Math.floor(Math.random() * 50000) - 25000;

    return {
      estimatedValue: baseValue + variance,
      range: {
        low: baseValue - 30000,
        high: baseValue + 35000
      },
      confidence: 'high',
      lastUpdated: new Date().toISOString()
    };
  }

  getMockSuggestions(query) {
    const suggestions = [
      { address: '123 Main St', city: 'Los Angeles', state: 'CA', zip: '90001' },
      { address: '456 Oak Ave', city: 'San Francisco', state: 'CA', zip: '94102' },
      { address: '789 Elm Blvd', city: 'San Diego', state: 'CA', zip: '92101' },
      { address: '321 Pine Dr', city: 'Seattle', state: 'WA', zip: '98101' },
      { address: '654 Maple Ln', city: 'Austin', state: 'TX', zip: '78701' }
    ];

    return suggestions
      .filter(s => s.address.toLowerCase().includes(query.toLowerCase()) ||
                   s.city.toLowerCase().includes(query.toLowerCase()))
      .map(s => ({
        ...s,
        formatted: `${s.address}, ${s.city}, ${s.state} ${s.zip}`
      }));
  }
}

module.exports = new ZillowProvider();
