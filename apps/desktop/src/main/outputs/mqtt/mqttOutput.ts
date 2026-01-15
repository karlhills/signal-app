import os from 'node:os';
import type { Output, OutputConfig, OutputContext, OutputResult } from '../types.js';
import type { StoreManager } from '../../store.js';
import type { Logger } from '../../utils/log.js';
import type { MqttConfig, MqttStatusDetailPayload } from './types.js';
import { MqttClientManager } from './mqttClient.js';

export class MqttOutput implements Output {
  constructor(
    private client: MqttClientManager,
    private store: StoreManager,
    private logger: Logger
  ) {}

  async apply(
    status: OutputContext['state']['effectiveStatus'],
    _config: OutputConfig | null,
    context?: OutputContext
  ): Promise<OutputResult> {
    const mqtt = this.store.getConfig().mqtt;
    if (!context) {
      return { ok: false, message: 'Missing MQTT context' };
    }
    if (!mqtt.enabled || !mqtt.brokerUrl) {
      await this.client.ensureConnected(mqtt);
      return { ok: true, message: 'MQTT disabled' };
    }
    await this.client.ensureConnected(mqtt);
    const base = (mqtt.baseTopic || 'signal').replace(/\/+$/, '');
    const timestamp = new Date().toISOString();
    const statusPayload = JSON.stringify({ status, timestamp });
    const detailPayload = JSON.stringify(this.buildDetailPayload(context, timestamp));

    const [statusResult, detailResult] = await Promise.all([
      this.client.publish(`${base}/status`, statusPayload, mqtt),
      this.client.publish(`${base}/status/detail`, detailPayload, mqtt)
    ]);

    if (!statusResult.ok || !detailResult.ok) {
      const message = statusResult.ok ? detailResult.message : statusResult.message;
      this.logger.warn('MQTT publish failed', { message });
      return { ok: false, message };
    }
    return { ok: true, message: 'MQTT published' };
  }

  async testPublish(): Promise<{ ok: boolean; message: string }> {
    const mqtt = this.store.getConfig().mqtt;
    if (!mqtt.enabled || !mqtt.brokerUrl) {
      await this.client.ensureConnected(mqtt);
      return { ok: false, message: 'MQTT disabled' };
    }
    await this.client.ensureConnected(mqtt);
    const base = (mqtt.baseTopic || 'signal').replace(/\/+$/, '');
    const payload = JSON.stringify({
      status: 'AVAILABLE',
      timestamp: new Date().toISOString()
    });
    return this.client.publish(`${base}/status`, payload, mqtt);
  }

  private buildDetailPayload(context: OutputContext, timestamp: string): MqttStatusDetailPayload {
    return {
      effectiveStatus: context.state.effectiveStatus,
      previousStatus: context.previousStatus,
      manualStatus: context.state.manualStatus,
      detectedMeeting: context.state.detectedMeeting,
      confidence: context.meeting.confidence,
      reasons: context.meeting.reasons,
      hostname: context.hostname || os.hostname(),
      timestamp
    };
  }
}
