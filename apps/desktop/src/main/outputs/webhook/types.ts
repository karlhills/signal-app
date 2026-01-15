import type { EffectiveStatus, ManualStatus } from '../../engine/types.js';

export type WebhookStatusFilter = EffectiveStatus;

export interface WebhookConfig {
  enabled: boolean;
  url: string;
  method: 'POST';
  headers?: Record<string, string>;
  statuses?: WebhookStatusFilter[];
  timeoutMs?: number;
  retryOnce?: boolean;
}

export interface WebhookPayload {
  app: 'signal';
  version: string;
  timestamp: string;
  effectiveStatus: EffectiveStatus;
  previousStatus: EffectiveStatus | null;
  manualStatus: ManualStatus;
  detectedMeeting: boolean;
  confidence: 'high' | 'low';
  reasons: string[];
  platform: 'macOS' | 'Windows' | 'Linux';
}

export interface WebhookResult {
  ok: boolean;
  message: string;
  at: number;
}
