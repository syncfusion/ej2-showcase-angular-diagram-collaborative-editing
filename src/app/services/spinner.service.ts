/** Controls global loading spinner visibility via a simple BehaviorSubject. */
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SpinnerService {
  private _visible = new BehaviorSubject<boolean>(true); // start visible
  visible$ = this._visible.asObservable();

  show(): void {
    this._visible.next(true);
  }

  hide(): void {
    this._visible.next(false);
  }

}