const axios = require('axios');

/**
 * County Records Provider
 * Aggregates data from county assessor and recorder offices
 * In production, this would connect to various county APIs or data aggregators
 */

class CountyRecordsProvider {
  constructor() {
    this.apiKey = process.env.COUNTY_RECORDS_API_KEY;
    this.baseUrl = process.env.COUNTY_RECORDS_API_URL || 'https://api.countyrecords.example.com';
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async getPropertyInfo(addressParams) {
    if (!this.isConfigured()) {
      console.log('County Records provider not configured');
      return null;
    }

    try {
      const { address, city, state, zip } = addressParams;
      const response = await axios.get(`${this.baseUrl}/property/search`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: { street: address, city, state, zip }
      });
      return this.normalizePropertyData(response.data);
    } catch (error) {
      console.error('County Records API error:', error.message);
      return null;
    }
  }

  async getAssessedValue(addressParams) {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const { address, city, state, zip } = addressParams;
      const response = await axios.get(`${this.baseUrl}/assessment/value`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: { street: address, city, state, zip }
      });

      const data = response.data;
      return {
        estimatedValue: data.marketValue || data.assessedValue,
        range: null,
        confidence: 'medium',
        lastUpdated: data.assessmentDate || new Date().toISOString(),
        source: 'County Assessment'
      };
    } catch (error) {
      console.error('County assessment error:', error.message);
      return null;
    }
  }

  async getLienInfo(addressParams) {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const { address, city, state, zip } = addressParams;
      const response = await axios.get(`${this.baseUrl}/recorder/liens`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: { street: address, city, state, zip }
      });
      return response.data.liens || [];
    } catch (error) {
      console.error('County lien error:', error.message);
      return [];
    }
  }

  async getOwnerInfo(addressParams) {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const { address, city, state, zip } = addressParams;
      const response = await axios.get(`${this.baseUrl}/property/owner`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: { street: address, city, state, zip }
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
      return null;
    }
  }

  async getTaxInfo(addressParams) {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const { address, city, state, zip } = addressParams;
      const response = await axios.get(`${this.baseUrl}/tax/info`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: { street: address, city, state, zip }
      });
      return response.data;
    } catch (error) {
      console.error('County tax error:', error.message);
      return null;
    }
  }

  normalizePropertyData(data) {
    if (!data) return null;

    return {
      basic: {
        propertyType: data.propertyType || data.useCode,
        yearBuilt: data.yearBuilt,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFeet: data.buildingSquareFeet || data.livingArea,
        lotSize: data.lotSquareFeet || (data.lotAcres ? data.lotAcres * 43560 : null),
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
}

module.exports = new CountyRecordsProvider();
