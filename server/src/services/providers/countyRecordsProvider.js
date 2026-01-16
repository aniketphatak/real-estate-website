const axios = require('axios');

/**
 * County Records Provider
 * Aggregates data from county assessor and recorder offices
 * In production, this would connect to various county APIs or data aggregators
 */

class CountyRecordsProvider {
  constructor() {
    this.apiKey = process.env.COUNTY_RECORDS_API_KEY;
    // This would typically be a service that aggregates multiple county APIs
    this.baseUrl = process.env.COUNTY_RECORDS_API_URL || 'https://api.countyrecords.example.com';
  }

  /**
   * Check if provider is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Get property information from county records
   */
  async getPropertyInfo(addressParams) {
    if (!this.isConfigured()) {
      console.log('County Records provider not configured, returning mock data');
      return this.getMockPropertyInfo(addressParams);
    }

    try {
      const { address, city, state, zip } = addressParams;

      const response = await axios.get(`${this.baseUrl}/property/search`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: {
          street: address,
          city,
          state,
          zip
        }
      });

      return this.normalizePropertyData(response.data);
    } catch (error) {
      console.error('County Records API error:', error.message);
      return this.getMockPropertyInfo(addressParams);
    }
  }

  /**
   * Get assessed value from county assessor
   */
  async getAssessedValue(addressParams) {
    if (!this.isConfigured()) {
      return this.getMockAssessedValue(addressParams);
    }

    try {
      const { address, city, state, zip } = addressParams;

      const response = await axios.get(`${this.baseUrl}/assessment/value`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: {
          street: address,
          city,
          state,
          zip
        }
      });

      const data = response.data;
      return {
        estimatedValue: data.marketValue || data.assessedValue,
        range: null,
        confidence: 'medium',
        lastUpdated: data.assessmentDate || new Date().toISOString(),
        assessedValue: data.assessedValue,
        landValue: data.landValue,
        improvementValue: data.improvementValue
      };
    } catch (error) {
      console.error('County assessment error:', error.message);
      return this.getMockAssessedValue(addressParams);
    }
  }

  /**
   * Get lien information from county recorder
   */
  async getLienInfo(addressParams) {
    if (!this.isConfigured()) {
      return this.getMockLienInfo(addressParams);
    }

    try {
      const { address, city, state, zip } = addressParams;

      const response = await axios.get(`${this.baseUrl}/recorder/liens`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: {
          street: address,
          city,
          state,
          zip
        }
      });

      return response.data.liens || [];
    } catch (error) {
      console.error('County lien error:', error.message);
      return this.getMockLienInfo(addressParams);
    }
  }

  /**
   * Get owner information from county records
   */
  async getOwnerInfo(addressParams) {
    if (!this.isConfigured()) {
      return this.getMockOwnerInfo(addressParams);
    }

    try {
      const { address, city, state, zip } = addressParams;

      const response = await axios.get(`${this.baseUrl}/property/owner`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: {
          street: address,
          city,
          state,
          zip
        }
      });

      const data = response.data;
      return {
        name: data.ownerName,
        mailingAddress: data.mailingAddress,
        ownerType: data.ownerType,
        ownerOccupied: data.ownerOccupied,
        purchaseDate: data.recordedDate,
        purchasePrice: data.salePrice,
        history: data.ownershipHistory || []
      };
    } catch (error) {
      console.error('County owner error:', error.message);
      return this.getMockOwnerInfo(addressParams);
    }
  }

  /**
   * Get tax information
   */
  async getTaxInfo(addressParams) {
    if (!this.isConfigured()) {
      return this.getMockTaxInfo(addressParams);
    }

    try {
      const { address, city, state, zip } = addressParams;

      const response = await axios.get(`${this.baseUrl}/tax/info`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: {
          street: address,
          city,
          state,
          zip
        }
      });

      return response.data;
    } catch (error) {
      console.error('County tax error:', error.message);
      return this.getMockTaxInfo(addressParams);
    }
  }

  /**
   * Normalize county data to standard format
   */
  normalizePropertyData(data) {
    if (!data) return null;

    return {
      basic: {
        propertyType: data.propertyType || data.useCode,
        yearBuilt: data.yearBuilt,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFeet: data.buildingSquareFeet || data.livingArea,
        lotSize: data.lotSquareFeet || data.lotAcres * 43560,
        stories: data.stories,
        apn: data.apn || data.parcelNumber,
        zoning: data.zoning
      },
      details: {
        construction: data.constructionType,
        roofType: data.roofing,
        heating: data.heating,
        cooling: data.cooling,
        foundation: data.foundation
      },
      taxInfo: {
        assessedValue: data.assessedValue,
        taxAmount: data.taxAmount,
        taxYear: data.taxYear,
        exemptions: data.exemptions || []
      },
      salesHistory: data.salesHistory || []
    };
  }

  /**
   * Mock data for development/demo
   */
  getMockPropertyInfo(addressParams) {
    return {
      basic: {
        propertyType: 'Single Family Dwelling',
        yearBuilt: 2005,
        bedrooms: 4,
        bathrooms: 2.5,
        squareFeet: 2400,
        lotSize: 8750,
        stories: 2,
        apn: '789-012-345',
        zoning: 'R-1 Residential'
      },
      details: {
        construction: 'Wood Frame/Stucco',
        roofType: 'Composition',
        heating: 'Forced Air Gas',
        cooling: 'Central Air',
        foundation: 'Concrete Slab'
      },
      taxInfo: {
        assessedValue: 468000,
        taxAmount: 5616,
        taxYear: 2024,
        exemptions: ['Homeowner Exemption - $7,000']
      },
      salesHistory: [
        { date: '2019-06-15', price: 485000, event: 'Sold', documentNumber: 'DOC-2019-123456' },
        { date: '2012-03-20', price: 375000, event: 'Sold', documentNumber: 'DOC-2012-789012' }
      ]
    };
  }

  getMockAssessedValue(addressParams) {
    return {
      estimatedValue: 535000,
      range: null,
      confidence: 'medium',
      lastUpdated: '2024-01-15',
      assessedValue: 468000,
      landValue: 175000,
      improvementValue: 293000
    };
  }

  getMockLienInfo(addressParams) {
    return [
      {
        type: 'Deed of Trust',
        amount: 420000,
        lender: 'Wells Fargo Bank N.A.',
        recordedDate: '2019-06-15',
        documentNumber: 'DOC-2019-654321',
        status: 'Active'
      }
    ];
  }

  getMockOwnerInfo(addressParams) {
    return {
      name: 'Smith, John & Jane',
      mailingAddress: {
        street: addressParams.address || '123 Main St',
        city: addressParams.city || 'Los Angeles',
        state: addressParams.state || 'CA',
        zip: addressParams.zip || '90001'
      },
      ownerType: 'Individual',
      ownerOccupied: true,
      purchaseDate: '2019-06-15',
      purchasePrice: 485000,
      history: [
        {
          name: 'Smith, John & Jane',
          purchaseDate: '2019-06-15',
          purchasePrice: 485000
        },
        {
          name: 'Johnson, Robert',
          purchaseDate: '2012-03-20',
          purchasePrice: 375000
        },
        {
          name: 'ABC Development LLC',
          purchaseDate: '2005-08-10',
          purchasePrice: 320000
        }
      ]
    };
  }

  getMockTaxInfo(addressParams) {
    return {
      assessedValue: 468000,
      landValue: 175000,
      improvementValue: 293000,
      taxYear: 2024,
      taxAmount: 5616,
      taxRate: 1.2,
      exemptions: [
        { type: 'Homeowner', amount: 7000 }
      ],
      paymentStatus: 'Paid',
      nextDueDate: '2025-04-10'
    };
  }
}

module.exports = new CountyRecordsProvider();
