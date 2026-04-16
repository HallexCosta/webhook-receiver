export interface WebhookCall {
  id: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  query: Record<string, string>;
  contentType: string | null;
  ip: string | null;
  timestamp: number;
}

export interface Endpoint {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
  calls: WebhookCall[];
}

export interface EndpointSummary {
  id: string;
  name: string;
  active: boolean;
  createdAt: number;
  callCount: number;
}
