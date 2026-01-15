export interface GoveeDevice {
  device: string;
  model: string;
  deviceName: string;
}

export interface GoveeResult {
  ok: boolean;
  message: string;
  at: number;
}

export interface GoveeDevicesResult {
  ok: boolean;
  message: string;
  devices: GoveeDevice[];
  raw?: unknown;
  at: number;
}
