export interface AddressParams {
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface PropertyBasic {
  propertyType?: string;
  yearBuilt?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: number | string;
  lotSizeAcres?: number;
  stories?: number;
  parking?: number;
  parkingSqft?: number;
  pool?: boolean;
  apn?: string;
  zoning?: string;
}

export interface PropertyDetails {
  construction?: string;
  roofType?: string;
  heating?: string;
  cooling?: string;
  foundation?: string;
  flooring?: string;
  exteriorWalls?: string;
}

export interface TaxInfo {
  assessedValue?: number;
  taxAmount?: number;
  taxYear?: number;
  exemptions?: string[];
}

export interface SaleRecord {
  date: string;
  price: number;
  event: string;
  documentNumber?: string;
}

export interface NeighborhoodData {
  walkScore?: number;
  transitScore?: number;
  bikeScore?: number;
}

export interface ValuationEstimate {
  source: string;
  value: number;
  range?: {
    low: number | null;
    high: number | null;
  };
  confidence: string;
  lastUpdated?: string;
}

export interface RentEstimate {
  monthlyRent: number;
  rentRange?: {
    low: number;
    high: number;
  };
  source: string;
}

export interface Valuation {
  estimates: ValuationEstimate[];
  averageValue: number;
  confidenceScore: string;
  lastUpdated: string;
  rentEstimate?: RentEstimate;
}

export interface Mortgage {
  lender: string;
  originalAmount: number;
  currentBalance?: number;
  interestRate?: number;
  interestRateType?: string;
  loanType?: string;
  term?: number;
  recordingDate?: string;
  maturityDate?: string;
  position?: number;
}

export interface Lien {
  type: string;
  amount: number;
  lender?: string;
  recordedDate?: string;
  documentNumber?: string;
  status?: string;
}

export interface LenderDetails {
  nmlsId?: string;
  name?: string;
  type?: string;
  status?: string;
  licenses?: Array<{
    state: string;
    type: string;
    status: string;
    expirationDate?: string;
  }>;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  phone?: string;
  website?: string;
}

export interface MortgageData {
  mortgages: Mortgage[];
  liens: Lien[];
  lenderDetails?: LenderDetails | null;
  totalOutstanding: number;
  lastUpdated: string;
}

export interface OwnerInfo {
  name?: string;
  mailingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  ownerType?: string;
  ownerOccupied?: boolean;
  purchaseDate?: string;
  purchasePrice?: number;
}

export interface OwnershipHistoryRecord {
  name: string;
  purchaseDate: string;
  purchasePrice: number;
}

export interface OwnerData {
  current: OwnerInfo | null;
  previous: OwnerInfo[];
  ownershipHistory: OwnershipHistoryRecord[];
  lastUpdated: string;
}

export interface EquityInfo {
  estimatedEquity: number;
  equityPercent: number;
  propertyValue: number;
  totalDebt: number;
  loanToValue: number | string;
}

export interface PropertyInfo {
  basic: PropertyBasic | null;
  details: PropertyDetails | null;
  features: string[] | null;
  taxInfo: TaxInfo | null;
  salesHistory: SaleRecord[] | null;
  neighborhood: NeighborhoodData | null;
  sources: string[];
  lastUpdated: string;
}

export interface PropertyData {
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    formatted: string;
  };
  property: PropertyInfo;
  valuation: Valuation;
  mortgage: MortgageData;
  owner: OwnerData;
  equity: EquityInfo | null;
  generatedAt: string;
}

export interface AddressSuggestion {
  address: string;
  city: string;
  state: string;
  zip: string;
  formatted: string;
}
