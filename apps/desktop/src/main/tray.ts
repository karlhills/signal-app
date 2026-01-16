import { Menu, Tray, app, nativeImage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { EngineState, ManualStatus } from './engine/types.js';
import type { MenuItemConstructorOptions } from 'electron';

interface TrayDeps {
  getState: () => EngineState;
  onSetManualStatus: (status: ManualStatus) => void;
  onToggleAutoDetect: (enabled: boolean) => void;
  onOpenSettings: () => void;
  onQuit: () => void;
}

export function createTray({
  getState,
  onSetManualStatus,
  onToggleAutoDetect,
  onOpenSettings,
  onQuit
}: TrayDeps) {
  const iconPath = resolveAssetPath('icon-dots-tray.png');
  let trayIcon = nativeImage.createFromPath(iconPath);
  if (trayIcon.isEmpty() && fs.existsSync(iconPath)) {
    try {
      trayIcon = nativeImage.createFromBuffer(fs.readFileSync(iconPath));
    } catch (error) {
      console.warn('[signal] Tray icon buffer load failed', { error: String(error) });
    }
  }
  if (trayIcon.isEmpty()) {
    console.warn('[signal] Tray icon missing, falling back to default icon.png', { path: iconPath });
    trayIcon = nativeImage.createFromPath(resolveAssetPath('icon.png'));
  }
  if (process.platform === 'darwin') {
    trayIcon = trayIcon.resize({ width: 18, height: 18 });
    trayIcon.setTemplateImage(false);
  }
  const tray = new Tray(trayIcon);

  const updateMenu = () => {
    const state = getState();
    const template: MenuItemConstructorOptions[] = [
      {
        label: `${statusEmoji(state.effectiveStatus)} ${statusLabel(state.effectiveStatus)}`,
        enabled: false
      },
      { type: 'separator' as const },
      {
        label: 'Set status',
        enabled: false
      },
      ...statusOptions().map<MenuItemConstructorOptions>((status) => ({
        label: `${statusEmoji(status)} ${statusLabel(status)}`,
        type: 'radio' as const,
        checked: state.manualStatus === status,
        click: () => onSetManualStatus(status)
      })),
      { type: 'separator' as const },
      {
        label: 'Open Settings...',
        click: onOpenSettings
      },
      {
        label: 'Pause Auto-Detect',
        type: 'checkbox' as const,
        checked: !state.autoDetectEnabled,
        click: () => onToggleAutoDetect(!state.autoDetectEnabled)
      },
      { type: 'separator' as const },
      {
        label: 'Quit',
        click: onQuit
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    tray.setContextMenu(menu);
    tray.setToolTip(`Signal: ${statusLabel(state.effectiveStatus)}`);
  };

  updateMenu();
  tray.on('click', () => {});

  return {
    tray,
    updateMenu
  };
}

function resolveAssetPath(file: string) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', file);
  }
  const appPath = app.getAppPath();
  const devCandidates = [
    path.resolve(appPath, 'assets', file),
    path.resolve(appPath, '..', 'assets', file),
    path.resolve(appPath, '..', '..', 'assets', file),
    path.resolve(appPath, '..', '..', '..', 'assets', file),
    path.resolve(process.cwd(), 'assets', file),
    path.resolve(process.cwd(), '..', 'assets', file),
    path.resolve(process.cwd(), '..', '..', 'assets', file)
  ];
  for (const candidate of devCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  console.warn('[signal] Tray icon not found in dev candidates', { candidates: devCandidates });
  return devCandidates[0];
}

function statusOptions(): ManualStatus[] {
  return ['AUTO', 'AVAILABLE', 'WORKING', 'MEETING', 'DND', 'OFF'];
}

function statusLabel(status: ManualStatus) {
  switch (status) {
    case 'AUTO':
      return 'Auto';
    case 'AVAILABLE':
      return 'Available';
    case 'WORKING':
      return 'Working';
    case 'MEETING':
      return 'In Meeting';
    case 'DND':
      return 'Do Not Disturb';
    case 'OFF':
      return 'Off';
    default:
      return status;
  }
}

function statusEmoji(status: ManualStatus) {
  switch (status) {
    case 'AVAILABLE':
      return '🟢';
    case 'WORKING':
      return '🟡';
    case 'MEETING':
      return '🔴';
    case 'DND':
      return '⛔';
    case 'OFF':
      return '⚫';
    case 'AUTO':
      return '✨';
    default:
      return '•';
  }
}
