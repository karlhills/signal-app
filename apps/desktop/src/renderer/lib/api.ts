export type ManualStatus = 'AUTO' | 'AVAILABLE' | 'WORKING' | 'MEETING' | 'DND' | 'OFF';
export type EffectiveStatus = 'AVAILABLE' | 'WORKING' | 'MEETING' | 'DND' | 'OFF';

export interface StatusResponse {
  ok: boolean;
  effectiveStatus: EffectiveStatus;
  manualStatus: ManualStatus;
  detectedMeeting: boolean;
  autoDetectEnabled: boolean;
}

export interface StatusMapping {
  color: string;
  brightness: number;
}

export interface Config {
  manualStatus: ManualStatus;
  autoDetectEnabled: boolean;
  govee: {
    apiKey: string;
    devices: { deviceId: string; deviceModel: string; deviceName: string }[];
    allowInsecureTls: boolean;
    lastResult: { ok: boolean; message: string; at: number } | null;
    lastDevices?: { ok: boolean; message: string; at: number; raw?: unknown } | null;
  };
  webhook: {
    enabled: boolean;
    url: string;
    method: 'POST';
    headers?: Record<string, string>;
    statuses?: EffectiveStatus[];
    timeoutMs?: number;
    retryOnce?: boolean;
    lastResult: { ok: boolean; message: string; at: number } | null;
  };
  mqtt: {
    enabled: boolean;
    brokerUrl: string;
    username?: string;
    password?: string;
    baseTopic: string;
    retain: boolean;
  };
  mappings: Record<EffectiveStatus, StatusMapping>;
  meetingKeywords: string[];
}

export interface DiagnosticsResponse {
  ok: boolean;
  logs: { level: string; message: string; at: number }[];
  govee: { ok: boolean; message: string; at: number } | null;
  goveeDevices?: { ok: boolean; message: string; at: number; raw?: unknown } | null;
  webhook?: { ok: boolean; message: string; at: number } | null;
  mqtt?: { connected: boolean; error?: string | null };
  meeting: {
    detectedMeeting: boolean;
    confidence: 'high' | 'low';
    reasons: string[];
    activeWindowTitle?: string;
    activeWindowOwner?: string;
    matchedProcesses: string[];
    lastUpdatedAt: number;
  };
}

const API_URL = import.meta.env.VITE_SIGNAL_API_URL ?? 'http://localhost:3214';

export async function getStatus(): Promise<StatusResponse> {
  return request('/status');
}

export async function setManualStatus(manualStatus: ManualStatus) {
  return request('/status', {
    method: 'POST',
    body: JSON.stringify({ manualStatus })
  });
}

export async function setAutoDetect(enabled: boolean) {
  return request('/autodetect', {
    method: 'POST',
    body: JSON.stringify({ enabled })
  });
}

export async function getConfig(): Promise<{ ok: boolean; config: Config }> {
  return request('/config');
}

export async function updateConfig(partial: Partial<Config>) {
  return request('/config', {
    method: 'POST',
    body: JSON.stringify(partial)
  });
}

export async function refreshDevices() {
  return request('/govee/refresh', {
    method: 'POST'
  });
}

export async function testWebhook() {
  return request('/integrations/webhook/test', {
    method: 'POST'
  });
}

export async function testMqtt() {
  return request('/integrations/mqtt/test', {
    method: 'POST'
  });
}

export async function getDiagnostics(): Promise<DiagnosticsResponse> {
  return request('/diagnostics');
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...init
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  return response.json();
}
