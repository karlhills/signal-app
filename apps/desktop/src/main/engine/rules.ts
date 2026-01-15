import type { EffectiveStatus, ManualStatus } from './types.js';

export function resolveEffectiveStatus(
  manualStatus: ManualStatus,
  autoDetectEnabled: boolean,
  detectedMeeting: boolean
): EffectiveStatus {
  if (manualStatus !== 'AUTO') {
    return manualStatus;
  }
  if (autoDetectEnabled && detectedMeeting) {
    return 'MEETING';
  }
  return 'AVAILABLE';
}
