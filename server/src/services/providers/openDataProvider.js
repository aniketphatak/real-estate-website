const axios = require('axios');

/**
 * Open Data Provider
 * Aggregates property data from various county open data portals
 * Many counties publish property records through Socrata/Open Data platforms
 */

class OpenDataProvider {
  constructor() {
    // Known county open data portals with property data
    this.dataSources = {
      // California
      'los_angeles_ca': {
        url: 'https://data.lacounty.gov/resource/9trm-uz8i.json',
        addressField: 'situsaddress',
        valueField: 'assessedvalue',
        yearField: 'yearbuilt'
      },
      'san_francisco_ca': {
        url: 'https://data.sfgov.org/resource/wv5m-vpq2.json',
        addressField: 'property_address',
        valueField: 'assessed_land_value'
      },
      // New York
      'new_york_ny': {
        url: 'https://data.cityofnewyork.us/resource/8y4t-faws.json',
        addressField: 'address',
        valueField: 'land_value'
      },
      // Texas
      'austin_tx': {
        url: 'https://data.austintexas.gov/resource/9e3p-jqph.json',
        addressField: 'address',
        valueField: 'total_appraised_value'
      },
      // Washington
      'seattle_wa': {
        url: 'https://data.seattle.gov/resource/9bs3-i9us.json',
        addressField: 'address',
        valueField: 'taxvalueland'
      }
    };

    this.headers = {
      'Accept': 'application/json',
      'User-Agent': 'PropertyInsight/1.0'
    };
  }

  /**
   * Get the data source key for a location
   */
  getDataSourceKey(city, state) {
    const cityLower = city.toLowerCase().replace(/\s+/g, '_');
    const stateLower = state.toLowerCase();
    return `${cityLower}_${stateLower}`;
  }

  /**
   * Search for property in county open data
   */
  async getPropertyInfo(addressParams) {
    try {
      const { address, city, state, zip } = addressParams;
      const dataSourceKey = this.getDataSourceKey(city, state);
      const dataSource = this.dataSources[dataSourceKey];

      if (!dataSource) {
        console.log(`No open data source for ${city}, ${state}`);
        return null;
      }

      // Normalize address for search
      const searchAddress = address.toUpperCase().replace(/[.,#]/g, '');

      const response = await axios.get(dataSource.url, {
        params: {
          $where: `upper(${dataSource.addressField}) like '%${searchAddress}%'`,
          $limit: 5
        },
        headers: this.headers,
        timeout: 15000
      });

      if (response.data && response.data.length > 0) {
        return this.normalizeOpenData(response.data[0], dataSource);
      }

      return null;
    } catch (error) {
      console.error('Open data search error:', error.message);
      return null;
    }
  }

  /**
   * Get property assessed value from open data
   */
  async getAssessedValue(addressParams) {
    try {
      const propertyData = await this.getPropertyInfo(addressParams);

      if (propertyData && propertyData.taxInfo && propertyData.taxInfo.assessedValue) {
        return {
          estimatedValue: propertyData.taxInfo.assessedValue,
          range: null,
          confidence: 'medium',
          lastUpdated: new Date().toISOString(),
          source: 'County Open Data',
          note: 'Based on county tax assessment'
        };
      }

      return null;
    } catch (error) {
      console.error('Open data valuation error:', error.message);
      return null;
    }
  }

  /**
   * Search multiple nationwide sources
   */
  async searchNationwideOpenData(addressParams) {
    const results = [];

    // Try HUD housing data
    const hudData = await this.searchHUD(addressParams);
    if (hudData) results.push({ source: 'HUD', data: hudData });

    // Try Zillow's public research data
    const researchData = await this.getZillowResearchData(addressParams);
    if (researchData) results.push({ source: 'Zillow Research', data: researchData });

    return results;
  }

  /**
   * Search HUD (Housing and Urban Development) data
   */
  async searchHUD(addressParams) {
    try {
      const { state, zip } = addressParams;

      // HUD Fair Market Rents API
      const response = await axios.get('https://www.huduser.gov/hudapi/public/fmr/data', {
        params: {
          zip: zip
        },
        headers: {
          ...this.headers,
          'Authorization': `Bearer ${process.env.HUD_API_KEY || ''}`
        },
        timeout: 10000
      });

      if (response.data && response.data.data) {
        const fmr = response.data.data;
        return {
          fairMarketRent: {
            studio: fmr.efficiency,
            oneBed: fmr.one_bedroom,
            twoBed: fmr.two_bedroom,
            threeBed: fmr.three_bedroom,
            fourBed: fmr.four_bedroom
          },
          year: fmr.year,
          areaName: fmr.area_name
        };
      }

      return null;
    } catch (error) {
      console.error('HUD search error:', error.message);
      return null;
    }
  }

  /**
   * Get Zillow Research Data (publicly available aggregate data)
   */
  async getZillowResearchData(addressParams) {
    try {
      const { city, state, zip } = addressParams;

      // Zillow Home Value Index (ZHVI) - publicly available CSV data
      // This would typically be pre-loaded or cached
      // For now, return structure showing what data is available
      return {
        dataAvailable: true,
        metrics: ['ZHVI', 'ZRI', 'Sale Prices'],
        note: 'Zillow Research data available at zillow.com/research/data'
      };
    } catch (error) {
      console.error('Zillow research error:', error.message);
      return null;
    }
  }

  /**
   * Normalize open data response
   */
  normalizeOpenData(record, dataSource) {
    // Generic normalization - actual field names vary by source
    return {
      basic: {
        yearBuilt: record[dataSource.yearField] || record.yearbuilt || record.year_built,
        squareFeet: record.sqft || record.square_feet || record.living_area,
        bedrooms: record.beds || record.bedrooms,
        bathrooms: record.baths || record.bathrooms,
        lotSize: record.lot_size || record.lot_sqft
      },
      taxInfo: {
        assessedValue: parseFloat(record[dataSource.valueField]) || null,
        landValue: parseFloat(record.land_value || record.landvalue) || null,
        improvementValue: parseFloat(record.improvement_value || record.improvementvalue) || null,
        taxYear: record.tax_year || record.taxyear || new Date().getFullYear()
      },
      location: {
        address: record[dataSource.addressField],
        parcelId: record.parcel_id || record.apn || record.pin
      },
      source: 'County Open Data',
      rawData: record
    };
  }

  /**
   * Get list of supported cities
   */
  getSupportedLocations() {
    return Object.keys(this.dataSources).map(key => {
      const parts = key.split('_');
      const state = parts.pop().toUpperCase();
      const city = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      return { city, state };
    });
  }
}

module.exports = new OpenDataProvider();
