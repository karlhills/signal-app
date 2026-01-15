import type { EffectiveStatus, ManualStatus } from '../lib/api';
import { statusEmoji, statusLabels } from '../lib/colors';

interface StatusCardProps {
  effectiveStatus: EffectiveStatus;
  manualStatus: ManualStatus;
  detectedMeeting: boolean;
  autoDetectEnabled: boolean;
  onToggleAutoDetect: (enabled: boolean) => void;
}

export default function StatusCard({
  effectiveStatus,
  manualStatus,
  detectedMeeting,
  autoDetectEnabled,
  onToggleAutoDetect
}: StatusCardProps) {
  return (
    <section className="rounded-3xl bg-white/90 p-8 shadow-xl shadow-slate-200/50">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Effective status</p>
          <h2 className="mt-2 flex items-center gap-3 font-display text-3xl">
            <span className="text-3xl">{statusEmoji[effectiveStatus]}</span>
            {statusLabels[effectiveStatus]}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Manual override: <span className="font-semibold">{statusLabels[manualStatus]}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Auto-detect</p>
          <p className="mt-2 text-lg font-semibold text-slate-700">
            {autoDetectEnabled ? 'Enabled' : 'Paused'}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Detected meeting: {detectedMeeting ? 'Yes' : 'No'}
          </p>
          <button
            className="mt-3 rounded-full bg-blurple px-4 py-2 text-sm font-semibold text-white shadow"
            onClick={() => onToggleAutoDetect(!autoDetectEnabled)}
          >
            {autoDetectEnabled ? 'Pause Auto-Detect' : 'Resume Auto-Detect'}
          </button>
        </div>
      </div>
    </section>
  );
}
