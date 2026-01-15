import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';
import type { Logger } from '../../utils/log.js';
import type { MqttConfig } from './types.js';

export class MqttClientManager {
  private client: MqttClient | null = null;
  private connected = false;
  private lastError: string | null = null;
  private configKey: string | null = null;

  constructor(private logger: Logger) {}

  getStatus() {
    return { connected: this.connected, error: this.lastError };
  }

  async ensureConnected(config: MqttConfig) {
    if (!config.enabled || !config.brokerUrl) {
      this.teardown();
      return;
    }
    const nextKey = JSON.stringify({
      brokerUrl: config.brokerUrl,
      username: config.username ?? '',
      password: config.password ?? ''
    });
    if (this.client && this.configKey === nextKey) {
      return;
    }
    this.teardown();
    this.configKey = nextKey;
    const options: IClientOptions = {
      username: config.username,
      password: config.password,
      reconnectPeriod: 2000
    };
    this.client = mqtt.connect(config.brokerUrl, options);
    this.client.on('connect', () => {
      this.connected = true;
      this.lastError = null;
    });
    this.client.on('reconnect', () => {
      this.connected = false;
    });
    this.client.on('close', () => {
      this.connected = false;
    });
    this.client.on('error', (error) => {
      this.lastError = String(error);
      this.connected = false;
      this.logger.warn('MQTT error', { error: this.lastError });
    });
  }

  async publish(
    topic: string,
    payload: string,
    config: MqttConfig
  ): Promise<{ ok: boolean; message: string }> {
    if (!config.enabled) {
      return { ok: false, message: 'MQTT disabled' };
    }
    if (!config.brokerUrl) {
      return { ok: false, message: 'Missing broker URL' };
    }
    await this.ensureConnected(config);
    if (!this.client) {
      return { ok: false, message: 'MQTT client unavailable' };
    }
    return new Promise((resolve) => {
      this.client?.publish(topic, payload, { retain: config.retain }, (error) => {
        if (error) {
          const message = `MQTT publish failed: ${String(error)}`;
          this.logger.warn(message);
          resolve({ ok: false, message });
        } else {
          resolve({ ok: true, message: 'MQTT published' });
        }
      });
    });
  }

  private teardown() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
    this.configKey = null;
    this.connected = false;
  }
}
