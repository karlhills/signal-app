import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import childProcess from 'node:child_process';
import { app } from 'electron';
import type { MeetingDiagnostics } from './types.js';
import type { Logger } from '../utils/log.js';

const PROCESS_HINTS = [
  { name: 'zoom', matches: ['zoom', 'zoom.exe'] },
  { name: 'teams', matches: ['teams', 'ms-teams', 'teams.exe', 'teams2', 'msteams', 'microsoft teams'] },
  { name: 'webex', matches: ['webex', 'ciscowebex', 'webex.exe'] }
];

const DEFAULT_KEYWORDS = [
  'meeting',
  'call',
  'zoom meeting',
  'microsoft teams',
  'teams',
  'echo',
  'webex',
  'google meet',
  'meet -',
  'meet.google.com'
];

export class MeetingDetector {
  private interval?: NodeJS.Timeout;
  private diagnostics: MeetingDiagnostics = {
    detectedMeeting: false,
    confidence: 'low',
    reasons: [],
    matchedProcesses: [],
    lastUpdatedAt: Date.now()
  };

  constructor(
    private logger: Logger,
    private getMeetingKeywords: () => string[] = () => DEFAULT_KEYWORDS
  ) {}

  start(onUpdate: (diagnostics: MeetingDiagnostics) => void) {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.poll(onUpdate).catch((error) => {
        this.logger.error('Meeting detector poll failed', { error: String(error) });
      });
    }, 2000);
    this.poll(onUpdate).catch((error) => {
      this.logger.error('Meeting detector initial poll failed', { error: String(error) });
    });
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  getDiagnostics() {
    return { ...this.diagnostics };
  }

  private async poll(onUpdate: (diagnostics: MeetingDiagnostics) => void) {
    const reasons: string[] = [];
    let confidence: 'high' | 'low' = 'high';
    let activeTitle = '';
    let activeOwner = '';
    let activeWinAvailable = true;

    const [{ default: psList }, activeWin] = await Promise.all([
      import('ps-list'),
      this.getActiveWinFunction()
    ]);

    const processes = await psList();
    const lowerProcessNames = processes.map((proc) => proc.name.toLowerCase());

    const matchedProcesses: string[] = [];
    for (const hint of PROCESS_HINTS) {
      const hit = lowerProcessNames.some((name) =>
        hint.matches.some((match) => name.includes(match))
      );
      if (hit) {
        matchedProcesses.push(hint.name);
      }
    }

    if (!activeWin) {
      activeWinAvailable = false;
      confidence = 'low';
      reasons.push('Active window unavailable');
    } else {
      try {
        const activeWindow = await activeWin();
        activeTitle = activeWindow?.title ?? '';
        activeOwner = activeWindow?.owner?.name ?? '';
      } catch (error) {
        activeWinAvailable = false;
        confidence = 'low';
        reasons.push('Active window lookup failed');
        this.logger.warn('Active window lookup failed', this.formatActiveWinError(error));
      }
    }

    const titleLower = `${activeTitle} ${activeOwner}`.toLowerCase();
    const meetingKeywords = this.getMeetingKeywords();
    const keywords = meetingKeywords.length > 0 ? meetingKeywords : DEFAULT_KEYWORDS;
    const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());
    const activeOwnerLooksLikeTeams = titleLower.includes('microsoft teams') || titleLower.includes('teams');
    const weakKeywords = new Set(['teams', 'microsoft teams']);
    const hasStrongKeyword = normalizedKeywords.some(
      (keyword) => !weakKeywords.has(keyword) && titleLower.includes(keyword)
    );
    const hasWeakKeyword = normalizedKeywords.some(
      (keyword) => weakKeywords.has(keyword) && titleLower.includes(keyword)
    );
    const hasMeetingKeyword = hasStrongKeyword || (!activeOwnerLooksLikeTeams && hasWeakKeyword);
    const hasProcessMatch = matchedProcesses.length > 0;
    const isTeamsChatWindow = activeOwnerLooksLikeTeams && titleLower.includes('chat');

    let detectedMeeting = false;

    if (activeWinAvailable) {
      if (hasProcessMatch && hasMeetingKeyword && !isTeamsChatWindow) {
        detectedMeeting = true;
        reasons.push('Meeting process + meeting window detected');
      }
      if (!detectedMeeting && titleLower.includes('echo') && (hasProcessMatch || activeOwnerLooksLikeTeams)) {
        detectedMeeting = true;
        reasons.push('Teams test call window detected');
      }
      if (!detectedMeeting && isTeamsChatWindow && hasProcessMatch) {
        reasons.push('Teams chat window ignored');
      }
    } else {
      if (hasProcessMatch) {
        confidence = 'low';
        reasons.push('Meeting process detected but ignored without window data');
      }
    }

    if (!detectedMeeting && hasProcessMatch) {
      reasons.push('Meeting process detected');
    }

    this.diagnostics = {
      detectedMeeting,
      confidence,
      reasons,
      activeWindowTitle: activeTitle || undefined,
      activeWindowOwner: activeOwner || undefined,
      matchedProcesses,
      lastUpdatedAt: Date.now()
    };

    onUpdate(this.getDiagnostics());
  }

  private async getActiveWinFunction() {
    if (process.platform === 'darwin' && this.isPackaged()) {
      const binaryPath = path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'node_modules',
        'active-win',
        'main'
      );
      const execFile = promisify(childProcess.execFile);
      return async () => {
        const { stdout } = await execFile(binaryPath, ['--no-accessibility-permission']);
        return this.parseActiveWin(stdout);
      };
    }

    const activeWinModuleId = this.getActiveWinModuleId();
    const activeWinModule = await import(activeWinModuleId).catch((error) => {
      this.logger.warn('Active-win import failed', {
        error: String(error),
        module: activeWinModuleId
      });
      return undefined;
    });

    if (!activeWinModule) {
      return undefined;
    }

    const activeWin =
      (activeWinModule as unknown as { activeWindow?: (options?: any) => Promise<any> }).activeWindow ??
      (activeWinModule as unknown as { default?: (options?: any) => Promise<any> }).default ??
      (activeWinModule as unknown as (options?: any) => Promise<any>);

    if (process.platform === 'darwin') {
      return () => activeWin({ accessibilityPermission: false });
    }

    return activeWin;
  }

  private getActiveWinModuleId() {
    const require = createRequire(import.meta.url);
    const entryPath = require.resolve('active-win');
    const packageRoot = path.dirname(entryPath);
    const macosModule = pathToFileURL(path.join(packageRoot, 'lib', 'macos.js')).href;
    const linuxModule = pathToFileURL(path.join(packageRoot, 'lib', 'linux.js')).href;
    const windowsModule = pathToFileURL(path.join(packageRoot, 'lib', 'windows.js')).href;

    if (process.platform === 'darwin') {
      return macosModule;
    }
    if (process.platform === 'linux') {
      return linuxModule;
    }
    if (process.platform === 'win32') {
      return windowsModule;
    }
    return 'active-win';
  }

  private parseActiveWin(stdout: string) {
    try {
      return JSON.parse(stdout);
    } catch (error) {
      this.logger.warn('Active window parse failed', { error: String(error) });
      throw new Error('Error parsing window data');
    }
  }

  private isPackaged() {
    try {
      return app.isPackaged;
    } catch {
      return false;
    }
  }

  private formatActiveWinError(error: unknown) {
    if (!error || typeof error !== 'object') {
      return { error: String(error) };
    }
    const err = error as {
      message?: string;
      code?: string | number;
      signal?: string;
      stdout?: string;
      stderr?: string;
    };
    return {
      error: err.message ?? String(error),
      code: err.code,
      signal: err.signal,
      stdout: err.stdout,
      stderr: err.stderr
    };
  }
}
