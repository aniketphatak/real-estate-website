const axios = require('axios');

/**
 * ATTOM Data Provider
 * Provides comprehensive property data including mortgage, ownership, and valuation
 */

class AttomProvider {
  constructor() {
    this.apiKey = process.env.ATTOM_API_KEY;
    this.baseUrl = 'https://api.gateway.attomdata.com/propertyapi/v1.0.0';
    this.headers = {
      'apikey': this.apiKey,
      'Accept': 'application/json'
    };
  }

  /**
   * Check if provider is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Get property information by address
   */
  async getPropertyInfo(addressParams) {
    if (!this.isConfigured()) {
      console.log('ATTOM provider not configured, returning mock data');
      return this.getMockPropertyInfo(addressParams);
    }

    try {
      const { address, city, state, zip } = addressParams;

      const response = await axios.get(`${this.baseUrl}/property/basicprofile`, {
        headers: this.headers,
        params: {
          address1: address,
          address2: `${city}, ${state} ${zip}`
        }
      });

      return this.normalizePropertyData(response.data);
    } catch (error) {
      console.error('ATTOM property info error:', error.message);
      return this.getMockPropertyInfo(addressParams);
    }
  }

  /**
   * Get property valuation
   */
  async getValuation(addressParams) {
    if (!this.isConfigured()) {
      return this.getMockValuation(addressParams);
    }

    try {
      const { address, city, state, zip } = addressParams;

      const response = await axios.get(`${this.baseUrl}/valuation/homeequity`, {
        headers: this.headers,
        params: {
          address1: address,
          address2: `${city}, ${state} ${zip}`
        }
      });

      if (response.data && response.data.property && response.data.property.length > 0) {
        const prop = response.data.property[0];
        const avm = prop.avm || {};

        return {
          estimatedValue: avm.amount?.value || null,
          range: {
            low: avm.amount?.low || null,
            high: avm.amount?.high || null
          },
          confidence: avm.fsd ? (avm.fsd < 10 ? 'high' : avm.fsd < 20 ? 'medium' : 'low') : 'medium',
          lastUpdated: avm.date || new Date().toISOString()
        };
      }

      return this.getMockValuation(addressParams);
    } catch (error) {
      console.error('ATTOM valuation error:', error.message);
      return this.getMockValuation(addressParams);
    }
  }

  /**
   * Get mortgage information
   */
  async getMortgageInfo(addressParams) {
    if (!this.isConfigured()) {
      return this.getMockMortgageInfo(addressParams);
    }

    try {
      const { address, city, state, zip } = addressParams;

      const response = await axios.get(`${this.baseUrl}/property/detailmortgage`, {
        headers: this.headers,
        params: {
          address1: address,
          address2: `${city}, ${state} ${zip}`
        }
      });

      if (response.data && response.data.property && response.data.property.length > 0) {
        const mortgages = response.data.property[0].mortgage || [];

        return mortgages.map(m => ({
          lender: m.lender?.companyName || 'Unknown',
          originalAmount: m.amount || null,
          currentBalance: m.currentBalance || null,
          interestRate: m.interestRate || null,
          interestRateType: m.interestRateType || 'Fixed',
          loanType: m.loanType || 'Conventional',
          term: m.term || null,
          recordingDate: m.recordingDate || null,
          maturityDate: m.maturityDate || null,
          position: m.position || 1
        }));
      }

      return this.getMockMortgageInfo(addressParams);
    } catch (error) {
      console.error('ATTOM mortgage error:', error.message);
      return this.getMockMortgageInfo(addressParams);
    }
  }

  /**
   * Get owner information
   */
  async getOwnerInfo(addressParams) {
    if (!this.isConfigured()) {
      return this.getMockOwnerInfo(addressParams);
    }

    try {
      const { address, city, state, zip } = addressParams;

      const response = await axios.get(`${this.baseUrl}/property/detailowner`, {
        headers: this.headers,
        params: {
          address1: address,
          address2: `${city}, ${state} ${zip}`
        }
      });

      if (response.data && response.data.property && response.data.property.length > 0) {
        const owner = response.data.property[0].owner || {};

        return {
          name: owner.name1 || owner.corporateName || 'Unknown',
          mailingAddress: owner.mailingAddress ? {
            street: owner.mailingAddress.address1,
            city: owner.mailingAddress.city,
            state: owner.mailingAddress.state,
            zip: owner.mailingAddress.zip
          } : null,
          ownerType: owner.type || 'Individual',
          ownerOccupied: owner.occupancyType === 'Owner Occupied',
          purchaseDate: owner.lastSaleDate || null,
          purchasePrice: owner.lastSalePrice || null
        };
      }

      return this.getMockOwnerInfo(addressParams);
    } catch (error) {
      console.error('ATTOM owner error:', error.message);
      return this.getMockOwnerInfo(addressParams);
    }
  }

  /**
   * Get property by ID
   */
  async getPropertyById(propertyId) {
    if (!this.isConfigured()) {
      return this.getMockPropertyInfo({});
    }

    try {
      const response = await axios.get(`${this.baseUrl}/property/detail`, {
        headers: this.headers,
        params: { attomid: propertyId }
      });

      return this.normalizePropertyData(response.data);
    } catch (error) {
      console.error('ATTOM property by ID error:', error.message);
      return this.getMockPropertyInfo({});
    }
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

    return {
      basic: {
        propertyType: prop.propertyType || building.summary?.propClass,
        yearBuilt: building.summary?.yearBuilt,
        bedrooms: building.rooms?.beds,
        bathrooms: building.rooms?.bathsTotal,
        squareFeet: building.size?.livingSize || building.size?.grossSize,
        lotSize: lot.lotSize1 || lot.lotSize2,
        stories: building.summary?.stories,
        parking: building.parking?.prkgSize,
        pool: building.interior?.fplcCount > 0,
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
        price: prop.sale.saleAmountData?.saleAmt,
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
    if (building.pool) {
      features.push('Swimming Pool');
    }

    return features;
  }

  /**
   * Mock data for development/demo
   */
  getMockPropertyInfo(addressParams) {
    return {
      basic: {
        propertyType: 'Single Family Residence',
        yearBuilt: 2008,
        bedrooms: 4,
        bathrooms: 3,
        squareFeet: 2650,
        lotSize: 9200,
        stories: 2,
        parking: 3,
        pool: true,
        apn: '456-789-012',
        zoning: 'R-1'
      },
      details: {
        construction: 'Frame',
        roofType: 'Tile',
        heating: 'Central',
        cooling: 'Central Air',
        foundation: 'Slab'
      },
      features: [
        'Central Air Conditioning',
        'Central Heating',
        '1 Fireplace(s)',
        '3 Car Garage',
        'Swimming Pool'
      ],
      taxInfo: {
        assessedValue: 485000,
        taxAmount: 5875,
        taxYear: 2024
      },
      salesHistory: [
        { date: '2018-09-22', price: 520000, event: 'Sold' }
      ]
    };
  }

  getMockValuation(addressParams) {
    const baseValue = 575000;
    const variance = Math.floor(Math.random() * 40000) - 20000;

    return {
      estimatedValue: baseValue + variance,
      range: {
        low: baseValue - 45000,
        high: baseValue + 50000
      },
      confidence: 'high',
      lastUpdated: new Date().toISOString()
    };
  }

  getMockMortgageInfo(addressParams) {
    return [
      {
        lender: 'Wells Fargo Home Mortgage',
        originalAmount: 420000,
        currentBalance: 385000,
        interestRate: 3.75,
        interestRateType: 'Fixed',
        loanType: 'Conventional',
        term: 30,
        recordingDate: '2018-09-22',
        maturityDate: '2048-09-22',
        position: 1
      }
    ];
  }

  getMockOwnerInfo(addressParams) {
    return {
      name: 'John & Jane Smith',
      mailingAddress: {
        street: addressParams.address || '123 Main St',
        city: addressParams.city || 'Los Angeles',
        state: addressParams.state || 'CA',
        zip: addressParams.zip || '90001'
      },
      ownerType: 'Individual',
      ownerOccupied: true,
      purchaseDate: '2018-09-22',
      purchasePrice: 520000
    };
  }
}

module.exports = new AttomProvider();
