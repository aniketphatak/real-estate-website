const axios = require('axios');

/**
 * Apify Real Estate API with Mortgage History Provider
 * Actor: scrap3r/real-estate-api-with-mortgage-history
 * Provides: property details, sales history, tax assessments, mortgage information
 * API Docs: https://docs.apify.com/api
 *
 * Note: Apify uses a pay-per-event model with free trial available
 */

class ApifyMortgageProvider {
  constructor() {
    this.apiToken = process.env.APIFY_API_TOKEN;
    this.actorId = 'scrap3r/real-estate-api-with-mortgage-history';
    this.baseUrl = 'https://api.apify.com/v2';
  }

  /**
   * Check if provider is configured
   */
  isConfigured() {
    return !!this.apiToken && this.apiToken.length > 10;
  }

  /**
   * Run the Apify Actor and get results
   */
  async runActor(input) {
    if (!this.isConfigured()) {
      console.log('Apify API not configured');
      return null;
    }

    try {
      console.log('Running Apify mortgage actor with input:', input);

      // Run the actor synchronously (waits for completion up to 5 min)
      const response = await axios.post(
        `${this.baseUrl}/acts/${this.actorId}/run-sync-get-dataset-items`,
        input,
        {
          params: { token: this.apiToken },
          headers: { 'Content-Type': 'application/json' },
          timeout: 120000 // 2 minute timeout
        }
      );

      if (response.data && response.data.length > 0) {
        console.log('Apify actor returned', response.data.length, 'results');
        return response.data;
      }

      return null;
    } catch (error) {
      if (error.response) {
        console.error(`Apify API Error ${error.response.status}:`, error.response.data);
        if (error.response.status === 402) {
          console.error('Apify: Insufficient credits - add credits to your account');
        }
      } else {
        console.error('Apify API Error:', error.message);
      }
      return null;
    }
  }

  /**
   * Get property info including mortgage data
   */
  async getPropertyInfo(addressParams) {
    const { address, city, state, zip } = addressParams;
    const fullAddress = `${address}, ${city}, ${state} ${zip}`;

    // Actor expects 'addresses' as an array
    const results = await this.runActor({
      addresses: [fullAddress]
    });

    if (results && results.length > 0) {
      return this.normalizePropertyData(results[0]);
    }

    return null;
  }

  /**
   * Get mortgage information for a property
   */
  async getMortgageInfo(addressParams) {
    const { address, city, state, zip } = addressParams;
    const fullAddress = `${address}, ${city}, ${state} ${zip}`;

    // Actor expects 'addresses' as an array
    const results = await this.runActor({
      addresses: [fullAddress]
    });

    if (results && results.length > 0) {
      const data = results[0];
      return this.extractMortgageData(data);
    }

    return [];
  }

  /**
   * Get sales history
   */
  async getSalesHistory(addressParams) {
    const { address, city, state, zip } = addressParams;
    const fullAddress = `${address}, ${city}, ${state} ${zip}`;

    // Actor expects 'addresses' as an array
    const results = await this.runActor({
      addresses: [fullAddress]
    });

    if (results && results.length > 0) {
      const data = results[0];
      return this.extractSalesHistory(data);
    }

    return [];
  }

  /**
   * Extract mortgage data from API response
   */
  extractMortgageData(data) {
    const mortgages = [];

    // Try different possible data structures
    const mortgageData = data.mortgages || data.mortgageHistory || data.loans || data.mortgage || [];

    if (Array.isArray(mortgageData)) {
      mortgageData.forEach((m, index) => {
        mortgages.push({
          lender: m.lender || m.lenderName || m.bank || 'Unknown Lender',
          originalAmount: m.amount || m.loanAmount || m.originalAmount || m.originalLoanAmount || null,
          currentBalance: m.currentBalance || m.balance || null,
          interestRate: m.interestRate || m.rate || null,
          interestRateType: m.interestRateType || m.rateType || 'Fixed',
          loanType: m.loanType || m.type || m.purpose || 'Conventional',
          term: m.term || m.loanTerm || null,
          recordingDate: m.recordingDate || m.date || m.recordedDate || null,
          maturityDate: m.maturityDate || m.dueDate || null,
          position: m.position || m.lienPosition || index + 1
        });
      });
    } else if (typeof mortgageData === 'object' && mortgageData !== null) {
      // Single mortgage object
      mortgages.push({
        lender: mortgageData.lender || mortgageData.lenderName || 'Unknown Lender',
        originalAmount: mortgageData.amount || mortgageData.loanAmount || null,
        currentBalance: mortgageData.currentBalance || null,
        interestRate: mortgageData.interestRate || null,
        interestRateType: mortgageData.interestRateType || 'Fixed',
        loanType: mortgageData.loanType || 'Conventional',
        term: mortgageData.term || null,
        recordingDate: mortgageData.recordingDate || null,
        maturityDate: mortgageData.maturityDate || null,
        position: 1
      });
    }

    // Filter out mortgages with no useful data
    return mortgages.filter(m => m.originalAmount || m.lender !== 'Unknown Lender');
  }

  /**
   * Extract sales history from API response
   */
  extractSalesHistory(data) {
    const history = [];

    const salesData = data.salesHistory || data.priceHistory || data.history || data.sales || [];

    if (Array.isArray(salesData)) {
      salesData.forEach(sale => {
        if (sale.price || sale.amount || sale.salePrice) {
          history.push({
            date: sale.date || sale.saleDate || sale.closingDate || null,
            price: sale.price || sale.amount || sale.salePrice,
            event: sale.event || sale.type || 'Sold'
          });
        }
      });
    }

    // Sort by date descending
    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    return history;
  }

  /**
   * Normalize property data
   */
  normalizePropertyData(data) {
    return {
      basic: {
        propertyType: data.propertyType || data.type,
        yearBuilt: data.yearBuilt,
        bedrooms: data.bedrooms || data.beds,
        bathrooms: data.bathrooms || data.baths,
        squareFeet: data.squareFootage || data.sqft || data.livingArea,
        lotSize: data.lotSize,
        stories: data.stories,
        parking: data.parking || data.garageSpaces
      },
      valuation: {
        estimatedValue: data.estimatedValue || data.price || data.value,
        assessedValue: data.assessedValue || data.taxAssessedValue
      },
      taxInfo: {
        assessedValue: data.taxAssessedValue || data.assessedValue,
        taxAmount: data.taxAmount || data.annualTax,
        taxYear: data.taxYear
      },
      mortgages: this.extractMortgageData(data),
      salesHistory: this.extractSalesHistory(data),
      source: 'Apify'
    };
  }
}

module.exports = new ApifyMortgageProvider();
