import axios from 'axios';
import crypto from 'node:crypto';
import type { Logger } from '../../utils/log.js';
import type { WebhookConfig, WebhookPayload, WebhookResult } from './types.js';

const DEFAULT_TIMEOUT = 3000;

export class WebhookClient {
  constructor(private logger: Logger) {}

  async send(payload: WebhookPayload, config: WebhookConfig): Promise<WebhookResult> {
    const eventId = crypto.randomUUID();
    return this.sendWithRetry(payload, config, eventId);
  }

  private async sendWithRetry(
    payload: WebhookPayload,
    config: WebhookConfig,
    eventId: string
  ): Promise<WebhookResult> {
    const result = await this.sendOnce(payload, config, eventId);
    if (result.ok) {
      return result;
    }
    if (config.retryOnce === false) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return this.sendOnce(payload, config, eventId);
  }

  private async sendOnce(
    payload: WebhookPayload,
    config: WebhookConfig,
    eventId: string
  ): Promise<WebhookResult> {
    if (!config.url) {
      return { ok: false, message: 'Missing webhook URL', at: Date.now() };
    }
    try {
      await axios.request({
        url: config.url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signal-Event-Id': eventId,
          ...(config.headers ?? {})
        },
        timeout: config.timeoutMs ?? DEFAULT_TIMEOUT,
        data: payload
      });
      return { ok: true, message: 'Webhook delivered', at: Date.now() };
    } catch (error) {
      const message = `Webhook failed: ${String(error)}`;
      this.logger.warn(message);
      return { ok: false, message, at: Date.now() };
    }
  }
}
