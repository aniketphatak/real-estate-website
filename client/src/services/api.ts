import axios, { AxiosError } from 'axios';
import { PropertyData, AddressSuggestion, AddressParams } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Error handler
const handleApiError = (error: unknown): never => {
  if (error instanceof AxiosError) {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.message || error.response.statusText;
      throw new Error(`API Error: ${message}`);
    } else if (error.request) {
      // No response received
      throw new Error('Unable to connect to server. Please check your connection.');
    }
  }
  throw new Error('An unexpected error occurred. Please try again.');
};

export const propertyApi = {
  /**
   * Get comprehensive property report
   */
  async getComprehensiveReport(params: AddressParams): Promise<PropertyData> {
    try {
      const response = await api.get<PropertyData>('/property/report', {
        params: {
          address: params.address,
          city: params.city,
          state: params.state,
          zip: params.zip
        }
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Search for property data
   */
  async searchProperty(params: AddressParams): Promise<PropertyData> {
    try {
      const response = await api.get<PropertyData>('/property/search', {
        params: {
          address: params.address,
          city: params.city,
          state: params.state,
          zip: params.zip
        }
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get property valuation
   */
  async getValuation(params: AddressParams) {
    try {
      const response = await api.get('/property/valuation', {
        params: {
          address: params.address,
          city: params.city,
          state: params.state,
          zip: params.zip
        }
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get mortgage/lien information
   */
  async getMortgageData(params: AddressParams) {
    try {
      const response = await api.get('/property/mortgage', {
        params: {
          address: params.address,
          city: params.city,
          state: params.state,
          zip: params.zip
        }
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get owner information
   */
  async getOwnerData(params: AddressParams) {
    try {
      const response = await api.get('/property/owner', {
        params: {
          address: params.address,
          city: params.city,
          state: params.state,
          zip: params.zip
        }
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  /**
   * Get address autocomplete suggestions
   */
  async getAddressSuggestions(query: string): Promise<AddressSuggestion[]> {
    try {
      const response = await api.get<{ suggestions: AddressSuggestion[] }>('/property/autocomplete', {
        params: { query }
      });
      return response.data.suggestions || [];
    } catch {
      // Silently fail for autocomplete
      return [];
    }
  }
};

export default api;
