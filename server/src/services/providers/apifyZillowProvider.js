const axios = require('axios');

/**
 * Apify Zillow Scraper Provider
 * Actor: maxcopell/zillow-scraper
 * Provides: Zillow property data, Zestimate, pricing history
 * Cost: ~$2 per 1000 results (uses your Apify credits)
 */

class ApifyZillowProvider {
  constructor() {
    this.apiToken = process.env.APIFY_API_TOKEN;
    this.actorId = 'maxcopell/zillow-scraper';
    this.baseUrl = 'https://api.apify.com/v2';
  }

  /**
   * Check if provider is configured
   */
  isConfigured() {
    return !!this.apiToken && this.apiToken.length > 10;
  }

  /**
   * Run the Zillow scraper actor
   */
  async runActor(input) {
    if (!this.isConfigured()) {
      console.log('Apify API not configured for Zillow scraper');
      return null;
    }

    try {
      console.log('Running Apify Zillow scraper with input:', input);

      const response = await axios.post(
        `${this.baseUrl}/acts/${this.actorId}/run-sync-get-dataset-items`,
        input,
        {
          params: { token: this.apiToken },
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000
        }
      );

      if (response.data && response.data.length > 0) {
        console.log('Apify Zillow scraper returned', response.data.length, 'results');
        return response.data;
      }

      return null;
    } catch (error) {
      if (error.response) {
        console.error(`Apify Zillow Error ${error.response.status}:`, error.response.data?.error?.message || 'Unknown error');
      } else {
        console.error('Apify Zillow Error:', error.message);
      }
      return null;
    }
  }

  /**
   * Get property valuation from Zillow via Apify
   */
  async getValuation(addressParams) {
    const { address, city, state, zip } = addressParams;

    // Search for the property on Zillow
    const searchQuery = `${address}, ${city}, ${state} ${zip}`;

    const results = await this.runActor({
      searchType: 'address',
      search: searchQuery,
      maxItems: 1
    });

    if (results && results.length > 0) {
      const property = results[0];

      // Extract Zestimate and other valuation data
      const zestimate = property.zestimate || property.price || property.estimatedValue;
      const rentZestimate = property.rentZestimate || property.rentEstimate;

      if (zestimate) {
        return {
          estimatedValue: zestimate,
          range: {
            low: property.zestimateLowPercent ? Math.round(zestimate * (1 - property.zestimateLowPercent/100)) : null,
            high: property.zestimateHighPercent ? Math.round(zestimate * (1 + property.zestimateHighPercent/100)) : null
          },
          rentEstimate: rentZestimate,
          confidence: 'medium',
          source: 'Zillow (via Apify)',
          lastUpdated: property.datePosted || new Date().toISOString()
        };
      }
    }

    return null;
  }

  /**
   * Get property details from Zillow via Apify
   */
  async getPropertyInfo(addressParams) {
    const { address, city, state, zip } = addressParams;
    const searchQuery = `${address}, ${city}, ${state} ${zip}`;

    const results = await this.runActor({
      searchType: 'address',
      search: searchQuery,
      maxItems: 1
    });

    if (results && results.length > 0) {
      const property = results[0];

      return {
        basic: {
          propertyType: property.homeType || property.propertyType,
          yearBuilt: property.yearBuilt,
          bedrooms: property.bedrooms || property.beds,
          bathrooms: property.bathrooms || property.baths,
          squareFeet: property.livingArea || property.squareFeet,
          lotSize: property.lotSize || property.lotAreaValue,
          stories: property.stories,
          parking: property.garageSpaces || property.parking
        },
        valuation: {
          zestimate: property.zestimate,
          rentZestimate: property.rentZestimate,
          price: property.price
        },
        priceHistory: this.extractPriceHistory(property),
        source: 'Zillow (via Apify)'
      };
    }

    return null;
  }

  /**
   * Extract price/sales history from Zillow property data
   */
  extractPriceHistory(property) {
    const history = [];

    // Check for price history array
    const priceHistory = property.priceHistory || property.priceHistoryInfo || [];

    if (Array.isArray(priceHistory)) {
      priceHistory.forEach(item => {
        if (item.price) {
          history.push({
            date: item.date || item.time,
            price: item.price,
            event: item.event || item.priceChangeType || 'Price Change',
            source: 'Zillow'
          });
        }
      });
    }

    // Sort by date descending
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    return history;
  }
}

module.exports = new ApifyZillowProvider();
