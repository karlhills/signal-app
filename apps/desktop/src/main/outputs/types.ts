import type { EffectiveStatus, EngineState } from '../engine/types.js';
import type { MeetingDiagnostics } from '../signals/types.js';

export interface OutputResult {
  ok: boolean;
  message?: string;
}

export interface OutputConfig {
  color: string;
  brightness: number;
}

export interface OutputContext {
  previousStatus: EffectiveStatus | null;
  state: EngineState;
  meeting: MeetingDiagnostics;
  version: string;
  hostname: string;
}

export interface Output {
  apply(
    status: EffectiveStatus,
    config: OutputConfig | null,
    context?: OutputContext
  ): Promise<OutputResult>;
}
