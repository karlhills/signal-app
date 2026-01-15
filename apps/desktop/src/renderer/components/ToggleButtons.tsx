import type { ManualStatus } from '../lib/api';
import { statusEmoji, statusLabels } from '../lib/colors';

interface ToggleButtonsProps {
  manualStatus: ManualStatus;
  onChange: (status: ManualStatus) => void;
}

const STATUSES: ManualStatus[] = ['AUTO', 'AVAILABLE', 'WORKING', 'MEETING', 'DND', 'OFF'];

export default function ToggleButtons({ manualStatus, onChange }: ToggleButtonsProps) {
  return (
    <section className="rounded-3xl bg-white/90 p-8 shadow-xl shadow-slate-200/40">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Manual override</p>
      <h3 className="mt-2 font-display text-2xl">Quick status toggle</h3>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STATUSES.map((status) => {
          const active = manualStatus === status;
          return (
            <button
              key={status}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                active
                  ? 'border-blurple bg-blurple text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blurple/50'
              }`}
              onClick={() => onChange(status)}
            >
              <span>{statusLabels[status]}</span>
              <span className="text-lg">{statusEmoji[status]}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
