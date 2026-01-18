const dataAggregator = require('./dataAggregator');
const cacheService = require('./cacheService');

// Original providers (use mock data when not configured)
const zillowProvider = require('./providers/zillowProvider');
const attomProvider = require('./providers/attomProvider');
const countyRecordsProvider = require('./providers/countyRecordsProvider');
const nmlsProvider = require('./providers/nmlsProvider');

// NEW: Free real data providers
const zillowRealProvider = require('./providers/zillowRealProvider');
const redfinProvider = require('./providers/redfinProvider');
const censusProvider = require('./providers/censusProvider');
const geocodingProvider = require('./providers/geocodingProvider');
const realtorProvider = require('./providers/realtorProvider');
const openDataProvider = require('./providers/openDataProvider');

// NEW: RentCast API (50 free requests/month - has owner data!)
const rentcastProvider = require('./providers/rentcastProvider');

// NEW: Apify Real Estate API with Mortgage History
const apifyMortgageProvider = require('./providers/apifyMortgageProvider');

class PropertyService {
  constructor() {
    // Primary providers - free real data sources
    this.freeProviders = {
      zillowReal: zillowRealProvider,
      redfin: redfinProvider,
      census: censusProvider,
      realtor: realtorProvider,
      openData: openDataProvider,
      geocoding: geocodingProvider,
      rentcast: rentcastProvider,  // Has owner data!
      apify: apifyMortgageProvider  // Has mortgage history!
    };

    // Fallback providers (paid APIs or mock data)
    this.paidProviders = {
      zillow: zillowProvider,
      attom: attomProvider,
      countyRecords: countyRecordsProvider,
      nmls: nmlsProvider
    };
  }

  /**
   * Get comprehensive property data from all available sources
   * Prioritizes free real data sources
   */
  async getPropertyData(addressParams) {
    const cacheKey = this.generateCacheKey('property', addressParams);
    const cached = cacheService.get(cacheKey);

    if (cached) {
      console.log('Returning cached property data');
      return cached;
    }

    try {
      console.log('Fetching property data from multiple free sources...');

      // Fetch from all FREE providers in parallel
      const [zillowData, redfinData, censusData, realtorData] = await Promise.allSettled([
        this.freeProviders.zillowReal.getPropertyInfo(addressParams),
        this.freeProviders.redfin.getPropertyInfo(addressParams),
        this.freeProviders.census.getPropertyInfo(addressParams),
        this.freeProviders.realtor.getPropertyInfo(addressParams)
      ]);

      // Aggregate results
      const results = this.aggregatePropertyData({
        zillow: zillowData.status === 'fulfilled' ? zillowData.value : null,
        redfin: redfinData.status === 'fulfilled' ? redfinData.value : null,
        census: censusData.status === 'fulfilled' ? censusData.value : null,
        realtor: realtorData.status === 'fulfilled' ? realtorData.value : null
      });

      // If no real data found, fall back to paid/mock providers
      if (!results.basic || Object.values(results.basic).every(v => v === null)) {
        console.log('No free data found, falling back to paid providers...');
        const fallbackResults = await dataAggregator.aggregatePropertyData(addressParams, this.paidProviders);
        Object.assign(results, fallbackResults);
      }

      // Cache for 1 hour
      cacheService.set(cacheKey, results, 3600);

      return results;
    } catch (error) {
      console.error('Error fetching property data:', error);
      throw error;
    }
  }

  /**
   * Aggregate property data from multiple free sources
   */
  aggregatePropertyData(sources) {
    const result = {
      basic: null,
      details: null,
      features: null,
      taxInfo: null,
      salesHistory: null,
      neighborhood: null,
      sources: [],
      lastUpdated: new Date().toISOString()
    };

    // Track which sources provided data
    const sourceNames = {
      zillow: 'Zillow',
      redfin: 'Redfin',
      census: 'US Census',
      realtor: 'Realtor.com'
    };

    // Merge data from each source (priority: Redfin > Zillow > Realtor > Census)
    const priorityOrder = ['redfin', 'zillow', 'realtor', 'census'];

    for (const sourceKey of priorityOrder) {
      const data = sources[sourceKey];
      if (!data) continue;

      result.sources.push(sourceNames[sourceKey]);

      // Merge basic info
      if (data.basic) {
        result.basic = result.basic || {};
        for (const [key, value] of Object.entries(data.basic)) {
          if (value !== null && value !== undefined && !result.basic[key]) {
            result.basic[key] = value;
          }
        }
      }

      // Merge location data
      if (data.location) {
        result.location = result.location || {};
        for (const [key, value] of Object.entries(data.location)) {
          if (value !== null && value !== undefined && !result.location[key]) {
            result.location[key] = value;
          }
        }
      }

      // Merge details
      if (data.details) {
        result.details = result.details || {};
        for (const [key, value] of Object.entries(data.details)) {
          if (value !== null && value !== undefined && !result.details[key]) {
            result.details[key] = value;
          }
        }
      }

      // Merge tax info
      if (data.taxInfo) {
        result.taxInfo = result.taxInfo || {};
        for (const [key, value] of Object.entries(data.taxInfo)) {
          if (value !== null && value !== undefined && !result.taxInfo[key]) {
            result.taxInfo[key] = value;
          }
        }
      }

      // Merge features
      if (data.features && data.features.length > 0) {
        result.features = result.features || [];
        const existingFeatures = new Set(result.features.map(f => f.toLowerCase()));
        for (const feature of data.features) {
          if (!existingFeatures.has(feature.toLowerCase())) {
            result.features.push(feature);
            existingFeatures.add(feature.toLowerCase());
          }
        }
      }

      // Merge sales history
      if (data.salesHistory && data.salesHistory.length > 0) {
        result.salesHistory = result.salesHistory || [];
        for (const sale of data.salesHistory) {
          const exists = result.salesHistory.some(
            s => s.date === sale.date && s.price === sale.price
          );
          if (!exists) {
            result.salesHistory.push(sale);
          }
        }
      }

      // Merge neighborhood data (from census)
      if (data.neighborhood) {
        result.neighborhood = { ...result.neighborhood, ...data.neighborhood };
      }
    }

    // Sort sales history by date
    if (result.salesHistory) {
      result.salesHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    return result;
  }

  /**
   * Get property valuation estimates from FREE sources
   */
  async getPropertyValuation(addressParams) {
    const cacheKey = this.generateCacheKey('valuation', addressParams);
    const cached = cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      console.log('Fetching valuations from multiple sources...');

      // Fetch valuations and rent estimate in parallel
      const [valuations, rentEstimateResult] = await Promise.all([
        Promise.allSettled([
          this.freeProviders.zillowReal.getValuation(addressParams),
          this.freeProviders.redfin.getValuation(addressParams),
          this.freeProviders.rentcast.getValuation(addressParams),  // RentCast
          this.freeProviders.census.getValuation(addressParams),
          // Also try paid providers if configured
          this.paidProviders.attom.getValuation(addressParams),
          this.paidProviders.countyRecords.getAssessedValue(addressParams)
        ]),
        // Fetch rent estimate from RentCast
        this.freeProviders.rentcast.getRentEstimate(addressParams).catch(err => {
          console.log('Rent estimate error:', err.message);
          return null;
        })
      ]);

      const providerNames = ['Zillow', 'Redfin', 'RentCast', 'Census (Tract Median)', 'ATTOM', 'County Records'];

      const result = {
        estimates: [],
        averageValue: 0,
        confidenceScore: 'low',
        rentEstimate: null,
        lastUpdated: new Date().toISOString()
      };

      let totalValue = 0;
      let count = 0;
      let hasRealData = false;

      valuations.forEach((valuation, index) => {
        if (valuation.status === 'fulfilled' && valuation.value && valuation.value.estimatedValue) {
          const estimate = {
            source: providerNames[index],
            value: valuation.value.estimatedValue,
            range: valuation.value.range || null,
            confidence: valuation.value.confidence || 'medium',
            lastUpdated: valuation.value.lastUpdated,
            note: valuation.value.note || null
          };

          result.estimates.push(estimate);
          totalValue += valuation.value.estimatedValue;
          count++;

          // Check if we got real data (not mock)
          if (index < 2 && valuation.value.estimatedValue > 0) {
            hasRealData = true;
          }

          // Extract rent estimate from RentCast valuation if available
          if (index === 2 && valuation.value.rentEstimate) {
            result.rentEstimate = {
              monthlyRent: valuation.value.rentEstimate,
              source: 'RentCast'
            };
          }
        }
      });

      // Use dedicated rent estimate if available
      if (rentEstimateResult && rentEstimateResult.monthlyRent) {
        result.rentEstimate = {
          monthlyRent: rentEstimateResult.monthlyRent,
          rentRange: rentEstimateResult.rentRange || null,
          source: rentEstimateResult.source || 'RentCast'
        };
        console.log('Got rent estimate:', result.rentEstimate);
      }

      if (count > 0) {
        result.averageValue = Math.round(totalValue / count);
        result.confidenceScore = count >= 3 ? 'high' : count >= 2 ? 'medium' : 'low';
        result.hasRealData = hasRealData;
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
      // Try multiple sources for mortgage data
      const [attomMortgage, apifyMortgage, lienInfo, nmlsInfo] = await Promise.allSettled([
        this.paidProviders.attom.getMortgageInfo(addressParams),
        this.freeProviders.apify.getMortgageInfo(addressParams),  // Apify mortgage history
        this.paidProviders.countyRecords.getLienInfo(addressParams),
        this.paidProviders.nmls.getLenderInfo(addressParams)
      ]);

      const result = {
        mortgages: [],
        liens: lienInfo.status === 'fulfilled' ? lienInfo.value : [],
        lenderDetails: nmlsInfo.status === 'fulfilled' ? nmlsInfo.value : null,
        totalOutstanding: 0,
        sources: [],
        lastUpdated: new Date().toISOString()
      };

      // Merge mortgage data from ATTOM
      if (attomMortgage.status === 'fulfilled' && attomMortgage.value && attomMortgage.value.length > 0) {
        result.mortgages = attomMortgage.value;
        result.sources.push('ATTOM');
        console.log('Got mortgage data from ATTOM:', attomMortgage.value.length, 'records');
      }

      // If no ATTOM data, try Apify
      if (result.mortgages.length === 0 && apifyMortgage.status === 'fulfilled' && apifyMortgage.value && apifyMortgage.value.length > 0) {
        result.mortgages = apifyMortgage.value;
        result.sources.push('Apify');
        console.log('Got mortgage data from Apify:', apifyMortgage.value.length, 'records');
      }

      // Calculate total outstanding
      if (result.mortgages && result.mortgages.length > 0) {
        result.totalOutstanding = result.mortgages.reduce(
          (sum, m) => sum + (m.currentBalance || m.originalAmount || 0),
          0
        );
      }

      result.note = result.sources.length > 0
        ? `Mortgage data from: ${result.sources.join(', ')}`
        : 'Mortgage data not available - configure ATTOM or Apify API';

      cacheService.set(cacheKey, result, 1800);
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
      // Try multiple sources for owner data
      const [attomOwner, countyOwner, rentcastOwner] = await Promise.allSettled([
        this.paidProviders.attom.getOwnerInfo(addressParams),
        this.paidProviders.countyRecords.getOwnerInfo(addressParams),
        this.freeProviders.rentcast.getOwnerInfo(addressParams)  // NEW: RentCast has owner data!
      ]);

      // Merge owner data from all sources
      let result = dataAggregator.mergeOwnerData(
        attomOwner.status === 'fulfilled' ? attomOwner.value : null,
        countyOwner.status === 'fulfilled' ? countyOwner.value : null
      );

      // If no owner data yet, try RentCast result
      if (!result.current && rentcastOwner.status === 'fulfilled' && rentcastOwner.value) {
        console.log('Using RentCast owner data');
        result.current = rentcastOwner.value;
        result.source = 'RentCast';
      }

      // Track which sources provided data
      const sources = [];
      if (attomOwner.status === 'fulfilled' && attomOwner.value?.name) sources.push('ATTOM');
      if (countyOwner.status === 'fulfilled' && countyOwner.value?.name) sources.push('County Records');
      if (rentcastOwner.status === 'fulfilled' && rentcastOwner.value?.name) sources.push('RentCast');

      result.sources = sources;
      result.note = sources.length > 0
        ? `Owner data from: ${sources.join(', ')}`
        : 'Owner data not available - try configuring ATTOM or RentCast API';

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
      console.log(`Generating comprehensive report for: ${addressParams.address}, ${addressParams.city}, ${addressParams.state}`);

      // Fetch all data in parallel
      const [propertyData, valuation, mortgage, owner] = await Promise.all([
        this.getPropertyData(addressParams),
        this.getPropertyValuation(addressParams),
        this.getMortgageData(addressParams),
        this.getOwnerData(addressParams)
      ]);

      // Cross-reference: Fill in purchase price from sales history if missing
      if (owner?.current && !owner.current.purchasePrice && propertyData?.salesHistory?.length > 0) {
        const ownerPurchaseDate = owner.current.purchaseDate;
        if (ownerPurchaseDate) {
          // Find matching sale by date
          const matchingSale = propertyData.salesHistory.find(sale => {
            if (!sale.date) return false;
            const saleDate = new Date(sale.date).toDateString();
            const purchaseDate = new Date(ownerPurchaseDate).toDateString();
            return saleDate === purchaseDate;
          });
          if (matchingSale?.price) {
            owner.current.purchasePrice = matchingSale.price;
            console.log('Filled purchase price from sales history:', matchingSale.price);
          }
        }
        // If no date match, use most recent sale that could be the purchase
        if (!owner.current.purchasePrice && propertyData.salesHistory.length > 0) {
          const latestSale = propertyData.salesHistory[0];
          if (latestSale?.price && latestSale?.event?.toLowerCase().includes('sold')) {
            owner.current.purchasePrice = latestSale.price;
            console.log('Filled purchase price from latest sale:', latestSale.price);
          }
        }
      }

      // Aggregate all unique data sources for display
      const allSources = new Set();

      // Add property data sources
      if (propertyData?.sources) {
        propertyData.sources.forEach(s => allSources.add(s));
      }

      // Add valuation sources
      if (valuation?.estimates) {
        valuation.estimates.forEach(e => {
          if (e.source) allSources.add(e.source);
        });
      }

      // Add mortgage data sources
      if (mortgage?.sources) {
        mortgage.sources.forEach(s => allSources.add(s));
      }

      // Add owner data sources
      if (owner?.sources) {
        owner.sources.forEach(s => allSources.add(s));
      }

      // Update property sources with all aggregated sources
      if (propertyData) {
        propertyData.sources = Array.from(allSources);
      }

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
    if (!this.paidProviders[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    return this.paidProviders[provider].getPropertyById(propertyId);
  }

  /**
   * Get address autocomplete suggestions from multiple free sources
   */
  async getAddressSuggestions(query) {
    try {
      // Try multiple sources in parallel
      const [zillowSuggestions, redfinSuggestions, geocodingSuggestions] = await Promise.allSettled([
        this.freeProviders.zillowReal.getAddressSuggestions(query),
        this.freeProviders.redfin.getAddressSuggestions(query),
        this.freeProviders.geocoding.getAddressSuggestions(query)
      ]);

      // Merge and deduplicate suggestions
      const allSuggestions = [];
      const seen = new Set();

      const addSuggestions = (result) => {
        if (result.status === 'fulfilled' && result.value) {
          for (const suggestion of result.value) {
            const key = `${suggestion.address}-${suggestion.zip}`.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              allSuggestions.push(suggestion);
            }
          }
        }
      };

      // Prioritize Zillow suggestions
      addSuggestions(zillowSuggestions);
      addSuggestions(redfinSuggestions);
      addSuggestions(geocodingSuggestions);

      return allSuggestions.slice(0, 10);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      return [];
    }
  }

  /**
   * Get neighborhood data from Census
   */
  async getNeighborhoodData(addressParams) {
    try {
      const censusData = await this.freeProviders.census.getPropertyInfo(addressParams);
      return censusData?.neighborhood || null;
    } catch (error) {
      console.error('Error fetching neighborhood data:', error);
      return null;
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
