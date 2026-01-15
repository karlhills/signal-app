import type { DiagnosticsResponse } from '../lib/api';
import { formatTime } from '../lib/format';

interface DiagnosticsProps {
  diagnostics: DiagnosticsResponse | null;
}

export default function Diagnostics({ diagnostics }: DiagnosticsProps) {
  return (
    <section className="rounded-3xl bg-white/90 p-8 shadow-xl shadow-slate-200/40">
      {!diagnostics ? (
        <p className="mt-4 text-sm text-slate-600">Loading diagnostics...</p>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Meeting detector</p>
            <p className="mt-2 text-sm text-slate-600">
              Detected meeting: {diagnostics.meeting.detectedMeeting ? 'Yes' : 'No'}
            </p>
            <p className="text-sm text-slate-600">
              Confidence: {diagnostics.meeting.confidence}
            </p>
            <p className="text-sm text-slate-600">
              Active window: {diagnostics.meeting.activeWindowTitle || 'Unknown'}
            </p>
            <p className="text-sm text-slate-600">
              Processes: {diagnostics.meeting.matchedProcesses.join(', ') || 'None'}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Reasons: {diagnostics.meeting.reasons.join('; ') || '—'}
            </p>
          </div>
          <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Recent logs</p>
            <div className="mt-3 max-h-48 overflow-auto text-xs text-slate-600">
              {diagnostics.logs.length === 0 ? (
                <p>No logs yet.</p>
              ) : (
                diagnostics.logs.map((entry, index) => (
                  <p key={`${entry.at}-${index}`}>
                    [{formatTime(entry.at)}] {entry.level.toUpperCase()}: {entry.message}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
