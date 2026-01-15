interface SaveBannerProps {
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}

export default function SaveBanner({ dirty, saving, onSave, onReset }: SaveBannerProps) {
  if (!dirty) return null;

  return (
    <div className="sticky bottom-6 rounded-3xl border border-slate-200 bg-white/95 px-6 py-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">
          You have unsaved changes to your Signal settings.
        </p>
        <div className="flex gap-3">
          <button
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            onClick={onReset}
            disabled={saving}
          >
            Reset
          </button>
          <button
            className="rounded-full bg-moss px-4 py-2 text-sm font-semibold text-white"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
