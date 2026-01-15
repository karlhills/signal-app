import type { Output, OutputConfig, OutputContext } from '../outputs/types.js';
import type { EffectiveStatus } from './types.js';
import type { Logger } from '../utils/log.js';

interface OutputDispatcherDeps {
  outputs: Output[];
  logger: Logger;
  getContext: (previousStatus: EffectiveStatus | null) => OutputContext;
}

export function createOutputDispatcher({ outputs, logger, getContext }: OutputDispatcherDeps) {
  let previousStatus: EffectiveStatus | null = null;

  return async (status: EffectiveStatus, config: OutputConfig | null) => {
    const context = getContext(previousStatus);
    previousStatus = status;
    await Promise.all(
      outputs.map(async (output) => {
        try {
          await output.apply(status, config, context);
        } catch (error) {
          logger.warn('Output dispatch failed', { error: String(error) });
        }
      })
    );
  };
}
