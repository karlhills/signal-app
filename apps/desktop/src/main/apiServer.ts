import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { StateMachine } from './engine/stateMachine.js';
import type { StoreManager } from './store.js';
import type { MeetingDetector } from './signals/meetingDetector.js';
import type { Logger } from './utils/log.js';
import type { GoveeClient } from './outputs/govee/goveeClient.js';
import type { WebhookOutput } from './outputs/webhook/webhookOutput.js';
import type { MqttOutput } from './outputs/mqtt/mqttOutput.js';
import type { MqttClientManager } from './outputs/mqtt/mqttClient.js';
import type { ManualStatus } from './engine/types.js';

interface ApiServerDeps {
  port: number;
  stateMachine: StateMachine;
  store: StoreManager;
  meetingDetector: MeetingDetector;
  goveeClient: GoveeClient;
  webhookOutput: WebhookOutput;
  mqttOutput: MqttOutput;
  mqttClient: MqttClientManager;
  logger: Logger;
}

export function createApiServer({
  port,
  stateMachine,
  store,
  meetingDetector,
  goveeClient,
  webhookOutput,
  mqttOutput,
  mqttClient,
  logger
}: ApiServerDeps) {
  const server = http.createServer(async (req, res) => {
    setCorsHeaders(req, res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    try {
      if (req.method === 'GET' && url.pathname === '/health') {
        return sendJson(res, 200, {
          ok: true,
          name: 'signal',
          version: '0.1.0'
        });
      }

      if (req.method === 'GET' && url.pathname === '/status') {
        const state = stateMachine.getState();
        return sendJson(res, 200, {
          ok: true,
          effectiveStatus: state.effectiveStatus,
          manualStatus: state.manualStatus,
          detectedMeeting: state.detectedMeeting,
          autoDetectEnabled: state.autoDetectEnabled
        });
      }

      if (req.method === 'POST' && url.pathname === '/status') {
        const body = await parseJson(req);
        const manualStatus = body?.manualStatus as ManualStatus | undefined;
        if (!manualStatus || !isManualStatus(manualStatus)) {
          return sendJson(res, 400, { ok: false, error: 'manualStatus required' });
        }
        store.setManualStatus(manualStatus);
        stateMachine.setManualStatus(manualStatus);
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === 'POST' && url.pathname === '/autodetect') {
        const body = await parseJson(req);
        if (typeof body?.enabled !== 'boolean') {
          return sendJson(res, 400, { ok: false, error: 'enabled boolean required' });
        }
        const enabled = body.enabled;
        store.setAutoDetectEnabled(enabled);
        stateMachine.setAutoDetectEnabled(enabled);
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === 'GET' && url.pathname === '/config') {
        const config = store.getConfig();
        return sendJson(res, 200, { ok: true, config });
      }

      if (req.method === 'POST' && url.pathname === '/config') {
        const body = await parseJson(req);
        const config = store.updateConfig(body ?? {});
        return sendJson(res, 200, { ok: true, config });
      }

      if (req.method === 'POST' && url.pathname === '/govee/refresh') {
        const result = await goveeClient.listDevices();
        store.setGoveeDevices({
          ok: result.ok,
          message: result.message,
          at: result.at,
          raw: result.raw
        });
        return sendJson(res, 200, result);
      }

      if (req.method === 'POST' && url.pathname === '/integrations/webhook/test') {
        const result = await webhookOutput.sendTest();
        return sendJson(res, 200, result);
      }

      if (req.method === 'POST' && url.pathname === '/integrations/mqtt/test') {
        const result = await mqttOutput.testPublish();
        return sendJson(res, 200, result);
      }

      if (req.method === 'GET' && url.pathname === '/diagnostics') {
        const config = store.getConfig();
        return sendJson(res, 200, {
          ok: true,
          logs: logger.getRecent(20),
          govee: config.govee.lastResult,
          goveeDevices: config.govee.lastDevices,
          webhook: config.webhook.lastResult,
          mqtt: mqttClient.getStatus(),
          meeting: meetingDetector.getDiagnostics()
        });
      }

      return sendJson(res, 404, { ok: false, error: 'Not found' });
    } catch (error) {
      logger.error('API error', { error: String(error) });
      return sendJson(res, 500, { ok: false, error: 'Server error' });
    }
  });

  server.listen(port, '127.0.0.1', () => {
    logger.info(`API server listening on ${port}`);
  });

  return server;
}

function setCorsHeaders(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin ?? '';
  const allowed = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173'
  ];
  if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (allowed.includes(origin) || origin === 'null') {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseJson(req: IncomingMessage) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function isManualStatus(status: string): status is ManualStatus {
  return ['AUTO', 'AVAILABLE', 'WORKING', 'MEETING', 'DND', 'OFF'].includes(status);
}
