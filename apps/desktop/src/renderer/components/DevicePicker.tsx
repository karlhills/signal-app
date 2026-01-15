import { useEffect, useMemo, useRef, useState } from 'react';
import type { Config } from '../lib/api';

interface Device {
  device: string;
  model: string;
  deviceName: string;
}

interface DevicePickerProps {
  govee: Config['govee'];
  devices: Device[];
  onChange: (next: Partial<Config['govee']>) => void;
  onRefresh: () => void;
}

export default function DevicePicker({ govee, devices, onChange, onRefresh }: DevicePickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDeviceIds = useMemo(() => new Set(govee.devices.map((device) => device.deviceId)), [govee.devices]);

  const filteredDevices = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return devices;
    return devices.filter((device) => device.deviceName.toLowerCase().includes(term));
  }, [devices, query]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (device: Device) => {
    const isSelected = selectedDeviceIds.has(device.device);
    const nextDevices = isSelected
      ? govee.devices.filter((entry) => entry.deviceId !== device.device)
      : [
          ...govee.devices,
          {
            deviceId: device.device,
            deviceModel: device.model,
            deviceName: device.deviceName
          }
        ];
    onChange({ devices: nextDevices });
  };

  const handleRemove = (deviceId: string) => {
    onChange({ devices: govee.devices.filter((entry) => entry.deviceId !== deviceId) });
  };

  return (
    <section className="rounded-3xl bg-white/90 p-8 shadow-xl shadow-slate-200/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Govee</p>
          <h3 className="mt-2 font-display text-2xl">Connect your lights</h3>
        </div>
        <button
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blurple/60"
          onClick={onRefresh}
        >
          Refresh devices
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-[1.1fr_1fr]">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
          API key
          <input
            type="password"
            value={govee.apiKey}
            onChange={(event) => onChange({ apiKey: event.target.value })}
            placeholder="Enter your Govee API key"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700"
          />
        </label>
        <div className="flex flex-col gap-2 text-sm font-semibold text-slate-600" ref={containerRef}>
          <span>Device</span>
          <button
            type="button"
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700"
            onClick={() => setOpen((prev) => !prev)}
          >
            <span>{govee.devices.length ? `${govee.devices.length} selected` : 'Select devices'}</span>
            <span className="text-slate-400">▾</span>
          </button>
          {open ? (
            <div className="relative">
              <div className="absolute z-10 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search devices"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                />
                <div className="mt-2 max-h-48 overflow-auto">
                  {filteredDevices.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-slate-500">No matches.</p>
                  ) : (
                    filteredDevices.map((device) => (
                      <button
                        key={device.device}
                        type="button"
                        onClick={() => handleSelect(device)}
                        className="flex w-full items-center rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                      >
                        <span className="flex-1">{device.deviceName}</span>
                        {selectedDeviceIds.has(device.device) ? (
                          <span className="text-xs font-semibold text-emerald-500">Selected</span>
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <label className="mt-4 flex items-center gap-3 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={govee.allowInsecureTls}
          onChange={(event) => onChange({ allowInsecureTls: event.target.checked })}
          className="h-4 w-4 rounded border-slate-300"
        />
        Allow insecure TLS (not recommended)
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        {govee.devices.length ? (
          govee.devices.map((device) => (
            <span
              key={device.deviceId}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1"
            >
              <span className="font-semibold">{device.deviceName}</span>
              <button
                type="button"
                onClick={() => handleRemove(device.deviceId)}
                className="text-slate-400 hover:text-slate-600"
                aria-label={`Remove ${device.deviceName}`}
              >
                ✕
              </button>
            </span>
          ))
        ) : (
          <span>No devices selected yet.</span>
        )}
      </div>
    </section>
  );
}
