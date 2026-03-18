/** Manages the current selection state (none/node/connector/etc.) 
 * for the diagram using a BehaviorSubject.
 * Exposes snapshot and observable for reactive updates.
 */
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import type { SelectedItem } from '../types/diagram-types';

export type SelectionType = 'none' | 'node' | 'connector' | 'annotation' | 'multiple';

export interface SelectionState {
  type: SelectionType;
  selectedItem: SelectedItem;
  count: number;
}

const INITIAL: SelectionState = { type: 'none', selectedItem: null, count: 0 };

@Injectable({ providedIn: 'root' })
export class SelectionStateService {
  private readonly _state = new BehaviorSubject<SelectionState>(INITIAL);

  readonly state$ = this._state.asObservable();

  get snapshot(): SelectionState {
    return this._state.value;
  }

  setSelection(state: SelectionState): void {
    this._state.next(state);
  }

  clear(): void {
    this._state.next(INITIAL);
  }
}
