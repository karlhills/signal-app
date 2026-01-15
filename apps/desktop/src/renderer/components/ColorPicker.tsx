import type { EffectiveStatus, StatusMapping } from '../lib/api';
import { statusLabels } from '../lib/colors';

interface ColorPickerProps {
  mappings: Record<EffectiveStatus, StatusMapping>;
  onChange: (status: EffectiveStatus, mapping: StatusMapping) => void;
}

const ORDER: EffectiveStatus[] = ['AVAILABLE', 'WORKING', 'MEETING', 'DND', 'OFF'];

export default function ColorPicker({ mappings, onChange }: ColorPickerProps) {
  return (
    <section className="rounded-3xl bg-white/90 p-8 shadow-xl shadow-slate-200/40">
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Scenes</p>
      <h3 className="mt-2 font-display text-2xl">Status-to-light mapping</h3>
      <p className="mt-2 text-sm text-slate-600">
        Off will power down the light in v0.
      </p>
      <div className="mt-6 grid gap-4">
        {ORDER.map((status) => {
          const mapping = mappings[status];
          return (
            <div
              key={status}
              className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 md:grid-cols-[140px_1fr_1fr]"
            >
              <div className="flex flex-col justify-center">
                <p className="text-sm font-semibold text-slate-700">{statusLabels[status]}</p>
              </div>
              <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                Color
                <input
                  type="color"
                  value={mapping.color}
                  onChange={(event) =>
                    onChange(status, { ...mapping, color: event.target.value })
                  }
                  className="h-12 w-full cursor-pointer rounded-xl border border-slate-200"
                />
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
                Brightness ({mapping.brightness}%)
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={mapping.brightness}
                  onChange={(event) =>
                    onChange(status, { ...mapping, brightness: Number(event.target.value) })
                  }
                />
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
