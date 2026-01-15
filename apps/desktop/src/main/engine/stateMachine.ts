import { EventEmitter } from 'node:events';
import { resolveEffectiveStatus } from './rules.js';
import type { EffectiveStatus, EngineState, ManualStatus } from './types.js';

interface StateMachineEvents {
  effectiveStatus: [EffectiveStatus, EngineState];
  stateChanged: [EngineState];
}

export class StateMachine extends EventEmitter {
  private state: EngineState;

  constructor(initialState: EngineState) {
    super();
    this.state = initialState;
  }

  getState() {
    return { ...this.state };
  }

  setManualStatus(manualStatus: ManualStatus) {
    this.updateState({ manualStatus });
  }

  setAutoDetectEnabled(autoDetectEnabled: boolean) {
    this.updateState({ autoDetectEnabled });
  }

  setDetectedMeeting(detectedMeeting: boolean) {
    this.updateState({ detectedMeeting });
  }

  private updateState(partial: Partial<EngineState>) {
    const nextState: EngineState = {
      ...this.state,
      ...partial
    };
    const nextEffective = resolveEffectiveStatus(
      nextState.manualStatus,
      nextState.autoDetectEnabled,
      nextState.detectedMeeting
    );
    const effectiveChanged = nextEffective !== this.state.effectiveStatus;
    nextState.effectiveStatus = nextEffective;
    this.state = nextState;
    this.emit('stateChanged', this.getState());
    if (effectiveChanged) {
      this.emit('effectiveStatus', nextEffective, this.getState());
    }
  }

  override on<T extends keyof StateMachineEvents>(
    event: T,
    listener: (...args: StateMachineEvents[T]) => void
  ): this {
    return super.on(event, listener);
  }
}
