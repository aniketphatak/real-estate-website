import {
  Home,
  DollarSign,
  Building2,
  Users,
  TrendingUp,
  FileText,
  Calendar,
  MapPin,
  Percent,
  Shield,
  Clock
} from 'lucide-react';
import { PropertyData } from '../types';
import { formatCurrency, formatNumber, formatDate, formatPercent } from '../utils/formatters';

interface PropertyReportProps {
  data: PropertyData;
  isLoading?: boolean;
}

export default function PropertyReport({ data, isLoading }: PropertyReportProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const { address, property, valuation, mortgage, owner, equity } = data;

  return (
    <div className="animate-slide-up">
      {/* Address Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Home className="w-7 h-7 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              {address.street}
            </h1>
            <p className="text-lg text-gray-600">
              {address.city}, {address.state} {address.zip}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {property.sources.map((source, i) => (
                <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                  {source}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <QuickStat
          icon={<DollarSign className="w-5 h-5" />}
          label="Estimated Value"
          value={formatCurrency(valuation.averageValue)}
          color="primary"
        />
        <QuickStat
          icon={<Percent className="w-5 h-5" />}
          label="Equity"
          value={equity ? formatCurrency(equity.estimatedEquity) : 'N/A'}
          subtext={equity ? `${equity.equityPercent}%` : undefined}
          color="secondary"
        />
        <QuickStat
          icon={<Building2 className="w-5 h-5" />}
          label="Property Type"
          value={property.basic?.propertyType || 'N/A'}
          color="gray"
        />
        <QuickStat
          icon={<Calendar className="w-5 h-5" />}
          label="Year Built"
          value={property.basic?.yearBuilt?.toString() || 'N/A'}
          color="gray"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Property Details Card */}
        <ReportCard title="Property Details" icon={<Home className="w-5 h-5" />}>
          <div className="grid grid-cols-2 gap-4">
            <DataItem label="Bedrooms" value={property.basic?.bedrooms?.toString() || 'N/A'} />
            <DataItem label="Bathrooms" value={property.basic?.bathrooms?.toString() || 'N/A'} />
            <DataItem label="Square Feet" value={formatNumber(property.basic?.squareFeet)} />
            <DataItem label="Lot Size" value={
              typeof property.basic?.lotSize === 'string'
                ? property.basic.lotSize
                : property.basic?.lotSize
                  ? `${formatNumber(property.basic.lotSize)} sqft`
                  : 'N/A'
            } />
            <DataItem label="Stories" value={property.basic?.stories?.toString() || 'N/A'} />
            <DataItem label="Parking" value={
              property.basic?.parking && property.basic.parking <= 10
                ? `${property.basic.parking} car`
                : 'N/A'
            } />
            <DataItem label="APN" value={property.basic?.apn || 'N/A'} />
            <DataItem label="Zoning" value={property.basic?.zoning || 'N/A'} />
          </div>

          {/* Construction Details */}
          {property.details && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-4">Construction</h4>
              <div className="grid grid-cols-2 gap-4">
                <DataItem label="Construction" value={property.details.construction || 'N/A'} />
                <DataItem label="Roof Type" value={property.details.roofType || 'N/A'} />
                <DataItem label="Heating" value={property.details.heating || 'N/A'} />
                <DataItem label="Cooling" value={property.details.cooling || 'N/A'} />
              </div>
            </div>
          )}

          {/* Features */}
          {property.features && property.features.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-3">Features</h4>
              <div className="flex flex-wrap gap-2">
                {property.features.map((feature, i) => (
                  <span key={i} className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}
        </ReportCard>

        {/* Valuation Card */}
        <ReportCard title="Property Valuation" icon={<TrendingUp className="w-5 h-5" />}>
          {/* Property Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 mb-1">Estimated Value</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(valuation.averageValue)}
              </div>
              <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                valuation.confidenceScore === 'high' ? 'bg-green-100 text-green-700' :
                valuation.confidenceScore === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {valuation.confidenceScore} confidence
              </span>
            </div>

            {/* Rent Estimate */}
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 mb-1">Estimated Monthly Rent</div>
              {valuation.rentEstimate?.monthlyRent ? (
                <>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(valuation.rentEstimate.monthlyRent)}/mo
                  </div>
                  {valuation.rentEstimate.rentRange && (
                    <div className="text-xs text-gray-500 mt-2">
                      Range: {formatCurrency(valuation.rentEstimate.rentRange.low)} - {formatCurrency(valuation.rentEstimate.rentRange.high)}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Source: {valuation.rentEstimate.source}
                  </div>
                </>
              ) : (
                <div className="text-gray-400 text-sm">Not available</div>
              )}
            </div>
          </div>

          <h4 className="font-medium text-gray-900 mb-3">Estimates by Source</h4>
          <div className="space-y-3">
            {valuation.estimates.map((estimate, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{estimate.source}</div>
                  {estimate.range && estimate.range.low && estimate.range.high && (
                    <div className="text-xs text-gray-500">
                      Range: {formatCurrency(estimate.range.low)} - {formatCurrency(estimate.range.high)}
                    </div>
                  )}
                </div>
                <div className="text-lg font-semibold text-primary-600">
                  {formatCurrency(estimate.value)}
                </div>
              </div>
            ))}
          </div>
        </ReportCard>

        {/* Mortgage & Liens Card */}
        <ReportCard title="Mortgage & Liens" icon={<FileText className="w-5 h-5" />}>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Total Outstanding</div>
              <div className="text-xl font-bold text-gray-900">
                {formatCurrency(mortgage.totalOutstanding)}
              </div>
            </div>
            {equity && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600">Loan-to-Value</div>
                <div className="text-xl font-bold text-green-700">
                  {formatPercent(Number(equity.loanToValue))}
                </div>
              </div>
            )}
          </div>

          {/* Mortgages */}
          {mortgage.mortgages.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Active Mortgages</h4>
              <div className="space-y-3">
                {mortgage.mortgages.map((m, i) => (
                  <div key={i} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-gray-900">{m.lender}</div>
                        {m.titleCompany && (
                          <div className="text-xs text-gray-500">Title: {m.titleCompany}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {m.loanType && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            {m.loanType}
                          </span>
                        )}
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          Position {m.position || 1}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Original Amount:</span>{' '}
                        <span className="font-medium">{formatCurrency(m.originalAmount)}</span>
                      </div>
                      {m.currentBalance && (
                        <div>
                          <span className="text-gray-500">Current Balance:</span>{' '}
                          <span className="font-medium">{formatCurrency(m.currentBalance)}</span>
                        </div>
                      )}
                      {m.interestRate && (
                        <div>
                          <span className="text-gray-500">Interest Rate:</span>{' '}
                          <span className="font-medium">{m.interestRate}%</span>
                          {m.interestRateType && (
                            <span className="text-xs text-gray-400 ml-1">({m.interestRateType})</span>
                          )}
                        </div>
                      )}
                      {m.term && (
                        <div>
                          <span className="text-gray-500">Term:</span>{' '}
                          <span className="font-medium">{m.term > 12 ? `${Math.round(m.term / 12)} years` : `${m.term} months`}</span>
                        </div>
                      )}
                      {m.recordingDate && (
                        <div>
                          <span className="text-gray-500">Recorded:</span>{' '}
                          <span className="font-medium">{formatDate(m.recordingDate)}</span>
                        </div>
                      )}
                      {m.maturityDate && (
                        <div>
                          <span className="text-gray-500">Maturity Date:</span>{' '}
                          <span className="font-medium">{formatDate(m.maturityDate)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Liens */}
          {mortgage.liens.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Liens</h4>
              <div className="space-y-2">
                {mortgage.liens.map((lien, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{lien.type}</div>
                      {lien.recordedDate && (
                        <div className="text-xs text-gray-500">Recorded: {formatDate(lien.recordedDate)}</div>
                      )}
                    </div>
                    <div className="text-lg font-semibold text-yellow-700">
                      {formatCurrency(lien.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lender Details */}
          {mortgage.lenderDetails && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Lender Information (NMLS)
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <DataItem label="Lender" value={mortgage.lenderDetails.name || 'N/A'} />
                <DataItem label="NMLS ID" value={mortgage.lenderDetails.nmlsId || 'N/A'} />
                <DataItem label="Status" value={mortgage.lenderDetails.status || 'N/A'} />
                <DataItem label="Type" value={mortgage.lenderDetails.type || 'N/A'} />
              </div>
            </div>
          )}
        </ReportCard>

        {/* Owner Information Card */}
        <ReportCard title="Owner Information" icon={<Users className="w-5 h-5" />}>
          {owner.current && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Current Owner</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold text-gray-900 mb-2">
                  {owner.current.name}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <DataItem
                    label="Owner Type"
                    value={owner.current.ownerType || 'N/A'}
                  />
                  <DataItem
                    label="Owner Occupied"
                    value={owner.current.ownerOccupied ? 'Yes' : 'No'}
                  />
                  {owner.current.purchaseDate && (
                    <DataItem
                      label="Purchase Date"
                      value={formatDate(owner.current.purchaseDate)}
                    />
                  )}
                  {owner.current.purchasePrice && (
                    <DataItem
                      label="Purchase Price"
                      value={formatCurrency(owner.current.purchasePrice)}
                    />
                  )}
                </div>
                {owner.current.mailingAddress && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="text-sm text-gray-600">
                        {owner.current.mailingAddress.street}<br />
                        {owner.current.mailingAddress.city}, {owner.current.mailingAddress.state} {owner.current.mailingAddress.zip}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ownership History */}
          {owner.ownershipHistory && owner.ownershipHistory.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Ownership History
              </h4>
              <div className="space-y-2">
                {owner.ownershipHistory.map((record, i) => (
                  <div key={i} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">{record.name}</div>
                      <div className="text-xs text-gray-500">{formatDate(record.purchaseDate)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(record.purchasePrice)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ReportCard>

        {/* Tax Information Card */}
        {property.taxInfo && (
          <ReportCard title="Tax Information" icon={<FileText className="w-5 h-5" />}>
            <div className="grid grid-cols-2 gap-4">
              <DataItem label="Assessed Value" value={formatCurrency(property.taxInfo.assessedValue)} />
              <DataItem label="Annual Tax" value={formatCurrency(property.taxInfo.taxAmount)} />
              <DataItem label="Tax Year" value={property.taxInfo.taxYear?.toString() || 'N/A'} />
              {property.taxInfo.exemptions && property.taxInfo.exemptions.length > 0 && (
                <div className="col-span-2">
                  <div className="text-sm text-gray-500 mb-1">Exemptions</div>
                  <div className="flex flex-wrap gap-2">
                    {property.taxInfo.exemptions.map((exemption, i) => (
                      <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                        {exemption}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ReportCard>
        )}

        {/* Sales History Card */}
        {property.salesHistory && property.salesHistory.length > 0 && (
          <ReportCard title="Sales History" icon={<TrendingUp className="w-5 h-5" />}>
            <div className="space-y-3">
              {property.salesHistory.map((sale, i) => (
                <div key={i} className="flex justify-between items-center p-3 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{sale.event}</div>
                    <div className="text-sm text-gray-500">{formatDate(sale.date)}</div>
                  </div>
                  <div className="text-lg font-semibold text-primary-600">
                    {formatCurrency(sale.price)}
                  </div>
                </div>
              ))}
            </div>
          </ReportCard>
        )}
      </div>

      {/* Report Footer */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Report generated on {formatDate(data.generatedAt)}</p>
        <p className="mt-1">Data aggregated from: {property.sources.join(', ')}</p>
      </div>
    </div>
  );
}

// Sub-components
function ReportCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  subtext,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: 'primary' | 'secondary' | 'gray';
}) {
  const colorClasses = {
    primary: 'bg-primary-50 text-primary-600',
    secondary: 'bg-green-50 text-green-600',
    gray: 'bg-gray-100 text-gray-600'
  };

  return (
    <div className="stat-card">
      <div className={`w-10 h-10 ${colorClasses[color]} rounded-lg flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
      {subtext && <div className="text-sm text-gray-500">{subtext}</div>}
    </div>
  );
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-medium text-gray-900">{value}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-gray-200 rounded-xl" />
          <div className="flex-1">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-5 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card">
            <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-200 rounded-lg" />
              <div className="h-6 bg-gray-200 rounded w-1/3" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="h-12 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
