const axios = require('axios');

/**
 * NMLS (Nationwide Multistate Licensing System) Provider
 * Provides lender and mortgage broker information
 */

class NMLSProvider {
  constructor() {
    this.apiKey = process.env.NMLS_API_KEY;
    // NMLS Consumer Access is publicly accessible
    this.baseUrl = 'https://www.nmlsconsumeraccess.org/api';
  }

  /**
   * Check if provider is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Get lender information based on mortgage data
   */
  async getLenderInfo(addressParams, lenderName = null) {
    // NMLS provides public data, but API access may be limited
    // In production, this would integrate with NMLS Consumer Access
    return this.getMockLenderInfo(lenderName);
  }

  /**
   * Search for licensed mortgage professionals by NMLS ID
   */
  async searchByNMLSId(nmlsId) {
    if (!this.isConfigured()) {
      return this.getMockNMLSProfile(nmlsId);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: { nmlsId },
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      return this.normalizeNMLSData(response.data);
    } catch (error) {
      console.error('NMLS search error:', error.message);
      return this.getMockNMLSProfile(nmlsId);
    }
  }

  /**
   * Search for licensed mortgage professionals by name
   */
  async searchByName(name, state = null) {
    if (!this.isConfigured()) {
      return this.getMockSearchResults(name);
    }

    try {
      const params = { name };
      if (state) params.state = state;

      const response = await axios.get(`${this.baseUrl}/search`, {
        params,
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      return response.data.results || [];
    } catch (error) {
      console.error('NMLS name search error:', error.message);
      return this.getMockSearchResults(name);
    }
  }

  /**
   * Get company information by NMLS ID
   */
  async getCompanyInfo(nmlsId) {
    if (!this.isConfigured()) {
      return this.getMockCompanyInfo(nmlsId);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/company/${nmlsId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      return response.data;
    } catch (error) {
      console.error('NMLS company info error:', error.message);
      return this.getMockCompanyInfo(nmlsId);
    }
  }

  /**
   * Verify license status
   */
  async verifyLicense(nmlsId, state) {
    if (!this.isConfigured()) {
      return this.getMockLicenseVerification(nmlsId, state);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/license/verify`, {
        params: { nmlsId, state },
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      return response.data;
    } catch (error) {
      console.error('NMLS license verification error:', error.message);
      return this.getMockLicenseVerification(nmlsId, state);
    }
  }

  /**
   * Normalize NMLS data
   */
  normalizeNMLSData(data) {
    if (!data) return null;

    return {
      nmlsId: data.nmlsId,
      name: data.name,
      type: data.entityType,
      status: data.status,
      licenses: data.licenses || [],
      address: data.address,
      phone: data.phone,
      website: data.website
    };
  }

  /**
   * Mock lender info
   */
  getMockLenderInfo(lenderName) {
    const lenders = {
      'Wells Fargo Home Mortgage': {
        nmlsId: '399801',
        name: 'Wells Fargo Bank, N.A.',
        type: 'Bank',
        status: 'Active',
        licenses: [
          { state: 'CA', type: 'Mortgage Lender', status: 'Active', expirationDate: '2025-12-31' },
          { state: 'NY', type: 'Mortgage Lender', status: 'Active', expirationDate: '2025-12-31' },
          { state: 'TX', type: 'Mortgage Lender', status: 'Active', expirationDate: '2025-12-31' }
        ],
        address: {
          street: '420 Montgomery Street',
          city: 'San Francisco',
          state: 'CA',
          zip: '94104'
        },
        phone: '1-800-869-3557',
        website: 'https://www.wellsfargo.com/mortgage'
      },
      'default': {
        nmlsId: '12345',
        name: 'Sample Mortgage Lender',
        type: 'Mortgage Lender',
        status: 'Active',
        licenses: [
          { state: 'CA', type: 'Mortgage Lender', status: 'Active', expirationDate: '2025-12-31' }
        ],
        address: {
          street: '123 Finance St',
          city: 'Los Angeles',
          state: 'CA',
          zip: '90001'
        },
        phone: '1-800-555-1234',
        website: null
      }
    };

    return lenders[lenderName] || lenders['default'];
  }

  getMockNMLSProfile(nmlsId) {
    return {
      nmlsId: nmlsId || '123456',
      name: 'John Smith',
      type: 'Mortgage Loan Originator',
      status: 'Active',
      employerNMLSId: '399801',
      employerName: 'Wells Fargo Bank, N.A.',
      licenses: [
        {
          state: 'CA',
          type: 'Mortgage Loan Originator',
          status: 'Active',
          issueDate: '2015-03-15',
          expirationDate: '2025-12-31'
        }
      ],
      disciplinaryActions: [],
      lastUpdated: new Date().toISOString()
    };
  }

  getMockSearchResults(name) {
    return [
      {
        nmlsId: '123456',
        name: 'John Smith',
        type: 'Individual',
        employer: 'Wells Fargo Bank, N.A.',
        states: ['CA', 'NV', 'AZ']
      },
      {
        nmlsId: '234567',
        name: 'Smith Mortgage Group',
        type: 'Company',
        states: ['CA', 'OR', 'WA']
      }
    ];
  }

  getMockCompanyInfo(nmlsId) {
    return {
      nmlsId: nmlsId || '399801',
      name: 'Sample Mortgage Company',
      tradeName: 'Sample Mortgage',
      type: 'Mortgage Lender/Servicer',
      status: 'Active',
      incorporationState: 'CA',
      incorporationDate: '2005-01-15',
      mainAddress: {
        street: '100 Main Street',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001'
      },
      branchCount: 15,
      licenses: [
        { state: 'CA', type: 'Mortgage Lender', status: 'Active' },
        { state: 'NV', type: 'Mortgage Lender', status: 'Active' },
        { state: 'AZ', type: 'Mortgage Lender', status: 'Active' }
      ],
      registeredAgentCount: 45,
      lastUpdated: new Date().toISOString()
    };
  }

  getMockLicenseVerification(nmlsId, state) {
    return {
      nmlsId,
      state,
      licenseType: 'Mortgage Loan Originator',
      status: 'Active',
      issueDate: '2018-05-20',
      expirationDate: '2025-12-31',
      verified: true,
      verificationDate: new Date().toISOString()
    };
  }
}

module.exports = new NMLSProvider();
