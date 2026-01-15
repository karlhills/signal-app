import axios from 'axios';
import https from 'node:https';
import crypto from 'node:crypto';
import type { Logger } from '../../utils/log.js';
import type { GoveeDevice, GoveeDevicesResult, GoveeResult } from './types.js';

const OPEN_API_BASE = 'https://openapi.api.govee.com/router/api/v1';

export class GoveeClient {
  constructor(
    private getApiKey: () => string,
    private getAllowInsecureTls: () => boolean,
    private logger: Logger,
    private recordResult: (result: GoveeResult) => void
  ) {}

  async listDevices(): Promise<GoveeDevicesResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        ok: false,
        message: 'Missing API key',
        devices: [] as GoveeDevice[],
        at: Date.now()
      };
    }
    try {
      const response = await axios.get(`${OPEN_API_BASE}/user/devices`, {
        headers: {
          'Govee-API-Key': apiKey,
          'Content-Type': 'application/json'
        },
        httpsAgent: this.getHttpsAgent()
      });
      const rawData = response.data;
      const rawDevices =
        rawData?.data?.devices ??
        rawData?.devices ??
        rawData?.data?.list ??
        rawData?.data ??
        [];
      const devices: GoveeDevice[] = Array.isArray(rawDevices)
        ? rawDevices.map((device) => ({
            device: device.device,
            model: device.model ?? device.sku ?? 'unknown',
            deviceName: device.deviceName ?? device.name ?? 'Unnamed device'
          }))
        : [];
      return {
        ok: true,
        message: 'Loaded devices',
        devices,
        raw: rawData,
        at: Date.now()
      };
    } catch (error) {
      const message = `Govee device fetch failed: ${String(error)}`;
      this.logger.warn(message);
      this.recordResult({ ok: false, message, at: Date.now() });
      return {
        ok: false,
        message,
        devices: [] as GoveeDevice[],
        at: Date.now()
      };
    }
  }

  async setPower(device: string, model: string, on: boolean): Promise<GoveeResult> {
    return this.sendCapability(device, model, {
      type: 'devices.capabilities.on_off',
      instance: 'powerSwitch',
      value: on ? 1 : 0
    });
  }

  async setBrightness(device: string, model: string, brightness: number): Promise<GoveeResult> {
    return this.sendCapability(device, model, {
      type: 'devices.capabilities.range',
      instance: 'brightness',
      value: brightness
    });
  }

  async setColor(device: string, model: string, color: { r: number; g: number; b: number }): Promise<GoveeResult> {
    const rgb = (color.r << 16) | (color.g << 8) | color.b;
    return this.sendCapability(device, model, {
      type: 'devices.capabilities.color_setting',
      instance: 'colorRgb',
      value: rgb
    });
  }

  private async sendCapability(
    device: string,
    model: string,
    capability: { type: string; instance: string; value: number }
  ): Promise<GoveeResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      const message = 'Missing API key';
      return { ok: false, message, at: Date.now() };
    }
    try {
      const response = await axios.post(
        `${OPEN_API_BASE}/device/control`,
        {
          requestId: crypto.randomUUID(),
          payload: {
            sku: model,
            device,
            capability
          }
        },
        {
          headers: {
            'Govee-API-Key': apiKey,
            'Content-Type': 'application/json'
          },
          httpsAgent: this.getHttpsAgent()
        }
      );
      const ok = response.data?.code === 200;
      const message = ok ? 'Command sent' : response.data?.message ?? 'Command failed';
      const result = { ok, message, at: Date.now() };
      this.recordResult(result);
      return result;
    } catch (error) {
      const message = `Govee command failed: ${String(error)}`;
      const result = { ok: false, message, at: Date.now() };
      this.logger.warn(message);
      this.recordResult(result);
      return result;
    }
  }

  private getHttpsAgent() {
    if (!this.getAllowInsecureTls()) {
      return undefined;
    }
    return new https.Agent({ rejectUnauthorized: false });
  }
}
