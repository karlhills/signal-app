# Agent Notes

## Current State
- Electron + Vite + React + Tailwind scaffold lives in `apps/desktop`.
- Tray app + local API + meeting detection + Govee output are wired.
- Govee uses OpenAPI endpoints and capability-based control.

## Key Decisions
- Dev scripts use `npm exec` so local binaries resolve without PATH issues.
- Electron version is pinned for `electron-builder`.
- macOS build target set to ZIP (not DMG) to avoid missing DMG templates.
- Meeting detection ignores process-only signals when active window access is unavailable.
- UI uses a custom searchable device dropdown (embedded search).

## Govee Integration
- Device list endpoint: `GET https://openapi.api.govee.com/router/api/v1/user/devices`
- Control endpoint: `POST https://openapi.api.govee.com/router/api/v1/device/control`
- `sku` from device list maps to `deviceModel` in config.
- Insecure TLS toggle exists in UI; applies only to Govee calls.
- Diagnostics shows raw device response payload.

## Permissions Notes
- `active-win` requires window title access; on macOS this usually means **Screen Recording** permission.
- In dev, grant access to `Terminal` and `node_modules/electron/dist/Electron.app`.

## Troubleshooting
- If `vite`/`concurrently` not found, ensure `npm install` ran; scripts already use `npm exec`.
- For 401 from Govee, verify API key from Govee Developer portal.
