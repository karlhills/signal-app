import { app, BrowserWindow, nativeImage } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { createTray } from './tray.js';
import { createLogger } from './utils/log.js';
import { StoreManager } from './store.js';
import { StateMachine } from './engine/stateMachine.js';
import { resolveEffectiveStatus } from './engine/rules.js';
import { createOutputDispatcher } from './engine/dispatchOutputs.js';
import { MeetingDetector } from './signals/meetingDetector.js';
import { createApiServer } from './apiServer.js';
import { GoveeClient } from './outputs/govee/goveeClient.js';
import { GoveeOutput } from './outputs/govee/goveeOutput.js';
import { WebhookClient } from './outputs/webhook/webhookClient.js';
import { WebhookOutput } from './outputs/webhook/webhookOutput.js';
import { MqttClientManager } from './outputs/mqtt/mqttClient.js';
import { MqttOutput } from './outputs/mqtt/mqttOutput.js';
import type { MeetingDiagnostics } from './signals/types.js';
import type { EffectiveStatus, ManualStatus } from './engine/types.js';
import type { GoveeResult } from './outputs/govee/types.js';
import type { Event } from 'electron';

const API_PORT = Number.parseInt(process.env.SIGNAL_API_PORT ?? '3214', 10) || 3214;

let settingsWindow: BrowserWindow | null = null;

const logger = createLogger();
let store: StoreManager;
let stateMachine: StateMachine;
let goveeClient: GoveeClient;
let goveeOutput: GoveeOutput;
let webhookOutput: WebhookOutput;
let mqttOutput: MqttOutput;
let mqttClient: MqttClientManager;
let meetingDetector: MeetingDetector;

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 860,
    minHeight: 640,
    title: 'Signal Settings',
    webPreferences: {
      contextIsolation: true
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    settingsWindow.loadURL(devUrl);
    settingsWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    settingsWindow.loadFile(path.join(app.getAppPath(), 'dist/renderer/index.html'));
  }

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

function openSettingsWindow() {
  const window = createSettingsWindow();
  window.show();
}

app.setName('Signal');
app.on('window-all-closed', (event: Event) => {
  event.preventDefault();
});

app.whenReady().then(() => {
  setDockIcon();
  store = new StoreManager(logger);
  const initialConfig = store.getConfig();
  stateMachine = new StateMachine({
    manualStatus: initialConfig.manualStatus,
    autoDetectEnabled: initialConfig.autoDetectEnabled,
    detectedMeeting: false,
    effectiveStatus: resolveEffectiveStatus(
      initialConfig.manualStatus,
      initialConfig.autoDetectEnabled,
      false
    )
  });

  goveeClient = new GoveeClient(
    () => store.getConfig().govee.apiKey,
    () => store.getConfig().govee.allowInsecureTls,
    logger,
    (result: GoveeResult) => store.setGoveeResult(result)
  );
  goveeOutput = new GoveeOutput(goveeClient, store, logger);
  webhookOutput = new WebhookOutput(
    new WebhookClient(logger),
    store,
    logger,
    () => app.getVersion()
  );
  mqttClient = new MqttClientManager(logger);
  mqttOutput = new MqttOutput(mqttClient, store, logger);
  meetingDetector = new MeetingDetector(logger, () => store.getConfig().meetingKeywords);

  createApiServer({
    port: API_PORT,
    stateMachine,
    store,
    meetingDetector,
    goveeClient,
    webhookOutput,
    mqttOutput,
    mqttClient,
    logger
  });

  meetingDetector.start((diagnostics: MeetingDiagnostics) => {
    stateMachine.setDetectedMeeting(diagnostics.detectedMeeting);
  });

  const dispatchOutputs = createOutputDispatcher({
    outputs: [goveeOutput, webhookOutput, mqttOutput],
    logger,
    getContext: (previousStatus) => ({
      previousStatus,
      state: stateMachine.getState(),
      meeting: meetingDetector.getDiagnostics(),
      version: app.getVersion(),
      hostname: process.env.HOSTNAME ?? os.hostname()
    })
  });

  stateMachine.on('effectiveStatus', (status: EffectiveStatus) => {
    const config = store.getConfig();
    const mapping = config.mappings[status] ?? null;
    dispatchOutputs(status, mapping);
  });

  const trayControls = createTray({
    getState: () => stateMachine.getState(),
    onSetManualStatus: (status: ManualStatus) => {
      store.setManualStatus(status);
      stateMachine.setManualStatus(status);
    },
    onToggleAutoDetect: (enabled: boolean) => {
      store.setAutoDetectEnabled(enabled);
      stateMachine.setAutoDetectEnabled(enabled);
    },
    onOpenSettings: openSettingsWindow,
    onQuit: () => app.quit()
  });

  stateMachine.on('stateChanged', () => {
    trayControls.updateMenu();
  });

  openSettingsWindow();
});

app.on('activate', () => {
  openSettingsWindow();
});

function setDockIcon() {
  if (process.platform !== 'darwin') return;
  const iconPath = resolveAssetPath('icon-dots-1024.png');
  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    logger.warn('Dock icon missing', { path: iconPath });
    return;
  }
  app.dock.setIcon(icon);
}

function resolveAssetPath(file: string) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', file);
  }
  const candidates = [
    path.resolve(app.getAppPath(), 'assets', file),
    path.resolve(app.getAppPath(), '..', 'assets', file),
    path.resolve(app.getAppPath(), '..', '..', 'assets', file),
    path.resolve(app.getAppPath(), '..', '..', '..', 'assets', file),
    path.resolve(process.cwd(), 'assets', file),
    path.resolve(process.cwd(), '..', 'assets', file)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}
