const axios = require('axios');

/**
 * NMLS (Nationwide Multistate Licensing System) Provider
 * Provides lender and mortgage broker information
 * Note: NMLS Consumer Access requires specific API access
 */

class NMLSProvider {
  constructor() {
    this.apiKey = process.env.NMLS_API_KEY;
    this.baseUrl = 'https://www.nmlsconsumeraccess.org/api';
  }

  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Get lender information - returns null when not configured
   */
  async getLenderInfo(addressParams, lenderName = null) {
    if (!this.isConfigured()) {
      console.log('NMLS provider not configured');
      return null;
    }

    // NMLS API integration would go here
    return null;
  }

  /**
   * Search for licensed mortgage professionals by NMLS ID
   */
  async searchByNMLSId(nmlsId) {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: { nmlsId },
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      return this.normalizeNMLSData(response.data);
    } catch (error) {
      console.error('NMLS search error:', error.message);
      return null;
    }
  }

  /**
   * Search for licensed mortgage professionals by name
   */
  async searchByName(name, state = null) {
    if (!this.isConfigured()) {
      return [];
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
      return [];
    }
  }

  /**
   * Get company information by NMLS ID
   */
  async getCompanyInfo(nmlsId) {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/company/${nmlsId}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      return response.data;
    } catch (error) {
      console.error('NMLS company info error:', error.message);
      return null;
    }
  }

  /**
   * Verify license status
   */
  async verifyLicense(nmlsId, state) {
    if (!this.isConfigured()) {
      return null;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/license/verify`, {
        params: { nmlsId, state },
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      return response.data;
    } catch (error) {
      console.error('NMLS license verification error:', error.message);
      return null;
    }
  }

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
}

module.exports = new NMLSProvider();
