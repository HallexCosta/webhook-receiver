export interface ForwardingResult {
  url: string;
  status: number;
  duration: number;
  success: boolean;
  error?: string;
}

export interface WebhookCall {
  id: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  query: Record<string, string>;
  contentType: string | null;
  ip: string | null;
  source: string | null;
  timestamp: number;
  forwarding?: ForwardingResult;
}

export interface Endpoint {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
  forwardUrl?: string;
  calls: WebhookCall[];
}

export interface EndpointSummary {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
  callCount: number;
  forwardUrl?: string;
}

export interface SessionLimits {
  endpointsUsed: number;
  endpointsMax: number;
  callsMaxPerEndpoint: number;
  retentionHours: number;
}

export interface User {
  email: string;
  tier: 'freemium' | 'paid';
  createdAt: number;
  limits: {
    maxEndpoints: number;
    maxCalls: number;
    ttl: number;
  };
}
