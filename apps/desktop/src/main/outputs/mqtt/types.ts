export interface MqttConfig {
  enabled: boolean;
  brokerUrl: string;
  username?: string;
  password?: string;
  baseTopic: string;
  retain: boolean;
}

export interface MqttStatusDetailPayload {
  effectiveStatus: string;
  previousStatus: string | null;
  manualStatus: string;
  detectedMeeting: boolean;
  confidence: 'high' | 'low';
  reasons: string[];
  hostname: string;
  timestamp: string;
}
