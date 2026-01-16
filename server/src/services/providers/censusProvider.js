const axios = require('axios');

/**
 * US Census Bureau Data Provider
 * Provides housing statistics, demographics, and geocoding
 * Free API - No key required for most endpoints
 */

class CensusProvider {
  constructor() {
    this.geocodingUrl = 'https://geocoding.geo.census.gov/geocoder';
    this.acsUrl = 'https://api.census.gov/data';
    this.tigerweb = 'https://tigerweb.geo.census.gov/arcgis/rest/services';

    // API key is optional but recommended for higher rate limits
    this.apiKey = process.env.CENSUS_API_KEY || '';

    this.headers = {
      'Accept': 'application/json',
      'User-Agent': 'PropertyInsight/1.0'
    };
  }

  /**
   * Geocode an address to get coordinates and census tract
   */
  async geocodeAddress(addressParams) {
    try {
      const { address, city, state, zip } = addressParams;

      const response = await axios.get(`${this.geocodingUrl}/locations/onelineaddress`, {
        params: {
          address: `${address}, ${city}, ${state} ${zip}`,
          benchmark: 'Public_AR_Current',
          vintage: 'Current_Current',
          layers: 'all',
          format: 'json'
        },
        headers: this.headers,
        timeout: 15000
      });

      if (response.data && response.data.result && response.data.result.addressMatches) {
        const matches = response.data.result.addressMatches;
        if (matches.length > 0) {
          const match = matches[0];
          return {
            matched: true,
            coordinates: {
              latitude: match.coordinates.y,
              longitude: match.coordinates.x
            },
            matchedAddress: match.matchedAddress,
            tigerLineId: match.tigerLine?.tigerLineId,
            side: match.tigerLine?.side,
            geographies: match.geographies || {},
            censusTract: this.extractCensusTract(match.geographies),
            county: this.extractCounty(match.geographies),
            state: this.extractState(match.geographies)
          };
        }
      }

      return { matched: false };
    } catch (error) {
      console.error('Census geocoding error:', error.message);
      return { matched: false, error: error.message };
    }
  }

  /**
   * Get housing statistics for a census tract
   */
  async getHousingStats(censusTract, stateCode, countyCode) {
    try {
      // ACS 5-Year Estimates - Housing Characteristics
      const year = new Date().getFullYear() - 2; // ACS data is ~2 years behind

      const variables = [
        'B25077_001E', // Median home value
        'B25064_001E', // Median gross rent
        'B25035_001E', // Median year built
        'B25024_001E', // Total housing units
        'B25002_002E', // Occupied housing units
        'B25002_003E', // Vacant housing units
        'B25003_002E', // Owner occupied
        'B25003_003E', // Renter occupied
        'B25071_001E', // Median gross rent as % of income
        'B19013_001E', // Median household income
      ].join(',');

      const response = await axios.get(`${this.acsUrl}/${year}/acs/acs5`, {
        params: {
          get: variables,
          for: `tract:${censusTract}`,
          in: `state:${stateCode}+county:${countyCode}`,
          key: this.apiKey || undefined
        },
        headers: this.headers,
        timeout: 15000
      });

      if (response.data && response.data.length > 1) {
        const headers = response.data[0];
        const values = response.data[1];

        const data = {};
        headers.forEach((header, index) => {
          data[header] = values[index];
        });

        return this.normalizeHousingStats(data);
      }

      return null;
    } catch (error) {
      console.error('Census housing stats error:', error.message);
      return null;
    }
  }

  /**
   * Get neighborhood demographics
   */
  async getNeighborhoodData(censusTract, stateCode, countyCode) {
    try {
      const year = new Date().getFullYear() - 2;

      const variables = [
        'B01003_001E', // Total population
        'B01002_001E', // Median age
        'B19013_001E', // Median household income
        'B15003_022E', // Bachelor's degree
        'B15003_023E', // Master's degree
        'B15003_024E', // Professional degree
        'B15003_025E', // Doctorate
        'B23025_002E', // In labor force
        'B23025_005E', // Unemployed
        'B08303_001E', // Total commuters
        'B08303_012E', // Commute 30-34 min
        'B08303_013E', // Commute 35-44 min
      ].join(',');

      const response = await axios.get(`${this.acsUrl}/${year}/acs/acs5`, {
        params: {
          get: variables,
          for: `tract:${censusTract}`,
          in: `state:${stateCode}+county:${countyCode}`,
          key: this.apiKey || undefined
        },
        headers: this.headers,
        timeout: 15000
      });

      if (response.data && response.data.length > 1) {
        const headers = response.data[0];
        const values = response.data[1];

        const data = {};
        headers.forEach((header, index) => {
          data[header] = values[index];
        });

        return this.normalizeDemographics(data);
      }

      return null;
    } catch (error) {
      console.error('Census demographics error:', error.message);
      return null;
    }
  }

  /**
   * Get property info using census data
   */
  async getPropertyInfo(addressParams) {
    try {
      // First geocode the address
      const geoData = await this.geocodeAddress(addressParams);

      if (!geoData.matched) {
        return null;
      }

      const { censusTract, county, state: stateGeo } = geoData;

      if (!censusTract || !county || !stateGeo) {
        return { location: geoData };
      }

      // Get housing stats and demographics in parallel
      const [housingStats, demographics] = await Promise.all([
        this.getHousingStats(censusTract.tract, stateGeo.code, county.code),
        this.getNeighborhoodData(censusTract.tract, stateGeo.code, county.code)
      ]);

      return {
        location: geoData,
        neighborhood: {
          housing: housingStats,
          demographics: demographics,
          censusTract: censusTract.tract,
          county: county.name,
          state: stateGeo.name
        }
      };
    } catch (error) {
      console.error('Census property info error:', error.message);
      return null;
    }
  }

  /**
   * Get valuation based on census median home values
   */
  async getValuation(addressParams) {
    try {
      const propertyInfo = await this.getPropertyInfo(addressParams);

      if (propertyInfo && propertyInfo.neighborhood && propertyInfo.neighborhood.housing) {
        const medianValue = propertyInfo.neighborhood.housing.medianHomeValue;

        if (medianValue && medianValue > 0) {
          return {
            estimatedValue: medianValue,
            range: {
              low: Math.round(medianValue * 0.85),
              high: Math.round(medianValue * 1.15)
            },
            confidence: 'low',
            lastUpdated: new Date().toISOString(),
            source: 'US Census Bureau (Tract Median)',
            note: 'Based on census tract median home value, not specific property'
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Census valuation error:', error.message);
      return null;
    }
  }

  /**
   * Extract census tract from geographies
   */
  extractCensusTract(geographies) {
    if (geographies && geographies['Census Tracts']) {
      const tract = geographies['Census Tracts'][0];
      return {
        tract: tract.TRACT,
        name: tract.NAME,
        geoid: tract.GEOID
      };
    }
    return null;
  }

  /**
   * Extract county from geographies
   */
  extractCounty(geographies) {
    if (geographies && geographies['Counties']) {
      const county = geographies['Counties'][0];
      return {
        code: county.COUNTY,
        name: county.NAME,
        geoid: county.GEOID
      };
    }
    return null;
  }

  /**
   * Extract state from geographies
   */
  extractState(geographies) {
    if (geographies && geographies['States']) {
      const state = geographies['States'][0];
      return {
        code: state.STATE,
        name: state.NAME,
        abbreviation: state.STUSAB
      };
    }
    return null;
  }

  /**
   * Normalize housing statistics
   */
  normalizeHousingStats(data) {
    const parseValue = (val) => {
      const num = parseInt(val);
      return isNaN(num) || num < 0 ? null : num;
    };

    return {
      medianHomeValue: parseValue(data.B25077_001E),
      medianRent: parseValue(data.B25064_001E),
      medianYearBuilt: parseValue(data.B25035_001E),
      totalHousingUnits: parseValue(data.B25024_001E),
      occupiedUnits: parseValue(data.B25002_002E),
      vacantUnits: parseValue(data.B25002_003E),
      ownerOccupied: parseValue(data.B25003_002E),
      renterOccupied: parseValue(data.B25003_003E),
      rentBurden: parseValue(data.B25071_001E), // % of income on rent
      medianIncome: parseValue(data.B19013_001E),
      ownershipRate: this.calculateRate(data.B25003_002E, data.B25002_002E)
    };
  }

  /**
   * Normalize demographics data
   */
  normalizeDemographics(data) {
    const parseValue = (val) => {
      const num = parseInt(val);
      return isNaN(num) || num < 0 ? null : num;
    };

    const totalPop = parseValue(data.B01003_001E);
    const laborForce = parseValue(data.B23025_002E);
    const unemployed = parseValue(data.B23025_005E);

    const bachelors = parseValue(data.B15003_022E) || 0;
    const masters = parseValue(data.B15003_023E) || 0;
    const professional = parseValue(data.B15003_024E) || 0;
    const doctorate = parseValue(data.B15003_025E) || 0;
    const collegeDegrees = bachelors + masters + professional + doctorate;

    return {
      population: totalPop,
      medianAge: parseValue(data.B01002_001E),
      medianIncome: parseValue(data.B19013_001E),
      collegeEducated: collegeDegrees,
      collegeRate: totalPop ? Math.round((collegeDegrees / totalPop) * 100) : null,
      laborForce: laborForce,
      unemploymentRate: laborForce && unemployed ? Math.round((unemployed / laborForce) * 100 * 10) / 10 : null
    };
  }

  /**
   * Calculate percentage rate
   */
  calculateRate(numerator, denominator) {
    const num = parseInt(numerator);
    const denom = parseInt(denominator);
    if (isNaN(num) || isNaN(denom) || denom === 0) return null;
    return Math.round((num / denom) * 100 * 10) / 10;
  }
}

module.exports = new CensusProvider();
