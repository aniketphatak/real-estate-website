import { useState, useCallback } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { PropertyData, AddressSuggestion } from '../types';
import { propertyApi } from '../services/api';
import debounce from '../utils/debounce';

interface SearchSectionProps {
  onSearch: (data: PropertyData) => void;
  onLoading: (loading: boolean) => void;
  onError: (error: string) => void;
  onClear: () => void;
  isLoading: boolean;
  hasResults: boolean;
}

interface AddressForm {
  address: string;
  city: string;
  state: string;
  zip: string;
}

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'Washington DC' }
];

export default function SearchSection({
  onSearch,
  onLoading,
  onError,
  onClear,
  isLoading,
  hasResults
}: SearchSectionProps) {
  const [form, setForm] = useState<AddressForm>({
    address: '',
    city: '',
    state: '',
    zip: ''
  });
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Debounced autocomplete
  const fetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const results = await propertyApi.getAddressSuggestions(query);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300),
    []
  );

  const handleAddressChange = (value: string) => {
    setForm(prev => ({ ...prev, address: value }));
    fetchSuggestions(value);
  };

  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    setForm({
      address: suggestion.address,
      city: suggestion.city,
      state: suggestion.state,
      zip: suggestion.zip
    });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.address || !form.city || !form.state || !form.zip) {
      onError('Please fill in all address fields');
      return;
    }

    if (!/^\d{5}$/.test(form.zip)) {
      onError('Please enter a valid 5-digit ZIP code');
      return;
    }

    onLoading(true);

    try {
      const data = await propertyApi.getComprehensiveReport(form);
      onSearch(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch property data';
      onError(errorMessage);
    } finally {
      onLoading(false);
    }
  };

  const handleClear = () => {
    setForm({ address: '', city: '', state: '', zip: '' });
    setSuggestions([]);
    onClear();
  };

  return (
    <div className={`max-w-4xl mx-auto ${hasResults ? 'mb-0' : ''}`}>
      <form onSubmit={handleSubmit}>
        <div className="card p-6 md:p-8">
          {/* Search Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Search Property</h2>
              <p className="text-sm text-gray-500">Enter a US property address</p>
            </div>
          </div>

          {/* Address Fields */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Street Address with Autocomplete */}
            <div className="md:col-span-2 relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={e => handleAddressChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="123 Main Street"
                className="input-field"
                required
              />
              {/* Autocomplete Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium text-gray-900">{suggestion.address}</div>
                      <div className="text-sm text-gray-500">
                        {suggestion.city}, {suggestion.state} {suggestion.zip}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Los Angeles"
                className="input-field"
                required
              />
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <select
                value={form.state}
                onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))}
                className="input-field"
                required
              >
                <option value="">Select State</option>
                {US_STATES.map(state => (
                  <option key={state.code} value={state.code}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ZIP Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                value={form.zip}
                onChange={e => setForm(prev => ({ ...prev, zip: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
                placeholder="90001"
                className="input-field"
                maxLength={5}
                required
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Get Property Report
                </>
              )}
            </button>

            {hasResults && (
              <button
                type="button"
                onClick={handleClear}
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Clear
              </button>
            )}
          </div>

          {/* Loading Progress */}
          {isLoading && (
            <div className="mt-6">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full progress-bar rounded-full" />
              </div>
              <p className="text-sm text-gray-500 mt-2 text-center">
                Aggregating data from multiple sources...
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
