import type { Config } from '../lib/api';

interface MqttSettingsProps {
  config: Config['mqtt'];
  onChange: (next: Partial<Config['mqtt']>) => void;
  onTest: () => void;
  connection: { connected: boolean; error?: string | null } | null;
}

export default function MqttSettings({ config, onChange, onTest, connection }: MqttSettingsProps) {
  return (
    <section className="rounded-3xl bg-white/90 p-8 shadow-xl shadow-slate-200/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">MQTT</p>
          <h3 className="mt-2 font-display text-2xl">Publish to your broker</h3>
        </div>
        <button
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blurple/60"
          onClick={onTest}
        >
          Test publish
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]">
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Enable MQTT
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
          Broker URL
          <input
            type="text"
            value={config.brokerUrl}
            onChange={(event) => onChange({ brokerUrl: event.target.value })}
            placeholder="mqtt://localhost:1883"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
          Username
          <input
            type="text"
            value={config.username ?? ''}
            onChange={(event) => onChange({ username: event.target.value })}
            placeholder="Optional"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
          Password
          <input
            type="password"
            value={config.password ?? ''}
            onChange={(event) => onChange({ password: event.target.value })}
            placeholder="Optional"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
          Base topic
          <input
            type="text"
            value={config.baseTopic}
            onChange={(event) => onChange({ baseTopic: event.target.value })}
            placeholder="signal"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700"
          />
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={config.retain}
            onChange={(event) => onChange({ retain: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Retain messages
        </label>
      </div>

      <div className="mt-6 text-sm text-slate-600">
        {connection ? (
          <span className={connection.connected ? 'text-emerald-600' : 'text-rose-600'}>
            {connection.connected ? 'Connected to broker' : 'Not connected'}
            {connection.error ? ` · ${connection.error}` : ''}
          </span>
        ) : (
          <span>MQTT status unavailable.</span>
        )}
      </div>
    </section>
  );
}
