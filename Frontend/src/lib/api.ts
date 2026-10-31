import useSWR from 'swr';
import { 
  CURRENT_FOREX_RATES, 
  USD_INR_TIME_SERIES, 
  FORECAST_MODEL_METRICS,
  WORKSPACE_DATA,
  SHIPMENTS_DATA,
  DOCUMENTS_DATA,
  FORWARD_CONTRACTS_DATA,
  AUDIT_ACTIVITY_LOG,
  COMPLIANCE_OVERVIEW,
  COMPLIANCE_NORMS
} from '../data/mockData';
import { 
  Role, 
  ForexRate, 
  ForexTimeSeriesPoint, 
  ModelMetrics, 
  WorkspaceSummary, 
  Shipment, 
  TradeDocument, 
  ForwardContract, 
  AuditActivity,
  ComplianceOverview,
  ComplianceNorms,
  ComplianceCheckPayload,
  ComplianceCheckResult
} from '../types';

// Generic fetcher calling relative /api/* URLs (proxied to FastAPI via next.config.js rewrite)
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error: any = new Error(`An error occurred while fetching ${url}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
};

export function useForexData() {
  const { data, error, isLoading, mutate } = useSWR<{
    rates: Record<string, ForexRate>;
    timeSeries: ForexTimeSeriesPoint[];
    metrics: ModelMetrics;
  }>('/api/forex/usd-inr', fetcher, {
    fallbackData: {
      rates: CURRENT_FOREX_RATES,
      timeSeries: USD_INR_TIME_SERIES,
      metrics: FORECAST_MODEL_METRICS,
    },
    revalidateOnFocus: true,
    revalidateIfStale: true,
    dedupingInterval: 5000,
    onErrorRetry: () => {
      // Graceful fallback to mock data when FastAPI backend is not yet started
    }
  });

  return {
    rates: data?.rates ?? CURRENT_FOREX_RATES,
    timeSeries: data?.timeSeries ?? USD_INR_TIME_SERIES,
    metrics: data?.metrics ?? FORECAST_MODEL_METRICS,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useWorkspaceSummary(role: Role = 'exporter') {
  const { data, error, isLoading, mutate } = useSWR<WorkspaceSummary>(
    `/api/workspace?role=${role}`,
    fetcher,
    {
      fallbackData: WORKSPACE_DATA[role],
      dedupingInterval: 5000,
      onErrorRetry: () => {}
    }
  );

  return {
    workspace: data ?? WORKSPACE_DATA[role],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useShipments(role?: Role) {
  const { data, error, isLoading, mutate } = useSWR<Shipment[]>(
    role ? `/api/shipments?role=${role}` : '/api/shipments',
    fetcher,
    {
      fallbackData: role 
        ? SHIPMENTS_DATA.filter(s => s.role === role)
        : SHIPMENTS_DATA,
      dedupingInterval: 5000,
      onErrorRetry: () => {}
    }
  );

  const shipments = data ?? (role ? SHIPMENTS_DATA.filter(s => s.role === role) : SHIPMENTS_DATA);

  return {
    shipments,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useDocuments(shipmentId?: string) {
  const { data, error, isLoading, mutate } = useSWR<TradeDocument[]>(
    shipmentId ? `/api/documents?shipmentId=${shipmentId}` : '/api/documents',
    fetcher,
    {
      fallbackData: shipmentId 
        ? DOCUMENTS_DATA.filter(d => d.shipmentRef === shipmentId)
        : DOCUMENTS_DATA,
      dedupingInterval: 5000,
      onErrorRetry: () => {}
    }
  );

  return {
    documents: data ?? DOCUMENTS_DATA,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useForwardContracts() {
  const { data, error, isLoading, mutate } = useSWR<ForwardContract[]>(
    '/api/contracts/forward',
    fetcher,
    {
      fallbackData: FORWARD_CONTRACTS_DATA,
      dedupingInterval: 5000,
      onErrorRetry: () => {}
    }
  );

  return {
    contracts: data ?? FORWARD_CONTRACTS_DATA,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useAuditActivity() {
  const { data, error, isLoading, mutate } = useSWR<AuditActivity[]>(
    '/api/audit/logs',
    fetcher,
    {
      fallbackData: AUDIT_ACTIVITY_LOG,
      dedupingInterval: 5000,
      onErrorRetry: () => {}
    }
  );

  return {
    activity: data ?? AUDIT_ACTIVITY_LOG,
    isLoading,
    isError: error,
    mutate,
  };
}

// ---------------------------------------------------------------------------
// Trade Compliance Norms (DGFT / ICEGATE / FEMA / FTA)
// ---------------------------------------------------------------------------

export function useComplianceOverview() {
  const { data, error, isLoading, mutate } = useSWR<ComplianceOverview>(
    '/api/compliance/overview',
    fetcher,
    {
      fallbackData: COMPLIANCE_OVERVIEW,
      dedupingInterval: 30000,
      revalidateOnFocus: false,
      onErrorRetry: () => {}
    }
  );

  return {
    overview: data ?? COMPLIANCE_OVERVIEW,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useComplianceNorms() {
  const { data, error, isLoading, mutate } = useSWR<ComplianceNorms>(
    '/api/compliance/norms',
    fetcher,
    {
      fallbackData: COMPLIANCE_NORMS,
      dedupingInterval: 30000,
      revalidateOnFocus: false,
      onErrorRetry: () => {}
    }
  );

  return {
    norms: data ?? COMPLIANCE_NORMS,
    isLoading,
    isError: error,
    mutate,
  };
}

// POST-based compliance checker (FastAPI endpoint, mirrors backend schemas)
export async function runComplianceCheck(
  payload: ComplianceCheckPayload
): Promise<ComplianceCheckResult> {
  const res = await fetch('/api/compliance/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Compliance check failed with status ${res.status}`);
  }
  return res.json();
}

