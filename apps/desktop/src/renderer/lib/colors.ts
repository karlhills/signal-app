import type { EffectiveStatus } from './api';

export const statusLabels: Record<EffectiveStatus | 'AUTO', string> = {
  AUTO: 'Auto',
  AVAILABLE: 'Available',
  WORKING: 'Working',
  MEETING: 'In Meeting',
  DND: 'Do Not Disturb',
  OFF: 'Off'
};

export const statusEmoji: Record<EffectiveStatus | 'AUTO', string> = {
  AUTO: '✨',
  AVAILABLE: '🟢',
  WORKING: '🟡',
  MEETING: '🔴',
  DND: '⛔',
  OFF: '⚫'
};
