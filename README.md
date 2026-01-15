# Signal

Signal is a cross-platform work-from-home presence agent that runs on your machine and updates your Govee lights based on your status. It blends a manual override with best-effort meeting detection so you always stay in control.

## How it works

- Manual status toggle: Available, Working, In Meeting, Do Not Disturb, Off (or Auto).
- Best-effort detection: looks for Zoom/Teams/Webex processes and active window hints.
- Outputs: pushes status changes to Govee lights, webhooks, and MQTT.
- Local HTTP API: exposes status endpoints on `localhost:3214` for future local integrations.

## Quick start

```bash
cd signal
npm install
npm run dev
```

Then open Settings (it launches automatically):

1. Enter your Govee API key.
2. Click “Refresh devices”.
3. Pick your device.
4. Choose colors/brightness for each status.

Settings now live in a single modal with tabs:
- Meeting: edit window keywords used for detection (saved immediately).
- Lights: Govee device + status-to-light mapping.
- Integrations: webhooks and MQTT.
- Diagnostics: live detection info and recent logs.

### Corporate SSL / self-signed certs

If Govee requests fail with `self signed certificate`, enable “Allow insecure TLS” in the Govee settings (not recommended).

## Safety & privacy

- All data is stored locally via `electron-store`.
- No cloud accounts or telemetry.
- Meeting detection is heuristic and runs locally.
- Integrations are optional and local-first.

## Integrations

### Webhook

Enable the webhook integration to POST JSON on effective status changes.

Example payload:

```json
{
  "app": "signal",
  "version": "0.1.0",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "effectiveStatus": "MEETING",
  "previousStatus": "AVAILABLE",
  "manualStatus": "AUTO",
  "detectedMeeting": true,
  "confidence": "high",
  "reasons": ["Active window matched meeting keyword"],
  "platform": "macOS"
}
```

### MQTT

Enable MQTT to publish status messages:

- `${baseTopic}/status`
  ```json
  { "status": "MEETING", "timestamp": "2025-01-01T12:00:00.000Z" }
  ```
- `${baseTopic}/status/detail`
  ```json
  {
    "effectiveStatus": "MEETING",
    "previousStatus": "AVAILABLE",
    "manualStatus": "AUTO",
    "detectedMeeting": true,
    "confidence": "high",
    "reasons": ["Active window matched meeting keyword"],
    "hostname": "your-hostname",
    "timestamp": "2025-01-01T12:00:00.000Z"
  }
  ```

Home Assistant example (MQTT sensor):

```yaml
mqtt:
  sensor:
    - name: "Signal Status"
      state_topic: "signal/status"
      value_template: "{{ value_json.status }}"
```


## Implementation notes

### Govee API

- Device list: `GET https://openapi.api.govee.com/router/api/v1/user/devices`
- Control: `POST https://openapi.api.govee.com/router/api/v1/device/control`
- Uses capability-based control (`on_off`, `range`, `color_setting`).
- `sku` is stored as the device model.

### TLS issues

If your network uses a proxy or custom CA, enable “Allow insecure TLS” in Settings
(not recommended). This only affects Govee requests.

### Meeting detection permissions

`active-win` needs window title access. On macOS, grant **Screen Recording** and **Accessibility**
to Terminal (for dev) and `node_modules/electron/dist/Electron.app`, then restart Signal.

### Tray behavior

- Signal keeps running when the window closes; use the tray menu to quit.
- In dev, the tray icon uses `assets/icon-dots-template.png` (template icon for macOS).

## Roadmap

- Smarter detection (mic/camera usage where possible).
- BusyLight USB support.
- Govee LAN support (optional).
- Per-app rules (e.g., “If Zoom then MEETING else if Slack DND then DND”).

## License

MIT
