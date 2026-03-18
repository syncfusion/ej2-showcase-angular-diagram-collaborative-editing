/** Emits events when an annotation is added;
 * used for cross-component notification without full state management.
*/
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AnnotationAddService {
  private _annotationChanged = new Subject<any>();
  annotationChanged$ = this._annotationChanged.asObservable();

  notifyAction(payload: any): void {
    this._annotationChanged.next(payload);
  }
}