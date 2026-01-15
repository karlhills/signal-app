export type ManualStatus = 'AUTO' | 'AVAILABLE' | 'WORKING' | 'MEETING' | 'DND' | 'OFF';
export type EffectiveStatus = 'AVAILABLE' | 'WORKING' | 'MEETING' | 'DND' | 'OFF';

export interface EngineState {
  manualStatus: ManualStatus;
  autoDetectEnabled: boolean;
  detectedMeeting: boolean;
  effectiveStatus: EffectiveStatus;
}
