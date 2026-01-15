import type { EffectiveStatus } from '../../engine/types.js';
import type { Output, OutputConfig, OutputResult, OutputContext } from '../types.js';
import { debounce } from '../../utils/debounce.js';
import type { Logger } from '../../utils/log.js';
import type { StoreManager } from '../../store.js';
import { GoveeClient } from './goveeClient.js';

const DEBOUNCE_MS = 500;

export class GoveeOutput implements Output {
  private lastStatus: EffectiveStatus | null = null;
  private debouncedApply: (status: EffectiveStatus, config: OutputConfig | null) => void;

  constructor(
    private client: GoveeClient,
    private store: StoreManager,
    private logger: Logger
  ) {
    this.debouncedApply = debounce((status: EffectiveStatus, config: OutputConfig | null) => {
      this.applyNow(status, config).catch((error) => {
        this.logger.error('Govee apply failed', { error: String(error) });
      });
    }, DEBOUNCE_MS);
  }

  async apply(
    status: EffectiveStatus,
    config: OutputConfig | null,
    _context?: OutputContext
  ): Promise<OutputResult> {
    if (status === this.lastStatus) {
      return { ok: true, message: 'No change' };
    }
    this.lastStatus = status;
    this.debouncedApply(status, config);
    return { ok: true, message: 'Queued' };
  }

  private async applyNow(status: EffectiveStatus, config: OutputConfig | null): Promise<OutputResult> {
    const govee = this.store.getConfig().govee;
    const devices = govee.devices.filter((device) => device.deviceId && device.deviceModel);
    if (!govee.apiKey || devices.length === 0) {
      return { ok: false, message: 'Govee not configured' };
    }

    if (status === 'OFF') {
      const results = [];
      for (const device of devices) {
        results.push(await this.client.setPower(device.deviceId, device.deviceModel, false));
      }
      return summarizeResults(results, devices.length);
    }

    const scene = config ?? { color: '#ffffff', brightness: 50 };
    const rgb = hexToRgb(scene.color);

    const results = [];
    for (const device of devices) {
      results.push(await this.client.setPower(device.deviceId, device.deviceModel, true));
      results.push(await this.client.setBrightness(device.deviceId, device.deviceModel, scene.brightness));
      results.push(await this.client.setColor(device.deviceId, device.deviceModel, rgb));
    }
    return summarizeResults(results, devices.length);
  }
}

function hexToRgb(hex: string) {
  const cleaned = hex.replace('#', '');
  const parsed = cleaned.length === 3
    ? cleaned
        .split('')
        .map((char) => char + char)
        .join('')
    : cleaned;
  const value = Number.parseInt(parsed, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function summarizeResults(results: OutputResult[], deviceCount: number): OutputResult {
  if (results.length === 0) {
    return { ok: false, message: 'No devices updated' };
  }
  const ok = results.every((result) => result.ok);
  if (ok) {
    return {
      ok: true,
      message: `Applied to ${deviceCount} device${deviceCount === 1 ? '' : 's'}`
    };
  }
  const failure = results.find((result) => !result.ok);
  return { ok: false, message: failure?.message ?? 'One or more devices failed' };
}
