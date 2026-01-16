const axios = require('axios');

/**
 * Realtor.com Data Provider
 * Uses Realtor.com's public API endpoints
 */

class RealtorProvider {
  constructor() {
    this.baseUrl = 'https://www.realtor.com/api';
    this.rapidApiKey = process.env.RAPIDAPI_REALTOR_KEY || process.env.RAPIDAPI_KEY;
    this.rapidApiHost = 'realtor.p.rapidapi.com';

    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.realtor.com/'
    };
  }

  /**
   * Check if RapidAPI is configured
   */
  isRapidApiConfigured() {
    return !!this.rapidApiKey;
  }

  /**
   * Search for property using RapidAPI (if configured)
   */
  async searchWithRapidApi(addressParams) {
    if (!this.isRapidApiConfigured()) {
      return null;
    }

    try {
      const { address, city, state, zip } = addressParams;

      const response = await axios.get(`https://${this.rapidApiHost}/properties/v3/detail`, {
        params: {
          property_id: `${address}, ${city}, ${state} ${zip}`.replace(/\s+/g, '-').toLowerCase()
        },
        headers: {
          'X-RapidAPI-Key': this.rapidApiKey,
          'X-RapidAPI-Host': this.rapidApiHost
        },
        timeout: 15000
      });

      if (response.data && response.data.data) {
        return this.normalizeRapidApiData(response.data.data);
      }

      return null;
    } catch (error) {
      console.error('Realtor RapidAPI error:', error.message);
      return null;
    }
  }

  /**
   * Search property using public endpoints
   */
  async getPropertyInfo(addressParams) {
    try {
      const { address, city, state, zip } = addressParams;

      // Try RapidAPI first if configured
      if (this.isRapidApiConfigured()) {
        const rapidResult = await this.searchWithRapidApi(addressParams);
        if (rapidResult) return rapidResult;
      }

      // Try public search endpoint
      const searchQuery = `${address}, ${city}, ${state} ${zip}`;

      const response = await axios.get(`${this.baseUrl}/v1/rdc/locations/autocomplete`, {
        params: {
          input: searchQuery,
          limit: 1
        },
        headers: this.headers,
        timeout: 10000
      });

      if (response.data && response.data.autocomplete) {
        const results = response.data.autocomplete;
        if (results.length > 0) {
          const property = results[0];
          return this.normalizeAutocompleteResult(property);
        }
      }

      return null;
    } catch (error) {
      console.error('Realtor property search error:', error.message);
      return null;
    }
  }

  /**
   * Get address suggestions
   */
  async getAddressSuggestions(query) {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/rdc/locations/autocomplete`, {
        params: {
          input: query,
          limit: 5,
          area_types: 'address'
        },
        headers: this.headers,
        timeout: 8000
      });

      if (response.data && response.data.autocomplete) {
        return response.data.autocomplete
          .filter(r => r.area_type === 'address')
          .map(r => ({
            address: r.line,
            city: r.city,
            state: r.state_code,
            zip: r.postal_code,
            formatted: `${r.line}, ${r.city}, ${r.state_code} ${r.postal_code}`,
            mprId: r.mpr_id
          }));
      }

      return [];
    } catch (error) {
      console.error('Realtor autocomplete error:', error.message);
      return [];
    }
  }

  /**
   * Get property valuation
   */
  async getValuation(addressParams) {
    try {
      const propertyData = await this.getPropertyInfo(addressParams);

      if (propertyData && propertyData.valuation) {
        return propertyData.valuation;
      }

      return null;
    } catch (error) {
      console.error('Realtor valuation error:', error.message);
      return null;
    }
  }

  /**
   * Normalize RapidAPI response
   */
  normalizeRapidApiData(data) {
    if (!data || !data.home) {
      return null;
    }

    const home = data.home;

    return {
      basic: {
        propertyType: home.description?.type,
        yearBuilt: home.description?.year_built,
        bedrooms: home.description?.beds,
        bathrooms: home.description?.baths,
        squareFeet: home.description?.sqft,
        lotSize: home.description?.lot_sqft,
        stories: home.description?.stories,
        garage: home.description?.garage
      },
      location: {
        address: home.location?.address?.line,
        city: home.location?.address?.city,
        state: home.location?.address?.state_code,
        zip: home.location?.address?.postal_code,
        latitude: home.location?.address?.coordinate?.lat,
        longitude: home.location?.address?.coordinate?.lon
      },
      valuation: {
        estimatedValue: home.estimate?.estimate,
        range: {
          low: home.estimate?.estimate_low,
          high: home.estimate?.estimate_high
        },
        confidence: 'high',
        lastUpdated: new Date().toISOString(),
        source: 'Realtor.com Estimate'
      },
      taxInfo: {
        assessedValue: home.public_records?.[0]?.assessed_value,
        taxAmount: home.public_records?.[0]?.year_taxes
      },
      salesHistory: home.property_history?.map(h => ({
        date: h.date,
        price: h.price,
        event: h.event_name
      })) || []
    };
  }

  /**
   * Normalize autocomplete result
   */
  normalizeAutocompleteResult(property) {
    return {
      basic: {
        propertyType: 'Unknown'
      },
      location: {
        address: property.line,
        city: property.city,
        state: property.state_code,
        zip: property.postal_code,
        latitude: property.lat,
        longitude: property.lon
      },
      valuation: null,
      mprId: property.mpr_id
    };
  }
}

module.exports = new RealtorProvider();
