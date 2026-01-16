const axios = require('axios');

/**
 * Geocoding Provider using multiple free services
 * - OpenStreetMap Nominatim (primary)
 * - Census Bureau Geocoder (fallback)
 */

class GeocodingProvider {
  constructor() {
    this.nominatimUrl = 'https://nominatim.openstreetmap.org';
    this.censusUrl = 'https://geocoding.geo.census.gov/geocoder';

    this.headers = {
      'User-Agent': 'PropertyInsight/1.0 (https://propertyinsight.app)',
      'Accept': 'application/json'
    };
  }

  /**
   * Geocode an address using Nominatim
   */
  async geocodeWithNominatim(addressParams) {
    try {
      const { address, city, state, zip } = addressParams;
      const query = `${address}, ${city}, ${state} ${zip}, USA`;

      const response = await axios.get(`${this.nominatimUrl}/search`, {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 1,
          countrycodes: 'us'
        },
        headers: this.headers,
        timeout: 10000
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        return {
          success: true,
          source: 'OpenStreetMap',
          coordinates: {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon)
          },
          displayName: result.display_name,
          address: result.address,
          type: result.type,
          importance: result.importance,
          boundingBox: result.boundingbox
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Nominatim geocoding error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Geocode using Census Bureau (fallback)
   */
  async geocodeWithCensus(addressParams) {
    try {
      const { address, city, state, zip } = addressParams;

      const response = await axios.get(`${this.censusUrl}/locations/onelineaddress`, {
        params: {
          address: `${address}, ${city}, ${state} ${zip}`,
          benchmark: 'Public_AR_Current',
          format: 'json'
        },
        headers: this.headers,
        timeout: 10000
      });

      if (response.data?.result?.addressMatches?.length > 0) {
        const match = response.data.result.addressMatches[0];
        return {
          success: true,
          source: 'US Census Bureau',
          coordinates: {
            latitude: match.coordinates.y,
            longitude: match.coordinates.x
          },
          displayName: match.matchedAddress,
          tigerLineId: match.tigerLine?.tigerLineId
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Census geocoding error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Geocode address using best available service
   */
  async geocode(addressParams) {
    // Try Nominatim first
    const nominatimResult = await this.geocodeWithNominatim(addressParams);
    if (nominatimResult.success) {
      return nominatimResult;
    }

    // Fallback to Census
    const censusResult = await this.geocodeWithCensus(addressParams);
    if (censusResult.success) {
      return censusResult;
    }

    return { success: false, error: 'Could not geocode address' };
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await axios.get(`${this.nominatimUrl}/reverse`, {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1
        },
        headers: this.headers,
        timeout: 10000
      });

      if (response.data && response.data.address) {
        const addr = response.data.address;
        return {
          success: true,
          address: {
            street: `${addr.house_number || ''} ${addr.road || ''}`.trim(),
            city: addr.city || addr.town || addr.village || addr.hamlet,
            state: addr.state,
            zip: addr.postcode,
            county: addr.county
          },
          displayName: response.data.display_name
        };
      }

      return { success: false };
    } catch (error) {
      console.error('Reverse geocoding error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get address suggestions (autocomplete)
   */
  async getAddressSuggestions(query) {
    try {
      const response = await axios.get(`${this.nominatimUrl}/search`, {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 5,
          countrycodes: 'us'
        },
        headers: this.headers,
        timeout: 8000
      });

      if (response.data && response.data.length > 0) {
        return response.data.map(result => ({
          address: `${result.address?.house_number || ''} ${result.address?.road || ''}`.trim(),
          city: result.address?.city || result.address?.town || result.address?.village || '',
          state: result.address?.state || '',
          zip: result.address?.postcode || '',
          formatted: result.display_name,
          coordinates: {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon)
          }
        }));
      }

      return [];
    } catch (error) {
      console.error('Address suggestions error:', error.message);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates (in miles)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(deg) {
    return deg * (Math.PI / 180);
  }
}

module.exports = new GeocodingProvider();
