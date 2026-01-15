import Store from 'electron-store';
import { z } from 'zod';
import type { ManualStatus } from './engine/types.js';
import type { Logger } from './utils/log.js';
import type { GoveeResult } from './outputs/govee/types.js';

const ManualStatusSchema = z.enum([
  'AUTO',
  'AVAILABLE',
  'WORKING',
  'MEETING',
  'DND',
  'OFF'
]);

const EffectiveStatusSchema = z.enum(['AVAILABLE', 'WORKING', 'MEETING', 'DND', 'OFF']);

const StatusSceneSchema = z.object({
  color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  brightness: z.number().min(0).max(100)
});

const MappingSchema = z.object({
  AVAILABLE: StatusSceneSchema,
  WORKING: StatusSceneSchema,
  MEETING: StatusSceneSchema,
  DND: StatusSceneSchema,
  OFF: StatusSceneSchema
});

const MeetingKeywordsSchema = z.array(z.string());

const GoveeDeviceSchema = z.object({
  deviceId: z.string(),
  deviceModel: z.string(),
  deviceName: z.string()
});

const GoveeSchema = z.preprocess((input) => {
  if (!input || typeof input !== 'object') return input;
  const data = input as Record<string, unknown>;
  if (Array.isArray(data.devices)) return input;
  if (typeof data.deviceId === 'string') {
    const deviceId = data.deviceId;
    const deviceModel = typeof data.deviceModel === 'string' ? data.deviceModel : '';
    const deviceName = typeof data.deviceName === 'string' ? data.deviceName : '';
    const devices = deviceId ? [{ deviceId, deviceModel, deviceName }] : [];
    return { ...data, devices };
  }
  return input;
}, z.object({
  apiKey: z.string(),
  devices: z.array(GoveeDeviceSchema),
  allowInsecureTls: z.boolean(),
  lastResult: z
    .object({
      ok: z.boolean(),
      message: z.string(),
      at: z.number()
    })
    .nullable(),
  lastDevices: z
    .object({
      ok: z.boolean(),
      message: z.string(),
      at: z.number(),
      raw: z.unknown().optional()
    })
    .nullable()
}));

const WebhookSchema = z.object({
  enabled: z.boolean(),
  url: z.string(),
  method: z.literal('POST'),
  headers: z.record(z.string()).optional(),
  statuses: z.array(EffectiveStatusSchema).optional(),
  timeoutMs: z.number().optional(),
  retryOnce: z.boolean().optional(),
  lastResult: z
    .object({
      ok: z.boolean(),
      message: z.string(),
      at: z.number()
    })
    .nullable()
});

const MqttSchema = z.object({
  enabled: z.boolean(),
  brokerUrl: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  baseTopic: z.string(),
  retain: z.boolean()
});


const ConfigSchema = z.object({
  manualStatus: ManualStatusSchema,
  autoDetectEnabled: z.boolean(),
  govee: GoveeSchema,
  webhook: WebhookSchema,
  mqtt: MqttSchema,
  mappings: MappingSchema,
  meetingKeywords: MeetingKeywordsSchema
});

export type Config = z.infer<typeof ConfigSchema>;

const defaults: Config = {
  manualStatus: 'AUTO',
  autoDetectEnabled: true,
  govee: {
    apiKey: '',
    devices: [],
    allowInsecureTls: false,
    lastResult: null,
    lastDevices: null
  },
  webhook: {
    enabled: false,
    url: '',
    method: 'POST',
    headers: {},
    statuses: undefined,
    timeoutMs: 3000,
    retryOnce: true,
    lastResult: null
  },
  mqtt: {
    enabled: false,
    brokerUrl: '',
    username: undefined,
    password: undefined,
    baseTopic: 'signal',
    retain: true
  },
  mappings: {
    AVAILABLE: { color: '#16a34a', brightness: 80 },
    WORKING: { color: '#f59e0b', brightness: 70 },
    MEETING: { color: '#ef4444', brightness: 80 },
    DND: { color: '#4338ca', brightness: 60 },
    OFF: { color: '#000000', brightness: 0 }
  },
  meetingKeywords: [
    'meeting',
    'call',
    'zoom meeting',
    'microsoft teams',
    'teams',
    'echo',
    'webex',
    'google meet',
    'meet -',
    'meet.google.com'
  ]
};

export class StoreManager {
  private store: Store<Config>;

  constructor(private logger: Logger) {
    this.store = new Store<Config>({ name: 'signal', defaults });
  }

  getConfig(): Config {
    const raw = this.store.store as Partial<Config>;
    const merged: Config = {
      ...defaults,
      ...raw,
      govee: {
        ...defaults.govee,
        ...(raw.govee ?? {})
      },
      webhook: {
        ...defaults.webhook,
        ...(raw.webhook ?? {})
      },
      mqtt: {
        ...defaults.mqtt,
        ...(raw.mqtt ?? {})
      },
      mappings: {
        ...defaults.mappings,
        ...(raw.mappings ?? {})
      },
      meetingKeywords: Array.isArray(raw.meetingKeywords)
        ? raw.meetingKeywords
        : defaults.meetingKeywords
    };
    const parsed = ConfigSchema.safeParse(merged);
    if (!parsed.success) {
      this.logger.warn('Invalid config detected, resetting to defaults');
      this.store.store = defaults;
      return { ...defaults };
    }
    return parsed.data;
  }

  updateConfig(
    partial: Partial<Config> & {
      govee?: Partial<Config['govee']>;
      webhook?: Partial<Config['webhook']>;
      mqtt?: Partial<Config['mqtt']>;
    }
  ): Config {
    const current = this.getConfig();
    const next: Config = {
      ...current,
      ...partial,
      govee: {
        ...current.govee,
        ...partial.govee
      },
      webhook: {
        ...current.webhook,
        ...partial.webhook
      },
      mqtt: {
        ...current.mqtt,
        ...partial.mqtt
      },
      mappings: {
        ...current.mappings,
        ...partial.mappings
      }
    };
    const parsed = ConfigSchema.safeParse(next);
    if (!parsed.success) {
      this.logger.warn('Config update rejected', { issues: parsed.error.issues });
      return current;
    }
    this.store.store = parsed.data;
    return parsed.data;
  }

  setManualStatus(manualStatus: ManualStatus) {
    return this.updateConfig({ manualStatus });
  }

  setAutoDetectEnabled(autoDetectEnabled: boolean) {
    return this.updateConfig({ autoDetectEnabled });
  }

  setGoveeResult(result: GoveeResult) {
    const current = this.getConfig();
    return this.updateConfig({
      govee: {
        ...current.govee,
        lastResult: result
      }
    });
  }

  setGoveeDevices(result: { ok: boolean; message: string; at: number; raw?: unknown }) {
    const current = this.getConfig();
    return this.updateConfig({
      govee: {
        ...current.govee,
        lastDevices: result
      }
    });
  }

  setWebhookResult(result: { ok: boolean; message: string; at: number }) {
    const current = this.getConfig();
    return this.updateConfig({
      webhook: {
        ...current.webhook,
        lastResult: result
      }
    });
  }
}
