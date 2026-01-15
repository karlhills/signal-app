export interface MeetingDiagnostics {
  detectedMeeting: boolean;
  confidence: 'high' | 'low';
  reasons: string[];
  activeWindowTitle?: string;
  activeWindowOwner?: string;
  matchedProcesses: string[];
  lastUpdatedAt: number;
}
