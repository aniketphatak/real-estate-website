const axios = require('axios');

/**
 * ATTOM Data Provider
 * Provides comprehensive property data including mortgage, ownership, and valuation
 * API Documentation: https://api.gateway.attomdata.com/propertyapi/v1.0.0
 */

class AttomProvider {
  constructor() {
    this.apiKey = process.env.ATTOM_API_KEY;
    this.baseUrl = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';
  }

  /**
   * Get headers for API requests
   */
  getHeaders() {
    return {
      'apikey': this.apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Check if provider is configured
   */
  isConfigured() {
    const configured = !!this.apiKey && this.apiKey.length > 10;
    if (!configured) {
      console.log('ATTOM API key not configured or invalid');
    }
    return configured;
  }

  /**
   * Make API request with error handling
   */
  async makeRequest(endpoint, params) {
    try {
      console.log(`ATTOM API Request: ${endpoint}`, params);

      const response = await axios.get(`${this.baseUrl}${endpoint}`, {
        headers: this.getHeaders(),
        params: params,
        timeout: 15000
      });

      console.log(`ATTOM API Response status: ${response.status}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error(`ATTOM API Error ${error.response.status}:`, error.response.data);

        // If 401/403, API key might be invalid
        if (error.response.status === 401 || error.response.status === 403) {
          console.error('ATTOM API: Authentication failed. Check your API key.');
        }
        // If 404, endpoint might not exist or property not found
        if (error.response.status === 404) {
          console.error('ATTOM API: Property not found or endpoint invalid');
        }
      } else {
        console.error('ATTOM API Error:', error.message);
      }
      return null;
    }
  }

  /**
   * Get property information by address
   */
  async getPropertyInfo(addressParams) {
    if (!this.isConfigured()) {
      return this.getMockPropertyInfo(addressParams);
    }

    const { address, city, state, zip } = addressParams;

    const data = await this.makeRequest('/property/basicprofile', {
      address1: address,
      address2: `${city}, ${state} ${zip}`
    });

    if (data && data.property && data.property.length > 0) {
      console.log('ATTOM: Got real property data');
      return this.normalizePropertyData(data);
    }

    console.log('ATTOM: No property data found, using mock');
    return this.getMockPropertyInfo(addressParams);
  }

  /**
   * Get property valuation (AVM)
   */
  async getValuation(addressParams) {
    if (!this.isConfigured()) {
      return this.getMockValuation(addressParams);
    }

    const { address, city, state, zip } = addressParams;

    // Try AVM endpoint first
    let data = await this.makeRequest('/attomavm/detail', {
      address1: address,
      address2: `${city}, ${state} ${zip}`
    });

    // Fallback to assessment endpoint
    if (!data || !data.property) {
      data = await this.makeRequest('/assessment/detail', {
        address1: address,
        address2: `${city}, ${state} ${zip}`
      });
    }

    if (data && data.property && data.property.length > 0) {
      const prop = data.property[0];
      const avm = prop.avm || prop.assessment || {};

      const estimatedValue = avm.amount?.value ||
                            avm.assessed?.assdTtlValue ||
                            prop.assessment?.market?.mktTtlValue;

      if (estimatedValue) {
        console.log('ATTOM: Got real valuation:', estimatedValue);
        return {
          estimatedValue: estimatedValue,
          range: {
            low: avm.amount?.low || Math.round(estimatedValue * 0.9),
            high: avm.amount?.high || Math.round(estimatedValue * 1.1)
          },
          confidence: avm.fsd ? (avm.fsd < 10 ? 'high' : avm.fsd < 20 ? 'medium' : 'low') : 'medium',
          lastUpdated: avm.eventDate || new Date().toISOString(),
          source: 'ATTOM AVM'
        };
      }
    }

    console.log('ATTOM: No valuation data found, using mock');
    return this.getMockValuation(addressParams);
  }

  /**
   * Get mortgage information
   */
  async getMortgageInfo(addressParams) {
    if (!this.isConfigured()) {
      return this.getMockMortgageInfo(addressParams);
    }

    const { address, city, state, zip } = addressParams;

    const data = await this.makeRequest('/property/detailmortgage', {
      address1: address,
      address2: `${city}, ${state} ${zip}`
    });

    if (data && data.property && data.property.length > 0) {
      const prop = data.property[0];
      const mortgageData = prop.mortgage || [];

      if (mortgageData.length > 0) {
        console.log('ATTOM: Got real mortgage data');
        return mortgageData.map(m => ({
          lender: m.lender?.companyName || m.lenderName || 'Unknown Lender',
          originalAmount: m.amount || m.loanAmount || null,
          currentBalance: m.currentBalance || null,
          interestRate: m.interestRate || null,
          interestRateType: m.interestRateType || 'Fixed',
          loanType: m.loanType || m.loanPurpose || 'Conventional',
          term: m.term || m.loanTermMonths / 12 || null,
          recordingDate: m.recordingDate || m.documentDate || null,
          maturityDate: m.maturityDate || null,
          position: m.mortgageSequence || m.position || 1
        }));
      }
    }

    console.log('ATTOM: No mortgage data found, using mock');
    return this.getMockMortgageInfo(addressParams);
  }

  /**
   * Get owner information
   */
  async getOwnerInfo(addressParams) {
    if (!this.isConfigured()) {
      return this.getMockOwnerInfo(addressParams);
    }

    const { address, city, state, zip } = addressParams;

    // Try detail with owner info
    const data = await this.makeRequest('/property/detail', {
      address1: address,
      address2: `${city}, ${state} ${zip}`
    });

    if (data && data.property && data.property.length > 0) {
      const prop = data.property[0];

      // Owner info might be in different places depending on the endpoint
      const owner = prop.assessment?.owner || prop.owner || {};
      const sale = prop.sale || prop.assessment?.sale || {};

      const ownerName = owner.owner1?.fullName ||
                       owner.corporateOwner ||
                       owner.owner1Last && owner.owner1First ?
                         `${owner.owner1First} ${owner.owner1Last}` : null;

      if (ownerName) {
        console.log('ATTOM: Got real owner data:', ownerName);
        return {
          name: ownerName,
          mailingAddress: owner.mailingAddressFull ? {
            street: owner.mailingAddressOneLine || owner.mailingAddressFull,
            city: owner.mailingAddressCity,
            state: owner.mailingAddressState,
            zip: owner.mailingAddressZip
          } : {
            street: address,
            city: city,
            state: state,
            zip: zip
          },
          ownerType: owner.corporateOwner ? 'Corporation' : 'Individual',
          ownerOccupied: owner.absenteeOwnerStatus === 'O' || owner.ownerOccupied === 'Y',
          purchaseDate: sale.saleTransDate || sale.recordingDate || null,
          purchasePrice: sale.saleAmountData?.saleAmt || sale.amount || null
        };
      }
    }

    console.log('ATTOM: No owner data found, using mock');
    return this.getMockOwnerInfo(addressParams);
  }

  /**
   * Get property by ID
   */
  async getPropertyById(propertyId) {
    if (!this.isConfigured()) {
      return this.getMockPropertyInfo({});
    }

    const data = await this.makeRequest('/property/detail', {
      attomid: propertyId
    });

    if (data) {
      return this.normalizePropertyData(data);
    }

    return this.getMockPropertyInfo({});
  }

  /**
   * Normalize API response to standard format
   */
  normalizePropertyData(data) {
    if (!data || !data.property || data.property.length === 0) {
      return null;
    }

    const prop = data.property[0];
    const building = prop.building || {};
    const lot = prop.lot || {};
    const summary = prop.summary || building.summary || {};

    return {
      basic: {
        propertyType: summary.propType || summary.propClass || prop.propertyType,
        yearBuilt: summary.yearBuilt || building.summary?.yearBuilt,
        bedrooms: summary.beds || building.rooms?.beds,
        bathrooms: summary.baths || building.rooms?.bathsTotal,
        squareFeet: summary.sqft || building.size?.livingSize || building.size?.grossSize,
        lotSize: lot.lotSize1 || lot.lotSize2 || summary.lotSize,
        stories: summary.stories || building.summary?.stories,
        parking: building.parking?.prkgSize,
        pool: building.interior?.poolInd === 'Y',
        apn: prop.identifier?.apn,
        zoning: lot.zoning
      },
      details: {
        construction: building.construction?.constructionType,
        roofType: building.construction?.roofType,
        heating: building.interior?.heatingType,
        cooling: building.interior?.coolingType,
        foundation: building.construction?.foundationType
      },
      features: this.extractFeatures(building),
      taxInfo: prop.assessment ? {
        assessedValue: prop.assessment.assessed?.assdTtlValue,
        taxAmount: prop.assessment.tax?.taxAmt,
        taxYear: prop.assessment.tax?.taxYear
      } : null,
      salesHistory: prop.sale ? [{
        date: prop.sale.saleTransDate,
        price: prop.sale.saleAmountData?.saleAmt || prop.sale.amount,
        event: 'Sold'
      }] : []
    };
  }

  /**
   * Extract features from building data
   */
  extractFeatures(building) {
    const features = [];

    if (building.interior?.coolingType) {
      features.push(`${building.interior.coolingType} Cooling`);
    }
    if (building.interior?.heatingType) {
      features.push(`${building.interior.heatingType} Heating`);
    }
    if (building.interior?.fplcCount > 0) {
      features.push(`${building.interior.fplcCount} Fireplace(s)`);
    }
    if (building.parking?.prkgSize) {
      features.push(`${building.parking.prkgSize} Car Garage`);
    }
    if (building.interior?.poolInd === 'Y') {
      features.push('Swimming Pool');
    }

    return features;
  }

  /**
   * Mock data for development/demo (shown when API fails or is not configured)
   */
  getMockPropertyInfo(addressParams) {
    return {
      basic: {
        propertyType: 'Single Family Residence',
        yearBuilt: null,
        bedrooms: null,
        bathrooms: null,
        squareFeet: null,
        lotSize: null,
        stories: null,
        parking: null,
        pool: null,
        apn: null,
        zoning: null
      },
      details: {},
      features: [],
      taxInfo: null,
      salesHistory: [],
      _isMockData: true,
      _note: 'Real data unavailable - ATTOM API not configured or property not found'
    };
  }

  getMockValuation(addressParams) {
    return {
      estimatedValue: null,
      range: null,
      confidence: 'low',
      lastUpdated: new Date().toISOString(),
      source: 'ATTOM (No Data)',
      _isMockData: true
    };
  }

  getMockMortgageInfo(addressParams) {
    return [];
  }

  getMockOwnerInfo(addressParams) {
    return {
      name: null,
      mailingAddress: null,
      ownerType: null,
      ownerOccupied: null,
      purchaseDate: null,
      purchasePrice: null,
      _isMockData: true,
      _note: 'Owner data requires ATTOM API subscription'
    };
  }
}

module.exports = new AttomProvider();
