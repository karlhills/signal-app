import type { Output, OutputConfig, OutputContext, OutputResult } from '../types.js';
import type { StoreManager } from '../../store.js';
import type { Logger } from '../../utils/log.js';
import type { WebhookConfig, WebhookPayload, WebhookResult } from './types.js';
import { WebhookClient } from './webhookClient.js';

export class WebhookOutput implements Output {
  constructor(
    private client: WebhookClient,
    private store: StoreManager,
    private logger: Logger,
    private getVersion: () => string
  ) {}

  async apply(
    status: OutputContext['state']['effectiveStatus'],
    _config: OutputConfig | null,
    context?: OutputContext
  ): Promise<OutputResult> {
    const webhook = this.store.getConfig().webhook;
    if (!context) {
      return { ok: false, message: 'Missing webhook context' };
    }
    if (!this.shouldSend(webhook, status)) {
      return { ok: true, message: 'Webhook skipped' };
    }
    const payload = this.buildPayload(context);
    const result = await this.client.send(payload, webhook);
    this.store.setWebhookResult(result);
    if (!result.ok) {
      this.logger.warn('Webhook delivery failed', { message: result.message });
    }
    return { ok: result.ok, message: result.message };
  }

  async sendTest(payloadOverride?: Partial<WebhookPayload>): Promise<WebhookResult> {
    const webhook = this.store.getConfig().webhook;
    const payload = this.buildPayload({
      previousStatus: null,
      state: {
        manualStatus: 'AUTO',
        autoDetectEnabled: true,
        detectedMeeting: false,
        effectiveStatus: 'AVAILABLE'
      },
      meeting: {
        detectedMeeting: false,
        confidence: 'low',
        reasons: ['Test payload'],
        matchedProcesses: [],
        lastUpdatedAt: Date.now()
      },
      version: this.getVersion(),
      hostname: 'localhost'
    });
    const merged = { ...payload, ...payloadOverride };
    const result = await this.client.send(merged, webhook);
    this.store.setWebhookResult(result);
    return result;
  }

  private shouldSend(config: WebhookConfig, status: OutputContext['state']['effectiveStatus']) {
    if (!config.enabled) {
      return false;
    }
    if (!config.url) {
      this.logger.warn('Webhook URL missing');
      return false;
    }
    if (config.statuses && config.statuses.length > 0) {
      return config.statuses.includes(status);
    }
    return true;
  }

  private buildPayload(context: OutputContext): WebhookPayload {
    return {
      app: 'signal',
      version: context.version,
      timestamp: new Date().toISOString(),
      effectiveStatus: context.state.effectiveStatus,
      previousStatus: context.previousStatus,
      manualStatus: context.state.manualStatus,
      detectedMeeting: context.state.detectedMeeting,
      confidence: context.meeting.confidence,
      reasons: context.meeting.reasons,
      platform: resolvePlatform()
    };
  }
}

function resolvePlatform() {
  if (process.platform === 'darwin') return 'macOS';
  if (process.platform === 'win32') return 'Windows';
  return 'Linux';
}
