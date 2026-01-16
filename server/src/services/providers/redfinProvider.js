const axios = require('axios');

/**
 * Redfin Data Provider
 * Uses Redfin's public API endpoints for property data
 */

class RedfinProvider {
  constructor() {
    this.baseUrl = 'https://www.redfin.com';
    this.stingrayUrl = 'https://www.redfin.com/stingray';

    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.redfin.com/',
    };
  }

  /**
   * Search for property by address
   */
  async getPropertyInfo(addressParams) {
    try {
      const { address, city, state, zip } = addressParams;
      const searchQuery = `${address}, ${city}, ${state} ${zip}`;

      // First, get the property URL from autocomplete
      const searchResult = await this.searchAddress(searchQuery);

      if (searchResult && searchResult.url) {
        // Then fetch the property details
        const propertyDetails = await this.fetchPropertyDetails(searchResult.url);
        return propertyDetails;
      }

      return null;
    } catch (error) {
      console.error('Redfin property info error:', error.message);
      return null;
    }
  }

  /**
   * Search address using Redfin's autocomplete
   */
  async searchAddress(query) {
    try {
      const response = await axios.get(`${this.stingrayUrl}/do/location-autocomplete`, {
        params: {
          location: query,
          v: 2,
          market: 'socal',
          al: 1,
          num_homes: 5
        },
        headers: this.headers,
        timeout: 10000
      });

      // Redfin returns data with a prefix that needs to be stripped
      let data = response.data;
      if (typeof data === 'string' && data.startsWith('{}&&')) {
        data = JSON.parse(data.substring(4));
      }

      if (data && data.payload && data.payload.exactMatch) {
        const match = data.payload.exactMatch;
        return {
          url: match.url,
          name: match.name,
          type: match.type,
          id: match.id
        };
      }

      // Try first section result
      if (data && data.payload && data.payload.sections) {
        for (const section of data.payload.sections) {
          if (section.rows && section.rows.length > 0) {
            const row = section.rows[0];
            return {
              url: row.url,
              name: row.name,
              type: row.type,
              id: row.id
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Redfin search error:', error.message);
      return null;
    }
  }

  /**
   * Fetch property details from Redfin
   */
  async fetchPropertyDetails(propertyUrl) {
    try {
      // Get initial page data
      const initialUrl = `${this.stingrayUrl}/api/home/details/initialInfo`;
      const response = await axios.get(initialUrl, {
        params: {
          path: propertyUrl
        },
        headers: this.headers,
        timeout: 10000
      });

      let data = response.data;
      if (typeof data === 'string' && data.startsWith('{}&&')) {
        data = JSON.parse(data.substring(4));
      }

      if (data && data.payload) {
        const payload = data.payload;

        // Fetch AVM (Automated Valuation Model) data
        const avmData = await this.fetchAVM(payload.propertyId, payload.listingId);

        return this.normalizePropertyData(payload, avmData);
      }

      return null;
    } catch (error) {
      console.error('Redfin property details error:', error.message);
      return null;
    }
  }

  /**
   * Fetch AVM (property valuation) data
   */
  async fetchAVM(propertyId, listingId) {
    try {
      const response = await axios.get(`${this.stingrayUrl}/api/home/details/avm`, {
        params: {
          propertyId: propertyId,
          listingId: listingId || '',
          accessLevel: 1
        },
        headers: this.headers,
        timeout: 10000
      });

      let data = response.data;
      if (typeof data === 'string' && data.startsWith('{}&&')) {
        data = JSON.parse(data.substring(4));
      }

      return data?.payload || null;
    } catch (error) {
      console.error('Redfin AVM error:', error.message);
      return null;
    }
  }

  /**
   * Get address suggestions
   */
  async getAddressSuggestions(query) {
    try {
      const response = await axios.get(`${this.stingrayUrl}/do/location-autocomplete`, {
        params: {
          location: query,
          v: 2,
          al: 1,
          num_homes: 5
        },
        headers: this.headers,
        timeout: 10000
      });

      let data = response.data;
      if (typeof data === 'string' && data.startsWith('{}&&')) {
        data = JSON.parse(data.substring(4));
      }

      const suggestions = [];

      if (data && data.payload && data.payload.sections) {
        for (const section of data.payload.sections) {
          if (section.rows) {
            for (const row of section.rows) {
              if (row.type === 'address' || row.type === '1') {
                suggestions.push({
                  address: row.name,
                  city: row.subName?.split(',')[0]?.trim() || '',
                  state: row.subName?.split(',')[1]?.trim()?.split(' ')[0] || '',
                  zip: row.subName?.split(' ').pop() || '',
                  formatted: `${row.name}, ${row.subName}`,
                  url: row.url
                });
              }
            }
          }
        }
      }

      return suggestions.slice(0, 5);
    } catch (error) {
      console.error('Redfin autocomplete error:', error.message);
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
      console.error('Redfin valuation error:', error.message);
      return null;
    }
  }

  /**
   * Normalize property data from Redfin response
   */
  normalizePropertyData(payload, avmData) {
    if (!payload) return null;

    const basic = payload.basicInfo || {};
    const publicRecords = payload.publicRecordsInfo || {};
    const address = payload.addressInfo || {};

    // Calculate valuation
    let estimatedValue = null;
    let valueRange = null;

    if (avmData) {
      estimatedValue = avmData.predictedValue || avmData.comparablesValue;
      if (avmData.predictedValueLow && avmData.predictedValueHigh) {
        valueRange = {
          low: avmData.predictedValueLow,
          high: avmData.predictedValueHigh
        };
      }
    }

    // Fallback to listing price or last sold price
    if (!estimatedValue) {
      estimatedValue = basic.price || publicRecords.lastSoldPrice;
    }

    return {
      basic: {
        propertyType: this.mapPropertyType(basic.propertyType),
        yearBuilt: publicRecords.yearBuilt || basic.yearBuilt,
        bedrooms: basic.beds,
        bathrooms: basic.baths,
        squareFeet: basic.sqFt?.value || publicRecords.sqFt,
        lotSize: publicRecords.lotSqFt,
        stories: publicRecords.stories,
        price: basic.price
      },
      location: {
        address: address.streetAddress,
        city: address.city,
        state: address.state,
        zip: address.zip,
        latitude: address.centroid?.centroid?.latitude,
        longitude: address.centroid?.centroid?.longitude
      },
      valuation: {
        estimatedValue: estimatedValue,
        range: valueRange,
        confidence: avmData ? 'high' : 'medium',
        lastUpdated: new Date().toISOString(),
        source: 'Redfin Estimate'
      },
      taxInfo: {
        assessedValue: publicRecords.taxInfo?.assessedValue,
        taxAmount: publicRecords.taxInfo?.taxAmount,
        taxYear: publicRecords.taxInfo?.taxYear
      },
      details: {
        construction: publicRecords.constructionType,
        roofType: publicRecords.roofType,
        heating: publicRecords.heatingType,
        cooling: publicRecords.coolingType,
        foundation: publicRecords.foundationType,
        parking: publicRecords.parkingType
      },
      salesHistory: this.extractSalesHistory(payload),
      features: this.extractFeatures(payload)
    };
  }

  /**
   * Extract sales history
   */
  extractSalesHistory(payload) {
    const history = [];

    if (payload.propertyHistory && payload.propertyHistory.events) {
      for (const event of payload.propertyHistory.events) {
        if (event.price && event.eventDate) {
          history.push({
            date: event.eventDate,
            price: event.price,
            event: event.eventDescription || 'Sold'
          });
        }
      }
    }

    return history;
  }

  /**
   * Extract features
   */
  extractFeatures(payload) {
    const features = [];

    if (payload.amenitiesInfo && payload.amenitiesInfo.superGroups) {
      for (const group of payload.amenitiesInfo.superGroups) {
        if (group.amenityGroups) {
          for (const amenityGroup of group.amenityGroups) {
            if (amenityGroup.amenityEntries) {
              for (const entry of amenityGroup.amenityEntries) {
                if (entry.amenityValues) {
                  features.push(...entry.amenityValues.map(v => v.amenityValue));
                }
              }
            }
          }
        }
      }
    }

    return features.slice(0, 20); // Limit to 20 features
  }

  /**
   * Map property type to standard format
   */
  mapPropertyType(type) {
    const typeMap = {
      'singleFamilyHouse': 'Single Family',
      'condo': 'Condominium',
      'townhouse': 'Townhouse',
      'multiFamily': 'Multi-Family',
      'land': 'Vacant Land',
      'mobile': 'Manufactured',
      'farm': 'Farm/Ranch'
    };
    return typeMap[type] || type || 'Unknown';
  }
}

module.exports = new RedfinProvider();
