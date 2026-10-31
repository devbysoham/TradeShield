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

// ---------------------------------------------------------------------------
// Trade Compliance Norms (DGFT / ICEGATE / FEMA / FTA)
// ---------------------------------------------------------------------------

export type ComplianceSeverity = 'high' | 'medium' | 'warning' | 'info';

export interface ComplianceNotification {
  notification_no: string;
  date: string;
  title: string;
  schedule: string;
  impact: string;
  status: string;
  severity: ComplianceSeverity;
}

export interface FtaDetail {
  country: string;
  fta_name: string;
  status: string;
  preferential_rate_pct: number;
  standard_bcd_pct: number;
  rules_of_origin: string[];
  coo_type: string;
  key_sectors: string[];
  official_link: string;
}

export interface CompliancePortal {
  name: string;
  url: string;
  authority: string;
  description: string;
  badge: string;
}

export interface FemaRules {
  realization_deadline_months: number;
  statutory_framework: string;
  edpms_system: string;
  authorized_dealers: string;
  lut_provision: string;
  ebrc?: string;
}

export interface ComplianceOverview {
  master_policy: string;
  scraped_at: string | null;
  source: string | null;
  governing_bodies: string[];
  top_export_destinations: string[];
  top_import_sources: string[];
  top_export_commodities: string[];
  top_import_commodities: string[];
  trading_partners_count: number;
  active_ftas_count: number;
  commodity_codes_count: number;
  other_fta_partners: string[];
  recent_notifications: ComplianceNotification[];
  ftas: FtaDetail[];
  product_categories: string[];
  portals: CompliancePortal[];
  fema_rules: FemaRules;
}

export interface NormsBulletItem {
  label: string;
  value: string;
}

export type NormsBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: NormsBulletItem[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'subheading'; text: string };

export interface NormsLink {
  label: string;
  url: string;
}

export interface NormsSection {
  number: string;
  title: string;
  blocks: NormsBlock[];
  links: NormsLink[];
}

export interface ComplianceNorms {
  document_title: string;
  scraped_at: string | null;
  source: string | null;
  source_urls: string[];
  sections: NormsSection[];
}

export interface ComplianceCheckPayload {
  trade_type: 'export' | 'import';
  partner_country: string;
  product_category?: string;
  hs_code?: string;
  declared_value_usd: number;
  shipping_bill_date?: string;
}

export interface TariffBreakdown {
  standard_bcd_pct: number;
  social_welfare_surcharge_pct: number;
  igst_pct: number;
  total_standard_duty_pct: number;
  standard_duty_usd: number;
  preferential_duty_pct: number;
  preferential_duty_usd: number;
  net_duty_savings_usd: number;
  net_duty_savings_inr: number;
}

export interface ExportIncentives {
  rodtep_rate_pct: number;
  rodtep_rebate_usd: number;
  rodtep_rebate_inr: number;
  advance_authorisation_eligible: boolean;
  epcg_eligible: boolean;
  sion_reference: string;
}

export interface FemaCompliance {
  statutory_rule: string;
  days_elapsed: number;
  days_remaining: number;
  fema_status: string;
  notice: string;
  edpms_knockoff_pending: boolean;
}

export interface ComplianceCheckResult {
  product_category: string;
  hs_code: string;
  trade_type: string;
  partner_country: string;
  matched_fta_country: string | null;
  declared_value_usd: number;
  shipping_bill_date: string | null;
  policy_status: string;
  is_restricted: boolean;
  policy_alerts: string[];
  tariff_breakdown: TariffBreakdown;
  fta_details: FtaDetail | null;
  export_incentives: ExportIncentives;
  mandatory_documents: string[];
  issuing_authorities: string[];
  fema_compliance: FemaCompliance;
  norms_metadata: { scraped_at: string | null; source: string | null };
}

