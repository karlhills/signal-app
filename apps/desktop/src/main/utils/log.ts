type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  at: number;
  meta?: Record<string, unknown>;
}

export class Logger {
  private entries: LogEntry[] = [];
  private limit = 200;

  info(message: string, meta?: Record<string, unknown>) {
    this.push('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.push('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.push('error', message, meta);
  }

  getRecent(limit = 20) {
    return this.entries.slice(-limit);
  }

  private push(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    const entry = { level, message, at: Date.now(), meta };
    this.entries.push(entry);
    if (this.entries.length > this.limit) {
      this.entries.shift();
    }
    const metaSuffix = meta ? ` ${JSON.stringify(meta)}` : '';
    if (level === 'error') {
      console.error(`[signal] ${message}${metaSuffix}`);
    } else if (level === 'warn') {
      console.warn(`[signal] ${message}${metaSuffix}`);
    } else {
      console.log(`[signal] ${message}${metaSuffix}`);
    }
  }
}

export function createLogger() {
  return new Logger();
}
