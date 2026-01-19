const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Santa Clara County Assessor Provider
 * Scrapes property data from the SCC Assessor's Office website
 * URL: https://www.sccassessor.org/
 *
 * Provides: Assessed values, tax info, property details, APN
 * Note: This scrapes public data - be respectful of rate limits
 */

class SCCAssessorProvider {
  constructor() {
    this.baseUrl = 'https://www.sccassessor.org';
    this.searchUrl = 'https://www.sccassessor.org/index.php/online-services/property-search/real-property';
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Search for a property by address
   */
  async searchProperty(addressParams) {
    const { address, city, state, zip } = addressParams;

    // Only works for Santa Clara County
    if (state !== 'CA') {
      console.log('SCC Assessor: Only supports California properties');
      return null;
    }

    try {
      console.log(`SCC Assessor: Searching for ${address}, ${city}`);

      // First, get the search page to find any tokens/cookies needed
      const searchPageResponse = await axios.get(this.searchUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 30000
      });

      // Try the direct property search API endpoint
      // SCC Assessor uses an internal search - let's try common patterns
      const searchTerms = this.normalizeAddress(address);

      // Try the property search endpoint
      const searchResponse = await axios.get(
        `${this.baseUrl}/index.php`,
        {
          params: {
            option: 'com_propertyinquiry',
            task: 'search',
            streetno: searchTerms.streetNumber,
            streetname: searchTerms.streetName,
            city: city,
            zip: zip
          },
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'application/json, text/html',
            'Referer': this.searchUrl
          },
          timeout: 30000
        }
      );

      if (searchResponse.data) {
        return this.parseSearchResults(searchResponse.data, addressParams);
      }

      return null;
    } catch (error) {
      console.error('SCC Assessor search error:', error.message);
      return null;
    }
  }

  /**
   * Get property details by APN (Assessor's Parcel Number)
   */
  async getPropertyByAPN(apn) {
    try {
      console.log(`SCC Assessor: Looking up APN ${apn}`);

      // Clean the APN format (remove dashes if present)
      const cleanAPN = apn.replace(/-/g, '');

      const response = await axios.get(
        `${this.baseUrl}/index.php`,
        {
          params: {
            option: 'com_propertyinquiry',
            task: 'detail',
            parcel: cleanAPN
          },
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html',
            'Referer': this.searchUrl
          },
          timeout: 30000
        }
      );

      if (response.data) {
        return this.parsePropertyDetail(response.data);
      }

      return null;
    } catch (error) {
      console.error('SCC Assessor APN lookup error:', error.message);
      return null;
    }
  }

  /**
   * Get property info including assessed values
   */
  async getPropertyInfo(addressParams) {
    const searchResult = await this.searchProperty(addressParams);

    if (searchResult && searchResult.apn) {
      // Get detailed info using the APN
      const details = await this.getPropertyByAPN(searchResult.apn);
      return details || searchResult;
    }

    return searchResult;
  }

  /**
   * Get assessed value for a property
   */
  async getAssessedValue(addressParams) {
    const propertyInfo = await this.getPropertyInfo(addressParams);

    if (propertyInfo && propertyInfo.assessedValue) {
      return {
        estimatedValue: propertyInfo.assessedValue.total,
        landValue: propertyInfo.assessedValue.land,
        improvementValue: propertyInfo.assessedValue.improvements,
        confidence: 'high',
        source: 'Santa Clara County Assessor',
        note: 'Official county assessed value (may differ from market value)',
        lastUpdated: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * Get tax information
   */
  async getTaxInfo(addressParams) {
    const propertyInfo = await this.getPropertyInfo(addressParams);

    if (propertyInfo) {
      return {
        assessedValue: propertyInfo.assessedValue?.total,
        landValue: propertyInfo.assessedValue?.land,
        improvementValue: propertyInfo.assessedValue?.improvements,
        taxAmount: propertyInfo.taxAmount,
        taxYear: propertyInfo.taxYear || new Date().getFullYear(),
        apn: propertyInfo.apn,
        source: 'Santa Clara County Assessor'
      };
    }

    return null;
  }

  /**
   * Normalize address for searching
   */
  normalizeAddress(address) {
    // Parse street number and name
    const match = address.match(/^(\d+)\s+(.+)$/);

    if (match) {
      return {
        streetNumber: match[1],
        streetName: match[2].toUpperCase()
          .replace(/\bSTREET\b/g, 'ST')
          .replace(/\bAVENUE\b/g, 'AVE')
          .replace(/\bBOULEVARD\b/g, 'BLVD')
          .replace(/\bDRIVE\b/g, 'DR')
          .replace(/\bLANE\b/g, 'LN')
          .replace(/\bROAD\b/g, 'RD')
          .replace(/\bCOURT\b/g, 'CT')
          .replace(/,?\s*(UNIT|APT|#)\s*\d+$/i, '') // Remove unit numbers
      };
    }

    return {
      streetNumber: '',
      streetName: address.toUpperCase()
    };
  }

  /**
   * Parse search results from HTML
   */
  parseSearchResults(html, addressParams) {
    try {
      const $ = cheerio.load(html);

      // Look for property data in common table/div patterns
      const results = [];

      // Try to find property listing table
      $('table.property-list tr, .property-result, .search-result').each((i, el) => {
        const row = $(el);
        const apn = row.find('[data-apn], .apn, td:contains("APN")').text().trim();
        const address = row.find('.address, td:nth-child(2)').text().trim();
        const owner = row.find('.owner, td:nth-child(3)').text().trim();

        if (apn || address) {
          results.push({ apn, address, owner });
        }
      });

      // If we found results, return the first matching one
      if (results.length > 0) {
        return {
          apn: results[0].apn,
          address: results[0].address,
          owner: results[0].owner,
          source: 'Santa Clara County Assessor'
        };
      }

      // Try to extract from JSON if it's embedded
      const jsonMatch = html.match(/var\s+propertyData\s*=\s*(\{[\s\S]*?\});/);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          return this.normalizePropertyData(data);
        } catch (e) {
          // JSON parse failed, continue
        }
      }

      return null;
    } catch (error) {
      console.error('SCC Assessor parse error:', error.message);
      return null;
    }
  }

  /**
   * Parse property detail page
   */
  parsePropertyDetail(html) {
    try {
      const $ = cheerio.load(html);

      const property = {
        apn: null,
        address: null,
        owner: null,
        assessedValue: {
          land: null,
          improvements: null,
          total: null
        },
        propertyType: null,
        yearBuilt: null,
        squareFeet: null,
        lotSize: null,
        bedrooms: null,
        bathrooms: null,
        taxYear: new Date().getFullYear(),
        source: 'Santa Clara County Assessor'
      };

      // Extract APN
      const apnText = $('td:contains("Parcel Number"), td:contains("APN"), .apn').next().text().trim() ||
                      $('span:contains("Parcel")').parent().text().match(/\d{3}-\d{2}-\d{3}/)?.[0];
      if (apnText) {
        property.apn = apnText.replace(/[^\d-]/g, '');
      }

      // Extract owner name
      const ownerText = $('td:contains("Owner"), .owner-name').next().text().trim() ||
                        $('span:contains("Owner")').parent().text().replace('Owner:', '').trim();
      if (ownerText) {
        property.owner = ownerText;
      }

      // Extract address
      const addressText = $('td:contains("Situs Address"), .property-address').next().text().trim() ||
                          $('span:contains("Address")').parent().text().replace('Address:', '').trim();
      if (addressText) {
        property.address = addressText;
      }

      // Extract assessed values
      const landValue = this.extractCurrency($('td:contains("Land Value"), td:contains("Land"):not(:contains("Total"))').next().text());
      const improvementValue = this.extractCurrency($('td:contains("Improvement"), td:contains("Structure")').next().text());
      const totalValue = this.extractCurrency($('td:contains("Total Value"), td:contains("Net Value")').next().text());

      if (landValue) property.assessedValue.land = landValue;
      if (improvementValue) property.assessedValue.improvements = improvementValue;
      if (totalValue) property.assessedValue.total = totalValue;

      // If we have land and improvement but no total, calculate it
      if (property.assessedValue.land && property.assessedValue.improvements && !property.assessedValue.total) {
        property.assessedValue.total = property.assessedValue.land + property.assessedValue.improvements;
      }

      // Extract property characteristics
      const yearBuilt = $('td:contains("Year Built")').next().text().match(/\d{4}/)?.[0];
      if (yearBuilt) property.yearBuilt = parseInt(yearBuilt);

      const sqft = $('td:contains("Living Area"), td:contains("Square Feet")').next().text().match(/[\d,]+/)?.[0];
      if (sqft) property.squareFeet = parseInt(sqft.replace(/,/g, ''));

      const lotSize = $('td:contains("Lot Size"), td:contains("Land Area")').next().text().match(/[\d,.]+/)?.[0];
      if (lotSize) property.lotSize = parseFloat(lotSize.replace(/,/g, ''));

      const beds = $('td:contains("Bedroom")').next().text().match(/\d+/)?.[0];
      if (beds) property.bedrooms = parseInt(beds);

      const baths = $('td:contains("Bathroom"), td:contains("Bath")').next().text().match(/[\d.]+/)?.[0];
      if (baths) property.bathrooms = parseFloat(baths);

      const propertyType = $('td:contains("Property Type"), td:contains("Use Code")').next().text().trim();
      if (propertyType) property.propertyType = propertyType;

      // Only return if we found some useful data
      if (property.apn || property.assessedValue.total || property.owner) {
        return property;
      }

      return null;
    } catch (error) {
      console.error('SCC Assessor detail parse error:', error.message);
      return null;
    }
  }

  /**
   * Extract currency value from text
   */
  extractCurrency(text) {
    if (!text) return null;
    const match = text.replace(/[$,]/g, '').match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  /**
   * Normalize property data from various formats
   */
  normalizePropertyData(data) {
    return {
      apn: data.parcel || data.apn || data.parcelNumber,
      address: data.address || data.situsAddress,
      owner: data.owner || data.ownerName,
      assessedValue: {
        land: data.landValue || data.land,
        improvements: data.improvementValue || data.improvements,
        total: data.totalValue || data.assessedValue || data.netValue
      },
      propertyType: data.propertyType || data.useCode,
      yearBuilt: data.yearBuilt,
      squareFeet: data.squareFeet || data.livingArea,
      lotSize: data.lotSize || data.landArea,
      source: 'Santa Clara County Assessor'
    };
  }
}

module.exports = new SCCAssessorProvider();
