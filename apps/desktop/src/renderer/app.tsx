import { useEffect, useMemo, useState } from 'react';
import Layout from './components/Layout';
import { statusEmoji, statusLabels } from './lib/colors';
import ToggleButtons from './components/ToggleButtons';
import DevicePicker from './components/DevicePicker';
import ColorPicker from './components/ColorPicker';
import Diagnostics from './components/Diagnostics';
import SaveBanner from './components/SaveBanner';
import WebhookSettings from './components/WebhookSettings';
import MqttSettings from './components/MqttSettings';
import {
  getConfig,
  getDiagnostics,
  getStatus,
  refreshDevices,
  setAutoDetect,
  setManualStatus,
  testMqtt,
  testWebhook,
  updateConfig,
  type Config,
  type ManualStatus,
  type StatusMapping
} from './lib/api';

interface Device {
  device: string;
  model: string;
  deviceName: string;
}

type SettingsDraft = Pick<
  Config,
  'govee' | 'mappings' | 'meetingKeywords' | 'webhook' | 'mqtt'
>;
type SettingsTab = 'keywords' | 'lights' | 'integrations' | 'diagnostics';

const POLL_INTERVAL = 2000;

export default function App() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getStatus>> | null>(null);
  const [config, setConfigState] = useState<Config | null>(null);
  const [draft, setDraft] = useState<SettingsDraft | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [diagnostics, setDiagnosticsState] = useState<Awaited<ReturnType<typeof getDiagnostics>> | null>(null);
  const [saving, setSaving] = useState(false);
  const [showKeywordsModal, setShowKeywordsModal] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState('');
  const [keywordsError, setKeywordsError] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('keywords');

  const dirty = useMemo(() => {
    if (!config || !draft) return false;
    return (
      JSON.stringify(config.govee) !== JSON.stringify(draft.govee) ||
      JSON.stringify(config.webhook) !== JSON.stringify(draft.webhook) ||
      JSON.stringify(config.mqtt) !== JSON.stringify(draft.mqtt) ||
      JSON.stringify(config.mappings) !== JSON.stringify(draft.mappings) ||
      JSON.stringify(config.meetingKeywords) !== JSON.stringify(draft.meetingKeywords)
    );
  }, [config, draft]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(() => {
      refreshStatus();
      refreshDiagnostics();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  async function refreshAll() {
    await Promise.all([refreshStatus(), refreshConfig(), refreshDiagnostics()]);
  }

  async function refreshStatus() {
    try {
      const data = await getStatus();
      setStatus(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function refreshConfig() {
    try {
      const data = await getConfig();
      setConfigState(data.config);
      setDraft({
        govee: data.config.govee,
        webhook: data.config.webhook,
        mqtt: data.config.mqtt,
        mappings: data.config.mappings,
        meetingKeywords: data.config.meetingKeywords
      });
    } catch (error) {
      console.error(error);
    }
  }

  async function refreshDiagnostics() {
    try {
      const data = await getDiagnostics();
      setDiagnosticsState(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleManualStatus(status: ManualStatus) {
    await setManualStatus(status);
    refreshStatus();
  }

  async function handleAutoDetect(enabled: boolean) {
    await setAutoDetect(enabled);
    refreshStatus();
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      const response = await updateConfig({
        govee: draft.govee,
        webhook: draft.webhook,
        mqtt: draft.mqtt,
        mappings: draft.mappings,
        meetingKeywords: draft.meetingKeywords
      });
      setConfigState(response.config);
      setDraft({
        govee: response.config.govee,
        webhook: response.config.webhook,
        mqtt: response.config.mqtt,
        mappings: response.config.mappings,
        meetingKeywords: response.config.meetingKeywords
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (config) {
      setDraft({
        govee: config.govee,
        webhook: config.webhook,
        mqtt: config.mqtt,
        mappings: config.mappings,
        meetingKeywords: config.meetingKeywords
      });
    }
  }

  async function handleRefreshDevices() {
    try {
      const response = await refreshDevices();
      setDevices(response.devices ?? []);
    } catch (error) {
      console.error(error);
    }
  }

  function updateGovee(next: Partial<Config['govee']>) {
    if (!draft) return;
    setDraft({
      govee: {
        ...draft.govee,
        ...next
      },
      webhook: draft.webhook,
      mqtt: draft.mqtt,
      mappings: draft.mappings,
      meetingKeywords: draft.meetingKeywords
    });
  }

  function updateMapping(statusKey: keyof Config['mappings'], mapping: StatusMapping) {
    if (!draft) return;
    setDraft({
      govee: draft.govee,
      webhook: draft.webhook,
      mqtt: draft.mqtt,
      mappings: {
        ...draft.mappings,
        [statusKey]: mapping
      },
      meetingKeywords: draft.meetingKeywords
    });
  }

  function updateWebhook(next: Partial<Config['webhook']>) {
    if (!draft) return;
    setDraft({
      govee: draft.govee,
      webhook: {
        ...draft.webhook,
        ...next
      },
      mqtt: draft.mqtt,
      mappings: draft.mappings,
      meetingKeywords: draft.meetingKeywords
    });
  }

  function updateMqtt(next: Partial<Config['mqtt']>) {
    if (!draft) return;
    setDraft({
      govee: draft.govee,
      webhook: draft.webhook,
      mqtt: {
        ...draft.mqtt,
        ...next
      },
      mappings: draft.mappings,
      meetingKeywords: draft.meetingKeywords
    });
  }

  function openSettingsModal(tab: SettingsTab = 'keywords') {
    if (!draft) return;
    setKeywordsError(null);
    setKeywordsInput(draft.meetingKeywords.join('\n'));
    setSettingsTab(tab);
    setShowKeywordsModal(true);
  }

  function parseKeywords(value: string) {
    return value
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function getSettingsHeader(tab: SettingsTab) {
    if (tab === 'lights') {
      return {
        label: 'Lights',
        title: 'Govee settings',
        description: 'Connect devices and map statuses to colors.'
      };
    }
    if (tab === 'diagnostics') {
      return {
        label: 'Diagnostics',
        title: 'What Signal sees',
        description: 'Review meeting detection signals and recent logs.'
      };
    }
    if (tab === 'integrations') {
      return {
        label: 'Integrations',
        title: 'Connect external tools',
        description: 'Configure webhooks and MQTT controls.'
      };
    }
    return {
      label: 'Meeting detection',
      title: 'Edit window keywords',
      description: 'One keyword per line or comma-separated. These match the active window title and app name.'
    };
  }

  async function applyKeywordUpdates() {
    if (!draft) return;
    const meetingKeywords = parseKeywords(keywordsInput);
    setSaving(true);
    setKeywordsError(null);
    try {
      const response = await updateConfig({
        meetingKeywords
      });
      setConfigState(response.config);
      setDraft({
        govee: response.config.govee,
        webhook: response.config.webhook,
        mqtt: response.config.mqtt,
        mappings: response.config.mappings,
        meetingKeywords: response.config.meetingKeywords
      });
      setShowKeywordsModal(false);
    } catch (error) {
      console.error(error);
      setKeywordsError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout
      headerActions={
        <button
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 transition hover:border-blurple/60 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => openSettingsModal('keywords')}
          disabled={!draft}
        >
          <span>Settings</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4 text-slate-500"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2.5l1.4 2.9a8 8 0 0 1 3 .8l2.9-1.4 1.7 3-2.5 2a8.2 8.2 0 0 1 0 3.4l2.5 2-1.7 3-2.9-1.4a8 8 0 0 1-3 .8L12 21.5l-1.4-2.9a8 8 0 0 1-3-.8l-2.9 1.4-1.7-3 2.5-2a8.2 8.2 0 0 1 0-3.4l-2.5-2 1.7-3 2.9 1.4a8 8 0 0 1 3-.8L12 2.5z" />
            <circle cx="12" cy="12" r="3.2" />
          </svg>
        </button>
      }
    >
      {!status ? (
        <div className="rounded-3xl bg-white/90 p-8 shadow-xl shadow-slate-200/40">
          <p className="text-sm text-slate-600">Connecting to Signal...</p>
        </div>
      ) : (
        <section className="rounded-3xl bg-white/90 px-6 py-4 shadow-lg shadow-slate-200/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Effective status</p>
              <div className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-800">
                <span className="text-2xl">{statusEmoji[status.effectiveStatus]}</span>
                <span>{statusLabels[status.effectiveStatus]}</span>
              </div>
              <p className="text-sm text-slate-600">
                Detected meeting: {status.detectedMeeting ? 'Yes' : 'No'}
              </p>
            </div>
            <button
              className="rounded-full bg-blurple px-4 py-2 text-sm font-semibold text-white shadow"
              onClick={() => handleAutoDetect(!status.autoDetectEnabled)}
            >
              {status.autoDetectEnabled ? 'Pause Auto-Detect' : 'Resume Auto-Detect'}
            </button>
          </div>
        </section>
      )}
      {diagnostics?.meeting?.reasons?.includes('Active window unavailable') ? (
        <section className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-900 shadow-sm">
          <p className="font-semibold">Enable window access to improve detection.</p>
          <p className="mt-1 text-amber-800">
            macOS: System Settings → Privacy & Security → Screen Recording (and Accessibility if
            prompted) → enable Signal (and Terminal when running dev). Windows: allow apps to access
            window titles and run Signal once with admin rights if needed.
          </p>
        </section>
      ) : null}

      {status ? (
        <ToggleButtons manualStatus={status.manualStatus} onChange={handleManualStatus} />
      ) : null}

      {showKeywordsModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowKeywordsModal(false)} />
          <div className="relative flex w-full max-w-2xl max-h-[85vh] flex-col rounded-3xl bg-white p-8 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  {getSettingsHeader(settingsTab).label}
                </p>
                <h2 className="mt-2 font-display text-2xl text-slate-800">
                  {getSettingsHeader(settingsTab).title}
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {getSettingsHeader(settingsTab).description}
                </p>
              </div>
              <button
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 hover:border-slate-300 hover:text-slate-700"
                onClick={() => setShowKeywordsModal(false)}
              >
                Close
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  settingsTab === 'keywords'
                    ? 'border-blurple bg-blurple text-white'
                    : 'border-slate-200 text-slate-600 hover:border-blurple/50'
                }`}
                onClick={() => setSettingsTab('keywords')}
              >
                Meeting
              </button>
              <button
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  settingsTab === 'lights'
                    ? 'border-blurple bg-blurple text-white'
                    : 'border-slate-200 text-slate-600 hover:border-blurple/50'
                }`}
                onClick={() => setSettingsTab('lights')}
              >
                Lights
              </button>
              <button
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  settingsTab === 'diagnostics'
                    ? 'border-blurple bg-blurple text-white'
                    : 'border-slate-200 text-slate-600 hover:border-blurple/50'
                }`}
                onClick={() => setSettingsTab('diagnostics')}
              >
                Diagnostics
              </button>
              <button
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  settingsTab === 'integrations'
                    ? 'border-blurple bg-blurple text-white'
                    : 'border-slate-200 text-slate-600 hover:border-blurple/50'
                }`}
                onClick={() => setSettingsTab('integrations')}
              >
                Integrations
              </button>
            </div>

            {settingsTab === 'keywords' ? (
              <div className="mt-6 overflow-y-auto pr-2">
                <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Window keywords
                  <textarea
                    value={keywordsInput}
                    onChange={(event) => setKeywordsInput(event.target.value)}
                    rows={8}
                    className="resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-700 focus:border-blurple/60 focus:outline-none"
                    placeholder="meeting&#10;call&#10;zoom meeting&#10;microsoft teams&#10;google meet"
                  />
                </label>
                {keywordsError ? (
                  <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
                    {keywordsError}
                  </p>
                ) : null}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 hover:border-slate-300"
                    onClick={() => setShowKeywordsModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-full bg-blurple px-5 py-2 text-sm font-semibold text-white shadow"
                    onClick={applyKeywordUpdates}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save keywords'}
                  </button>
                </div>
              </div>
            ) : null}

            {settingsTab === 'lights' ? (
              <div className="mt-6 grid gap-6 overflow-y-auto pr-2">
                {draft ? (
                  <DevicePicker
                    govee={draft.govee}
                    devices={devices}
                    onChange={updateGovee}
                    onRefresh={handleRefreshDevices}
                  />
                ) : null}
                {draft ? <ColorPicker mappings={draft.mappings} onChange={updateMapping} /> : null}
                <SaveBanner dirty={dirty} saving={saving} onSave={handleSave} onReset={handleReset} />
              </div>
            ) : null}

            {settingsTab === 'diagnostics' ? (
              <div className="mt-6 grid gap-4 overflow-y-auto pr-2">
                {diagnostics?.meeting?.reasons?.includes('Active window unavailable') ? (
                  <section className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-900 shadow-sm">
                    <p className="font-semibold">Enable window access to improve detection.</p>
                    <p className="mt-1 text-amber-800">
                      macOS: System Settings → Privacy & Security → Screen Recording (and Accessibility if prompted) →
                      enable Signal (and Terminal when running dev). Windows: allow apps to access window titles and run
                      Signal once with admin rights if needed.
                    </p>
                  </section>
                ) : null}
                <Diagnostics diagnostics={diagnostics} />
              </div>
            ) : null}

            {settingsTab === 'integrations' ? (
              <div className="mt-6 grid gap-6 overflow-y-auto pr-2">
                {draft ? (
                  <WebhookSettings
                    config={draft.webhook}
                    onChange={updateWebhook}
                    onTest={async () => {
                      try {
                        await testWebhook();
                        refreshDiagnostics();
                      } catch (error) {
                        console.error(error);
                      }
                    }}
                    lastResult={diagnostics?.webhook ?? null}
                  />
                ) : null}
                {draft ? (
                  <MqttSettings
                    config={draft.mqtt}
                    onChange={updateMqtt}
                    onTest={async () => {
                      try {
                        await testMqtt();
                        refreshDiagnostics();
                      } catch (error) {
                        console.error(error);
                      }
                    }}
                    connection={diagnostics?.mqtt ?? null}
                  />
                ) : null}
                <SaveBanner dirty={dirty} saving={saving} onSave={handleSave} onReset={handleReset} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
