/** Maintains toolbar button enabled/disabled states (undo/redo/cut/etc.)
 * and provides partial updates plus one-time paste enablement.
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { ToolbarState } from '../types/diagram-types';

const INITIAL: ToolbarState = {
  isUndoEnabled: false,
  isRedoEnabled: false,
  isCutEnabled: false,
  isCopyEnabled: false,
  isPasteEnabled: false,
  isGroupEnabled: false,
  isUngroupEnabled: false,
};

@Injectable({ providedIn: 'root' })
export class ToolbarStateService {
  private readonly _state = new BehaviorSubject<ToolbarState>(INITIAL);

  readonly state$ = this._state.asObservable();

  get snapshot(): ToolbarState {
    return this._state.value;
  }

  update(state: Partial<ToolbarState>): void {
    this._state.next({ ...this._state.value, ...state });
  }

  reset(): void {
    this._state.next(INITIAL);
  }

  enablePasteOnce(): void {
    if (!this._state.value.isPasteEnabled) {
      this._state.next({ ...this._state.value, isPasteEnabled: true });
    }
  }
}
