export type Role = 'exporter' | 'importer';

export interface ForexRate {
  pair: string;
  spot: number;
  changeDay: number;
  changePercent: number;
  dayHigh: number;
  dayLow: number;
  forward1M: number;
  forward3M: number;
  forwardPremiumAnnualized: number;
  volatility30D: number;
  rbiRefRate: number;
  lastUpdated: string;
  source: string;
}

export interface ForexTimeSeriesPoint {
  date: string;
  spot?: number;
  forecast?: number;
  upperBand?: number;
  lowerBand?: number;
  baseline?: number; // No-change baseline for comparison
  bandRange?: [number, number]; // [lowerBand, upperBand]
  bandWidth?: number; // upperBand - lowerBand for stacked area
  type: 'historical' | 'boundary' | 'forecast';
}

export interface ModelMetrics {
  version: string;
  lastTrained: string;
  directionAccuracy: number;
  directionConfidenceInterval: [number, number];
  baselineAccuracy: number;
  rmse: number;
  mae: number;
  brierScore: number;
  featuresTracked: string[];
  sampleEvaluationNotice: string;
}

export interface AdvisorRecommendation {
  headline: string;
  badge: string;
  badgeType: 'lime' | 'coral' | 'amber' | 'teal';
  exposureTarget: string;
  bankForwardQuote: number;
  expectedSpot: number;
  spotSpread: string;
  downsideRiskProtected: string;
  reasoning: string;
  suggestedAction: string;
}

export interface WorkspaceSummary {
  userName: string;
  companyName: string;
  role: Role;
  title: string;
  currencyExposureLabel: string;
  totalExposureUSD: number;
  totalExposureINR: number;
  hedgedAmountUSD: number;
  unhedgedAmountUSD: number;
  hedgeRatio: number;
  riskDirectionText: string;
  primaryRiskMetric: string;
  activeShipmentsCount: number;
  shipmentsAtRiskCount: number;
  documentsNeedingAttention: number;
  pendingPaymentsUSD: number;
  nextSettlementDate: string;
  nextSettlementAmount: string;
  advisorRecommendation: AdvisorRecommendation;
}

export interface ShipmentMilestone {
  date: string;
  event: string;
  status: 'completed' | 'in-progress' | 'pending';
}

export interface ShipmentRiskFactors {
  portCongestion: string;
  weatherRisk: string;
  routeDisruption: string;
  vesselDelay: string;
}

export interface Shipment {
  id: string;
  reference: string;
  role: Role;
  origin: string;
  destination: string;
  cargo: string;
  carrier: string;
  voyage: string;
  departureDate: string;
  estimatedArrival: string;
  status: 'In Transit' | 'Delayed' | 'Delivered' | 'Customs Hold';
  riskLevel: 'Low' | 'Moderate' | 'Elevated' | 'Critical';
  riskScore: number;
  riskFactors: ShipmentRiskFactors;
  costExposureEstimate: string;
  associatedInvoiceUSD: number;
  insuranceStatus: string;
  coordinates?: { lat: number; lng: number };
  milestones: ShipmentMilestone[];
}

export interface TradeDocument {
  id: string;
  title: string;
  type: 'Commercial Invoice' | 'Insurance Certificate' | 'Bill of Lading' | 'Packing List' | 'Certificate of Origin' | 'Bill of Entry';
  shipmentRef: string;
  counterparty: string;
  uploadDate: string;
  fileSize: string;
  fileName: string;
  sha256Hash: string;
  integrityStatus: 'Verified' | 'Tamper Detected' | 'Attention Needed' | 'Unverified';
  verificationDetails: {
    algorithm: string;
    notarySource: string;
    signedBy: string;
    verifiedAt: string;
    qrPayload: string;
    isTamperProof: boolean;
  };
  amountUSD: number;
}

export interface ForwardContract {
  id: string;
  bank: string;
  contractType: string;
  currencyPair: string;
  notionalUSD: number;
  lockedRate: number;
  spotAtBooking: number;
  bookingDate: string;
  maturityDate: string;
  status: 'Active' | 'Matured & Settled' | 'Draft' | 'Pending Signatures';
  integrityHash: string;
  digitalSignature: string;
  mtmGainLossINR: number;
  settlementInstructions: string;
  lifecycleStage?: 'draft' | 'hashed' | 'signed' | 'shipped' | 'paid';
}

export interface AuditActivity {
  id: string;
  timestamp: string;
  event: string;
  category: string;
  actor: string;
  details: string;
  status: 'Success' | 'Alert' | 'Warning';
  hashVerification: string;
}

