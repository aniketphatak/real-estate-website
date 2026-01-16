const axios = require('axios');

/**
 * Zillow Real Data Provider
 * Uses Zillow's public endpoints to get real property data
 */

class ZillowRealProvider {
  constructor() {
    this.baseUrl = 'https://www.zillow.com';
    this.apiUrl = 'https://www.zillowstatic.com/autocomplete/v3/suggestions';
    this.searchUrl = 'https://www.zillow.com/search/GetSearchPageState.htm';

    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.zillow.com/',
    };
  }

  /**
   * Get address suggestions using Zillow's autocomplete
   */
  async getAddressSuggestions(query) {
    try {
      const response = await axios.get(this.apiUrl, {
        params: {
          q: query,
          resultTypes: 'address',
          resultCount: 5
        },
        headers: this.headers,
        timeout: 10000
      });

      if (response.data && response.data.results) {
        return response.data.results
          .filter(r => r.metaData && r.metaData.addressType === 'street_address')
          .map(r => ({
            address: r.metaData.streetAddress || r.display,
            city: r.metaData.city,
            state: r.metaData.state,
            zip: r.metaData.zipCode,
            formatted: r.display,
            zpid: r.metaData.zpid
          }));
      }
      return [];
    } catch (error) {
      console.error('Zillow autocomplete error:', error.message);
      return [];
    }
  }

  /**
   * Get property details by ZPID
   */
  async getPropertyByZpid(zpid) {
    try {
      const url = `https://www.zillow.com/graphql/`;

      const query = {
        operationName: 'ForSaleDoubleScrollFullRenderQuery',
        variables: {
          zpid: parseInt(zpid),
          contactFormRenderParameter: {
            zpid: parseInt(zpid),
            platform: 'desktop',
            isDoubleScroll: true
          }
        },
        query: `query ForSaleDoubleScrollFullRenderQuery($zpid: ID!) {
          property(zpid: $zpid) {
            zpid
            streetAddress
            city
            state
            zipcode
            price
            zestimate
            rentZestimate
            bedrooms
            bathrooms
            livingArea
            lotSize
            yearBuilt
            propertyType
            description
            latitude
            longitude
            taxAssessedValue
            taxAssessedYear
            priceHistory {
              date
              price
              event
            }
          }
        }`
      };

      const response = await axios.post(url, query, {
        headers: {
          ...this.headers,
          'Content-Type': 'application/json',
        },
        timeout: 15000
      });

      if (response.data && response.data.data && response.data.data.property) {
        return this.normalizePropertyData(response.data.data.property);
      }
      return null;
    } catch (error) {
      console.error('Zillow property fetch error:', error.message);
      return null;
    }
  }

  /**
   * Search for property by address
   */
  async getPropertyInfo(addressParams) {
    try {
      const { address, city, state, zip } = addressParams;
      const searchQuery = `${address}, ${city}, ${state} ${zip}`;

      // First try to get ZPID from autocomplete
      const suggestions = await this.getAddressSuggestions(searchQuery);

      if (suggestions.length > 0 && suggestions[0].zpid) {
        const propertyData = await this.getPropertyByZpid(suggestions[0].zpid);
        if (propertyData) {
          return propertyData;
        }
      }

      // Fallback: Try direct search
      return await this.searchProperty(addressParams);
    } catch (error) {
      console.error('Zillow property info error:', error.message);
      return null;
    }
  }

  /**
   * Search property using Zillow's search API
   */
  async searchProperty(addressParams) {
    try {
      const { address, city, state, zip } = addressParams;

      const searchParams = {
        searchQueryState: JSON.stringify({
          usersSearchTerm: `${address}, ${city}, ${state} ${zip}`,
          mapBounds: {
            west: -180,
            east: 180,
            south: -90,
            north: 90
          },
          filterState: {
            sortSelection: { value: 'globalrelevanceex' },
            isAllHomes: { value: true }
          },
          isListVisible: true
        }),
        wants: JSON.stringify({
          cat1: ['listResults', 'mapResults'],
          cat2: ['total']
        }),
        requestId: Math.floor(Math.random() * 100)
      };

      const response = await axios.get(this.searchUrl, {
        params: searchParams,
        headers: this.headers,
        timeout: 15000
      });

      if (response.data && response.data.cat1 && response.data.cat1.searchResults) {
        const results = response.data.cat1.searchResults.listResults || [];
        if (results.length > 0) {
          const prop = results[0];
          return this.normalizeSearchResult(prop);
        }
      }

      return null;
    } catch (error) {
      console.error('Zillow search error:', error.message);
      return null;
    }
  }

  /**
   * Get Zestimate valuation
   */
  async getValuation(addressParams) {
    try {
      const propertyData = await this.getPropertyInfo(addressParams);

      if (propertyData && propertyData.valuation) {
        return propertyData.valuation;
      }

      return null;
    } catch (error) {
      console.error('Zillow valuation error:', error.message);
      return null;
    }
  }

  /**
   * Normalize property data from GraphQL response
   */
  normalizePropertyData(data) {
    if (!data) return null;

    const valuation = {
      estimatedValue: data.zestimate,
      rentEstimate: data.rentZestimate,
      range: {
        low: data.zestimate ? Math.round(data.zestimate * 0.95) : null,
        high: data.zestimate ? Math.round(data.zestimate * 1.05) : null
      },
      confidence: data.zestimate ? 'high' : 'low',
      lastUpdated: new Date().toISOString(),
      source: 'Zillow Zestimate'
    };

    return {
      basic: {
        propertyType: this.mapPropertyType(data.propertyType),
        yearBuilt: data.yearBuilt,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFeet: data.livingArea,
        lotSize: data.lotSize,
        price: data.price,
        zpid: data.zpid
      },
      location: {
        address: data.streetAddress,
        city: data.city,
        state: data.state,
        zip: data.zipcode,
        latitude: data.latitude,
        longitude: data.longitude
      },
      valuation,
      taxInfo: {
        assessedValue: data.taxAssessedValue,
        taxYear: data.taxAssessedYear
      },
      salesHistory: data.priceHistory ? data.priceHistory.map(h => ({
        date: h.date,
        price: h.price,
        event: h.event
      })) : [],
      description: data.description
    };
  }

  /**
   * Normalize search result
   */
  normalizeSearchResult(prop) {
    return {
      basic: {
        propertyType: prop.propertyType || 'Unknown',
        yearBuilt: prop.yearBuilt,
        bedrooms: prop.beds,
        bathrooms: prop.baths,
        squareFeet: prop.area,
        lotSize: prop.lotSize,
        price: prop.price || prop.unformattedPrice,
        zpid: prop.zpid
      },
      location: {
        address: prop.addressStreet,
        city: prop.addressCity,
        state: prop.addressState,
        zip: prop.addressZipcode,
        latitude: prop.latLong?.latitude,
        longitude: prop.latLong?.longitude
      },
      valuation: {
        estimatedValue: prop.zestimate || prop.price,
        range: null,
        confidence: prop.zestimate ? 'high' : 'medium',
        lastUpdated: new Date().toISOString(),
        source: 'Zillow'
      },
      salesHistory: []
    };
  }

  /**
   * Map Zillow property type to standard format
   */
  mapPropertyType(type) {
    const typeMap = {
      'SINGLE_FAMILY': 'Single Family',
      'CONDO': 'Condominium',
      'TOWNHOUSE': 'Townhouse',
      'MULTI_FAMILY': 'Multi-Family',
      'APARTMENT': 'Apartment',
      'MANUFACTURED': 'Manufactured',
      'LOT': 'Vacant Land'
    };
    return typeMap[type] || type || 'Unknown';
  }
}

module.exports = new ZillowRealProvider();
