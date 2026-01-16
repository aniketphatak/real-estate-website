const dataAggregator = require('./dataAggregator');
const zillowProvider = require('./providers/zillowProvider');
const attomProvider = require('./providers/attomProvider');
const countyRecordsProvider = require('./providers/countyRecordsProvider');
const nmlsProvider = require('./providers/nmlsProvider');
const cacheService = require('./cacheService');

class PropertyService {
  constructor() {
    this.providers = {
      zillow: zillowProvider,
      attom: attomProvider,
      countyRecords: countyRecordsProvider,
      nmls: nmlsProvider
    };
  }

  /**
   * Get comprehensive property data from all available sources
   */
  async getPropertyData(addressParams) {
    const cacheKey = this.generateCacheKey('property', addressParams);
    const cached = cacheService.get(cacheKey);

    if (cached) {
      console.log('Returning cached property data');
      return cached;
    }

    try {
      // Fetch from all providers in parallel for speed
      const results = await dataAggregator.aggregatePropertyData(addressParams, this.providers);

      // Cache for 1 hour
      cacheService.set(cacheKey, results, 3600);

      return results;
    } catch (error) {
      console.error('Error fetching property data:', error);
      throw error;
    }
  }

  /**
   * Get property valuation estimates
   */
  async getPropertyValuation(addressParams) {
    const cacheKey = this.generateCacheKey('valuation', addressParams);
    const cached = cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const valuations = await Promise.allSettled([
        this.providers.zillow.getValuation(addressParams),
        this.providers.attom.getValuation(addressParams),
        this.providers.countyRecords.getAssessedValue(addressParams)
      ]);

      const result = {
        estimates: [],
        averageValue: 0,
        confidenceScore: 0,
        lastUpdated: new Date().toISOString()
      };

      let totalValue = 0;
      let count = 0;

      valuations.forEach((valuation, index) => {
        if (valuation.status === 'fulfilled' && valuation.value) {
          const providerNames = ['Zillow', 'ATTOM', 'County Records'];
          result.estimates.push({
            source: providerNames[index],
            value: valuation.value.estimatedValue,
            range: valuation.value.range || null,
            confidence: valuation.value.confidence || 'medium',
            lastUpdated: valuation.value.lastUpdated
          });
          totalValue += valuation.value.estimatedValue;
          count++;
        }
      });

      if (count > 0) {
        result.averageValue = Math.round(totalValue / count);
        result.confidenceScore = count >= 2 ? 'high' : 'medium';
      }

      cacheService.set(cacheKey, result, 3600);
      return result;
    } catch (error) {
      console.error('Error fetching valuation:', error);
      throw error;
    }
  }

  /**
   * Get mortgage and lien information
   */
  async getMortgageData(addressParams) {
    const cacheKey = this.generateCacheKey('mortgage', addressParams);
    const cached = cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const [mortgageInfo, lienInfo, nmlsInfo] = await Promise.allSettled([
        this.providers.attom.getMortgageInfo(addressParams),
        this.providers.countyRecords.getLienInfo(addressParams),
        this.providers.nmls.getLenderInfo(addressParams)
      ]);

      const result = {
        mortgages: mortgageInfo.status === 'fulfilled' ? mortgageInfo.value : [],
        liens: lienInfo.status === 'fulfilled' ? lienInfo.value : [],
        lenderDetails: nmlsInfo.status === 'fulfilled' ? nmlsInfo.value : null,
        totalOutstanding: 0,
        lastUpdated: new Date().toISOString()
      };

      // Calculate total outstanding
      if (result.mortgages && result.mortgages.length > 0) {
        result.totalOutstanding = result.mortgages.reduce(
          (sum, m) => sum + (m.currentBalance || m.originalAmount || 0),
          0
        );
      }

      cacheService.set(cacheKey, result, 1800); // Cache for 30 minutes
      return result;
    } catch (error) {
      console.error('Error fetching mortgage data:', error);
      throw error;
    }
  }

  /**
   * Get property owner information
   */
  async getOwnerData(addressParams) {
    const cacheKey = this.generateCacheKey('owner', addressParams);
    const cached = cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const [attomOwner, countyOwner] = await Promise.allSettled([
        this.providers.attom.getOwnerInfo(addressParams),
        this.providers.countyRecords.getOwnerInfo(addressParams)
      ]);

      // Merge and deduplicate owner information
      const result = dataAggregator.mergeOwnerData(
        attomOwner.status === 'fulfilled' ? attomOwner.value : null,
        countyOwner.status === 'fulfilled' ? countyOwner.value : null
      );

      cacheService.set(cacheKey, result, 3600);
      return result;
    } catch (error) {
      console.error('Error fetching owner data:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive property report
   */
  async getComprehensiveReport(addressParams) {
    const cacheKey = this.generateCacheKey('report', addressParams);
    const cached = cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Fetch all data in parallel
      const [propertyData, valuation, mortgage, owner] = await Promise.all([
        this.getPropertyData(addressParams),
        this.getPropertyValuation(addressParams),
        this.getMortgageData(addressParams),
        this.getOwnerData(addressParams)
      ]);

      const report = {
        address: {
          street: addressParams.address,
          city: addressParams.city,
          state: addressParams.state,
          zip: addressParams.zip,
          formatted: `${addressParams.address}, ${addressParams.city}, ${addressParams.state} ${addressParams.zip}`
        },
        property: propertyData,
        valuation,
        mortgage,
        owner,
        equity: this.calculateEquity(valuation, mortgage),
        generatedAt: new Date().toISOString()
      };

      cacheService.set(cacheKey, report, 1800);
      return report;
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      throw error;
    }
  }

  /**
   * Get property details by ID
   */
  async getPropertyDetails(propertyId, provider = 'attom') {
    if (!this.providers[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    return this.providers[provider].getPropertyById(propertyId);
  }

  /**
   * Get address autocomplete suggestions
   */
  async getAddressSuggestions(query) {
    try {
      const suggestions = await this.providers.zillow.getAddressSuggestions(query);
      return suggestions;
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      return [];
    }
  }

  /**
   * Calculate estimated equity
   */
  calculateEquity(valuation, mortgage) {
    if (!valuation || !valuation.averageValue) {
      return null;
    }

    const propertyValue = valuation.averageValue;
    const totalDebt = mortgage?.totalOutstanding || 0;
    const equity = propertyValue - totalDebt;
    const equityPercent = totalDebt > 0 ? ((equity / propertyValue) * 100).toFixed(1) : 100;

    return {
      estimatedEquity: equity,
      equityPercent: parseFloat(equityPercent),
      propertyValue,
      totalDebt,
      loanToValue: totalDebt > 0 ? ((totalDebt / propertyValue) * 100).toFixed(1) : 0
    };
  }

  /**
   * Generate cache key
   */
  generateCacheKey(type, addressParams) {
    const normalized = `${addressParams.address}-${addressParams.city}-${addressParams.state}-${addressParams.zip}`
      .toLowerCase()
      .replace(/\s+/g, '-');
    return `${type}:${normalized}`;
  }
}

module.exports = new PropertyService();
