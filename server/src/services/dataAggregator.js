/**
 * Data Aggregator Service
 * Combines and normalizes data from multiple property data providers
 */

class DataAggregator {
  /**
   * Aggregate property data from all available providers
   */
  async aggregatePropertyData(addressParams, providers) {
    const results = {
      basic: null,
      details: null,
      features: null,
      taxInfo: null,
      salesHistory: null,
      neighborhood: null,
      sources: [],
      lastUpdated: new Date().toISOString()
    };

    // Fetch data from all providers in parallel
    const fetchPromises = [
      this.fetchWithSource(providers.zillow?.getPropertyInfo(addressParams), 'Zillow'),
      this.fetchWithSource(providers.attom?.getPropertyInfo(addressParams), 'ATTOM Data'),
      this.fetchWithSource(providers.countyRecords?.getPropertyInfo(addressParams), 'County Records')
    ];

    const responses = await Promise.allSettled(fetchPromises);

    // Process and merge results
    responses.forEach((response) => {
      if (response.status === 'fulfilled' && response.value?.data) {
        const { data, source } = response.value;
        results.sources.push(source);
        this.mergePropertyData(results, data);
      }
    });

    return results;
  }

  /**
   * Fetch data and attach source information
   */
  async fetchWithSource(promise, source) {
    if (!promise) return { data: null, source };

    try {
      const data = await promise;
      return { data, source };
    } catch (error) {
      console.error(`Error fetching from ${source}:`, error.message);
      return { data: null, source };
    }
  }

  /**
   * Merge property data from different sources
   * Uses a priority system: ATTOM > Zillow > County Records for most fields
   */
  mergePropertyData(target, source) {
    if (!source) return;

    // Basic info (prefer existing data, fill in gaps)
    if (source.basic) {
      target.basic = target.basic || {};
      target.basic = {
        ...target.basic,
        propertyType: target.basic.propertyType || source.basic.propertyType,
        yearBuilt: target.basic.yearBuilt || source.basic.yearBuilt,
        bedrooms: target.basic.bedrooms || source.basic.bedrooms,
        bathrooms: target.basic.bathrooms || source.basic.bathrooms,
        squareFeet: target.basic.squareFeet || source.basic.squareFeet,
        lotSize: target.basic.lotSize || source.basic.lotSize,
        stories: target.basic.stories || source.basic.stories,
        parking: target.basic.parking || source.basic.parking,
        pool: target.basic.pool || source.basic.pool,
        apn: target.basic.apn || source.basic.apn,
        zoning: target.basic.zoning || source.basic.zoning
      };
    }

    // Property details
    if (source.details) {
      target.details = target.details || {};
      target.details = {
        ...target.details,
        construction: target.details.construction || source.details.construction,
        roofType: target.details.roofType || source.details.roofType,
        heating: target.details.heating || source.details.heating,
        cooling: target.details.cooling || source.details.cooling,
        foundation: target.details.foundation || source.details.foundation,
        flooring: target.details.flooring || source.details.flooring,
        exteriorWalls: target.details.exteriorWalls || source.details.exteriorWalls
      };
    }

    // Features
    if (source.features) {
      target.features = target.features || [];
      const existingFeatures = new Set(target.features.map(f => f.toLowerCase()));
      source.features.forEach(feature => {
        if (!existingFeatures.has(feature.toLowerCase())) {
          target.features.push(feature);
        }
      });
    }

    // Tax info (prefer county records)
    if (source.taxInfo) {
      target.taxInfo = target.taxInfo || {};
      target.taxInfo = {
        assessedValue: source.taxInfo.assessedValue || target.taxInfo.assessedValue,
        taxAmount: source.taxInfo.taxAmount || target.taxInfo.taxAmount,
        taxYear: source.taxInfo.taxYear || target.taxInfo.taxYear,
        exemptions: source.taxInfo.exemptions || target.taxInfo.exemptions
      };
    }

    // Sales history (combine and deduplicate)
    if (source.salesHistory) {
      target.salesHistory = target.salesHistory || [];
      source.salesHistory.forEach(sale => {
        const exists = target.salesHistory.some(
          s => s.date === sale.date && s.price === sale.price
        );
        if (!exists) {
          target.salesHistory.push(sale);
        }
      });
      // Sort by date descending
      target.salesHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // Neighborhood data
    if (source.neighborhood) {
      target.neighborhood = target.neighborhood || {};
      target.neighborhood = {
        ...target.neighborhood,
        ...source.neighborhood
      };
    }
  }

  /**
   * Merge owner data from multiple sources
   */
  mergeOwnerData(attomOwner, countyOwner) {
    const result = {
      current: null,
      previous: [],
      ownershipHistory: [],
      lastUpdated: new Date().toISOString()
    };

    // Prefer ATTOM data as primary source
    if (attomOwner) {
      result.current = {
        name: attomOwner.name,
        mailingAddress: attomOwner.mailingAddress,
        ownerType: attomOwner.ownerType || 'Individual',
        ownerOccupied: attomOwner.ownerOccupied,
        purchaseDate: attomOwner.purchaseDate,
        purchasePrice: attomOwner.purchasePrice
      };
    }

    // Fill gaps with county records
    if (countyOwner) {
      if (!result.current) {
        result.current = {
          name: countyOwner.name,
          mailingAddress: countyOwner.mailingAddress,
          ownerType: countyOwner.ownerType || 'Individual',
          ownerOccupied: countyOwner.ownerOccupied,
          purchaseDate: countyOwner.purchaseDate,
          purchasePrice: countyOwner.purchasePrice
        };
      } else {
        // Fill in missing fields
        result.current = {
          ...result.current,
          name: result.current.name || countyOwner.name,
          mailingAddress: result.current.mailingAddress || countyOwner.mailingAddress,
          purchaseDate: result.current.purchaseDate || countyOwner.purchaseDate,
          purchasePrice: result.current.purchasePrice || countyOwner.purchasePrice
        };
      }

      // Add ownership history if available
      if (countyOwner.history) {
        result.ownershipHistory = countyOwner.history;
      }
    }

    return result;
  }

  /**
   * Normalize address format
   */
  normalizeAddress(address) {
    return {
      street: this.normalizeStreet(address.street || address.address),
      city: this.normalizeCity(address.city),
      state: this.normalizeState(address.state),
      zip: this.normalizeZip(address.zip || address.zipCode)
    };
  }

  normalizeStreet(street) {
    if (!street) return '';
    return street
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .replace(/\bSTREET\b/g, 'ST')
      .replace(/\bAVENUE\b/g, 'AVE')
      .replace(/\bBOULEVARD\b/g, 'BLVD')
      .replace(/\bDRIVE\b/g, 'DR')
      .replace(/\bLANE\b/g, 'LN')
      .replace(/\bROAD\b/g, 'RD')
      .replace(/\bCOURT\b/g, 'CT')
      .replace(/\bCIRCLE\b/g, 'CIR')
      .replace(/\bAPARTMENT\b/g, 'APT')
      .replace(/\bSUITE\b/g, 'STE')
      .trim();
  }

  normalizeCity(city) {
    if (!city) return '';
    return city.trim().toUpperCase();
  }

  normalizeState(state) {
    if (!state) return '';
    const stateMap = {
      'ALABAMA': 'AL', 'ALASKA': 'AK', 'ARIZONA': 'AZ', 'ARKANSAS': 'AR',
      'CALIFORNIA': 'CA', 'COLORADO': 'CO', 'CONNECTICUT': 'CT', 'DELAWARE': 'DE',
      'FLORIDA': 'FL', 'GEORGIA': 'GA', 'HAWAII': 'HI', 'IDAHO': 'ID',
      'ILLINOIS': 'IL', 'INDIANA': 'IN', 'IOWA': 'IA', 'KANSAS': 'KS',
      'KENTUCKY': 'KY', 'LOUISIANA': 'LA', 'MAINE': 'ME', 'MARYLAND': 'MD',
      'MASSACHUSETTS': 'MA', 'MICHIGAN': 'MI', 'MINNESOTA': 'MN', 'MISSISSIPPI': 'MS',
      'MISSOURI': 'MO', 'MONTANA': 'MT', 'NEBRASKA': 'NE', 'NEVADA': 'NV',
      'NEW HAMPSHIRE': 'NH', 'NEW JERSEY': 'NJ', 'NEW MEXICO': 'NM', 'NEW YORK': 'NY',
      'NORTH CAROLINA': 'NC', 'NORTH DAKOTA': 'ND', 'OHIO': 'OH', 'OKLAHOMA': 'OK',
      'OREGON': 'OR', 'PENNSYLVANIA': 'PA', 'RHODE ISLAND': 'RI', 'SOUTH CAROLINA': 'SC',
      'SOUTH DAKOTA': 'SD', 'TENNESSEE': 'TN', 'TEXAS': 'TX', 'UTAH': 'UT',
      'VERMONT': 'VT', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA', 'WEST VIRGINIA': 'WV',
      'WISCONSIN': 'WI', 'WYOMING': 'WY'
    };
    const upperState = state.trim().toUpperCase();
    return stateMap[upperState] || upperState;
  }

  normalizeZip(zip) {
    if (!zip) return '';
    return String(zip).replace(/\D/g, '').slice(0, 5);
  }
}

module.exports = new DataAggregator();
