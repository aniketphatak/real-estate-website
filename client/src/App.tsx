import { useState } from 'react';
import Header from './components/Header';
import SearchSection from './components/SearchSection';
import PropertyReport from './components/PropertyReport';
import Footer from './components/Footer';
import { PropertyData } from './types';

function App() {
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (data: PropertyData) => {
    setPropertyData(data);
    setError(null);
  };

  const handleLoading = (loading: boolean) => {
    setIsLoading(loading);
    if (loading) {
      setError(null);
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setPropertyData(null);
  };

  const handleClear = () => {
    setPropertyData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1">
        {/* Hero Section with Search */}
        <section className={`transition-all duration-500 ${propertyData ? 'py-8' : 'py-16 md:py-24'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {!propertyData && (
              <div className="text-center mb-12 animate-fade-in">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
                  Unlock Property
                  <span className="text-gradient"> Intelligence</span>
                </h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Get comprehensive property data including valuations, mortgage info,
                  ownership details, liens, and more — all in seconds.
                </p>
              </div>
            )}

            <SearchSection
              onSearch={handleSearch}
              onLoading={handleLoading}
              onError={handleError}
              onClear={handleClear}
              isLoading={isLoading}
              hasResults={!!propertyData}
            />

            {error && (
              <div className="mt-6 max-w-2xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Results Section */}
        {propertyData && (
          <section className="pb-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <PropertyReport data={propertyData} isLoading={isLoading} />
            </div>
          </section>
        )}

        {/* Features Section (shown when no results) */}
        {!propertyData && !isLoading && (
          <section className="py-16 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                Comprehensive Property Data at Your Fingertips
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                <FeatureCard
                  icon="🏠"
                  title="Property Valuation"
                  description="Get accurate property value estimates from multiple sources including Zillow Zestimates and county assessments."
                />
                <FeatureCard
                  icon="💰"
                  title="Mortgage & Liens"
                  description="View current mortgage information, outstanding loans, and any liens recorded against the property."
                />
                <FeatureCard
                  icon="👤"
                  title="Owner Information"
                  description="Access property owner details, ownership history, and mailing addresses from public records."
                />
                <FeatureCard
                  icon="📊"
                  title="Market Analysis"
                  description="Review sales history, tax information, and neighborhood data to understand market trends."
                />
              </div>
            </div>
          </section>
        )}

        {/* Data Sources Section */}
        {!propertyData && !isLoading && (
          <section className="py-16 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">
                Data Aggregated From Trusted Sources
              </h2>
              <div className="flex flex-wrap justify-center items-center gap-8 text-gray-400">
                <DataSourceBadge name="ATTOM Data" />
                <DataSourceBadge name="County Records" />
                <DataSourceBadge name="NMLS" />
                <DataSourceBadge name="Zillow" />
                <DataSourceBadge name="Public Records" />
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="stat-card text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function DataSourceBadge({ name }: { name: string }) {
  return (
    <div className="px-6 py-3 bg-white rounded-lg shadow-sm border border-gray-200">
      <span className="font-medium text-gray-700">{name}</span>
    </div>
  );
}

export default App;
