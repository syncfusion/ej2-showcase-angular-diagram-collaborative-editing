import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule, ButtonPropsModel, AnimationSettingsModel } from '@syncfusion/ej2-angular-popups';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { TextBoxModule } from '@syncfusion/ej2-angular-inputs';
import { LinkTarget } from '@syncfusion/ej2-angular-diagrams';

export interface HyperlinkData {
  /** Display text shown as the annotation content */
  content: string;
  /** The navigation URL */
  link: string;
  /** Whether to open in a new tab or the current window */
  hyperlinkOpenState: LinkTarget;
}

@Component({
  selector: 'app-insert-hyperlink-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, DropDownListModule, ButtonModule, TextBoxModule],
  templateUrl: './insert-hyperlink-dialog.component.html',
  styleUrl: './insert-hyperlink-dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsertHyperlinkDialogComponent implements OnChanges {
  /** Controls dialog visibility. */
  @Input() visible = false;

  /** Pre-populated values when editing an existing hyperlink. */
  @Input() initialData: Partial<HyperlinkData> | null = null;

  /** Emits the confirmed HyperlinkData when the user clicks Apply. */
  @Output() apply = new EventEmitter<HyperlinkData>();

  /** Emits when the dialog is cancelled or closed without applying. */
  @Output() cancel = new EventEmitter<void>();

  // --- Form model ---------------------------------------------------
  displayText = '';
  url = '';
  urlError = '';
  openState: LinkTarget = 'NewTab';

  // --- Static options -----------------------------------------------

  readonly animationSettings: AnimationSettingsModel = { effect: 'FadeZoom' };

  dialogButtons: ButtonPropsModel[] = [];

  /** Prevents duplicate emit events while Angular processes the output (used with Promise.resolve hack) */
  private _emitting = false;

  constructor(private readonly cdr: ChangeDetectorRef) {
    this.dialogButtons = this._buildButtons();
  }

  // --- Lifecycle ----------------------------------------------------

  ngOnChanges(changes: SimpleChanges): void {
    if ('visible' in changes) {
      if (changes['visible'].currentValue === true) {
        // Populate from initialData (editing) or reset (inserting new)
        this.displayText = this.initialData?.content ?? '';
        this.url = this.initialData?.link ?? '';
        this.openState = this.initialData?.hyperlinkOpenState ?? 'NewTab';
        this.urlError = '';
        this._emitting = false;
        this.dialogButtons = this._buildButtons();
        this.cdr.markForCheck();
      }
    }
  }

  // --- Validation ---------------------------------------------------

  private _validate(): boolean {
    this.urlError = '';

    const trimmedUrl = this.url.trim();

    if (!trimmedUrl) {
      this.urlError = 'URL is required.';
    } else if (!/^https?:\/\/.+/i.test(trimmedUrl)) {
      this.urlError = 'URL must start with http:// or https://';
    }

    this.cdr.markForCheck();
    return !this.urlError;
  }

  // --- Event handlers -----------------------------------------------

  onApply(): void {
    if (!this._validate()) return;

    const data: HyperlinkData = {
      content: this.displayText.trim(),
      link: this.url.trim(),
      hyperlinkOpenState: this.openState,
    };
    this._emitting = true;
    this.apply.emit(data);
    Promise.resolve().then(() => (this._emitting = false));
  }

  onCancel(): void {
    if (this._emitting) return;
    this._emitting = true;
    this.cancel.emit();
    Promise.resolve().then(() => (this._emitting = false));
  }

  onDialogClose(): void {
    if (this._emitting) return;
    this.onCancel();
  }

  // --- Private helpers ----------------------------------------------

  private _buildButtons(): ButtonPropsModel[] {
    return [
      {
        click: () => this.onCancel(),
        buttonModel: { content: 'Cancel', cssClass: 'e-flat' },
      },
      {
        click: () => this.onApply(),
        buttonModel: { content: 'Apply', cssClass: 'e-primary', isPrimary: true },
      },
    ];
  }
}
