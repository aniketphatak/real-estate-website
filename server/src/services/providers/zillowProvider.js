const axios = require('axios');

/**
 * Zillow/RapidAPI Property Data Provider
 * Uses RapidAPI's Zillow API for property data (PAID API)
 * Note: This is the paid RapidAPI version - see zillowRealProvider for free endpoints
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

  isConfigured() {
    return !!this.apiKey && this.apiKey.length > 10;
  }

  async getPropertyInfo(addressParams) {
    if (!this.isConfigured()) {
      console.log('Zillow RapidAPI not configured');
      return null;
    }

    try {
      const { address, city, state, zip } = addressParams;
      const fullAddress = `${address}, ${city}, ${state} ${zip}`;

      const response = await axios.get(`${this.baseUrl}/property`, {
        headers: this.headers,
        params: { address: fullAddress },
        timeout: 15000
      });

      return this.normalizePropertyData(response.data);
    } catch (error) {
      console.error('Zillow RapidAPI error:', error.message);
      return null;
    }
  }

  async getValuation(addressParams) {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const { address, city, state, zip } = addressParams;
      const fullAddress = `${address}, ${city}, ${state} ${zip}`;

      const response = await axios.get(`${this.baseUrl}/propertyExtendedSearch`, {
        headers: this.headers,
        params: { location: fullAddress },
        timeout: 15000
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
          lastUpdated: new Date().toISOString(),
          source: 'Zillow (RapidAPI)'
        };
      }

      return null;
    } catch (error) {
      console.error('Zillow valuation error:', error.message);
      return null;
    }
  }

  async getAddressSuggestions(query) {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const response = await axios.get(`${this.baseUrl}/propertyExtendedSearch`, {
        headers: this.headers,
        params: { location: query, status_type: 'ForSale' },
        timeout: 10000
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
      return [];
    }
  }

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
}

module.exports = new ZillowProvider();
