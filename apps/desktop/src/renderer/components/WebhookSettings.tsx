import { useEffect, useMemo, useState } from 'react';
import type { Config, EffectiveStatus } from '../lib/api';
import { statusLabels } from '../lib/colors';

interface WebhookSettingsProps {
  config: Config['webhook'];
  onChange: (next: Partial<Config['webhook']>) => void;
  onTest: () => void;
  lastResult: { ok: boolean; message: string; at: number } | null;
}

const STATUS_OPTIONS: EffectiveStatus[] = ['AVAILABLE', 'WORKING', 'MEETING', 'DND', 'OFF'];

interface HeaderEntry {
  key: string;
  value: string;
}

export default function WebhookSettings({ config, onChange, onTest, lastResult }: WebhookSettingsProps) {
  const [headers, setHeaders] = useState<HeaderEntry[]>([]);

  useEffect(() => {
    const entries = Object.entries(config.headers ?? {}).map(([key, value]) => ({ key, value }));
    setHeaders(entries.length ? entries : [{ key: '', value: '' }]);
  }, [config.headers]);

  const statusSet = useMemo(() => {
    if (!config.statuses || config.statuses.length === 0) {
      return new Set(STATUS_OPTIONS);
    }
    return new Set(config.statuses);
  }, [config.statuses]);

  function updateHeaders(nextHeaders: HeaderEntry[]) {
    setHeaders(nextHeaders);
    const normalized = nextHeaders.filter((entry) => entry.key.trim().length > 0);
    const headersObject = Object.fromEntries(normalized.map((entry) => [entry.key.trim(), entry.value]));
    onChange({ headers: headersObject });
  }

  function toggleStatus(status: EffectiveStatus) {
    const current = new Set(statusSet);
    if (current.has(status)) {
      current.delete(status);
    } else {
      current.add(status);
    }
    const next = Array.from(current);
    onChange({ statuses: next.length === STATUS_OPTIONS.length ? undefined : next });
  }

  return (
    <section className="rounded-3xl bg-white/90 p-8 shadow-xl shadow-slate-200/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Webhook</p>
          <h3 className="mt-2 font-display text-2xl">Send status events</h3>
        </div>
        <button
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blurple/60"
          onClick={onTest}
        >
          Test webhook
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
          Enable webhook
        </label>
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
          URL
          <input
            type="url"
            value={config.url}
            onChange={(event) => onChange({ url: event.target.value })}
            placeholder="https://example.com/signal"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr]">
        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-600">
          Timeout (ms)
          <input
            type="number"
            min={500}
            value={config.timeoutMs ?? 3000}
            onChange={(event) => onChange({ timeoutMs: Number(event.target.value) })}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-700"
          />
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={config.retryOnce ?? true}
            onChange={(event) => onChange({ retryOnce: event.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          Retry once on failure
        </label>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Header overrides</p>
        <div className="mt-3 grid gap-3">
          {headers.map((entry, index) => (
            <div key={`${entry.key}-${index}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                type="text"
                value={entry.key}
                onChange={(event) => {
                  const next = [...headers];
                  next[index] = { ...entry, key: event.target.value };
                  updateHeaders(next);
                }}
                placeholder="Header name"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              />
              <input
                type="text"
                value={entry.value}
                onChange={(event) => {
                  const next = [...headers];
                  next[index] = { ...entry, value: event.target.value };
                  updateHeaders(next);
                }}
                placeholder="Header value"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
              />
              <button
                type="button"
                onClick={() => {
                  const next = headers.filter((_, idx) => idx !== index);
                  updateHeaders(next.length ? next : [{ key: '', value: '' }]);
                }}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-3 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700"
          onClick={() => updateHeaders([...headers, { key: '', value: '' }])}
        >
          Add header
        </button>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status filter</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                statusSet.has(status)
                  ? 'border-blurple bg-blurple text-white'
                  : 'border-slate-200 text-slate-500 hover:border-blurple/50'
              }`}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 text-sm text-slate-600">
        {lastResult ? (
          <span className={lastResult.ok ? 'text-emerald-600' : 'text-rose-600'}>
            {lastResult.ok ? 'Last webhook success' : 'Last webhook failed'} ·{' '}
            {new Date(lastResult.at).toLocaleTimeString()} · {lastResult.message}
          </span>
        ) : (
          <span>No webhook attempts yet.</span>
        )}
      </div>
    </section>
  );
}
