/**
 * manage-palettes-dialog.component.ts
 * 
 * Dialog component that lets users enable/disable symbol palettes.
 * Uses Syncfusion ListView with checkboxes and emits the final list of
 * enabled palette IDs back to SymbolPaletteComponent.
 */

import { Component, Input, Output, EventEmitter, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListViewModule, ListViewComponent, SelectedCollection } from '@syncfusion/ej2-angular-lists';
import { DialogModule, AnimationSettingsModel } from '@syncfusion/ej2-angular-popups';
import { ConnectorModel, NodeModel } from '@syncfusion/ej2-angular-diagrams';

/**
 * Metadata describing each palette shown in the manage dialog.
 * Shared between SymbolPaletteComponent and this dialog.
 */
export interface PaletteMetadata {
  id: string;
  title: string;
  displayName: string;
  enabled: boolean;
  shapes: (NodeModel | ConnectorModel)[];
}

/**
 * Manage Palettes Dialog
 * 
 * Standalone component that displays a checkbox list of palettes.
 * Restores previously enabled palettes on open and emits updated IDs on Apply.
 */
@Component({
  selector: 'app-manage-palettes-dialog',
  standalone: true,
  imports: [CommonModule, ListViewModule, DialogModule],
  templateUrl: './manage-palettes-dialog.component.html',
  styleUrl: './manage-palettes-dialog.component.css',
})
export class ManagePalettesDialogComponent implements OnChanges {
  /** Input: Full list of palette metadata passed from SymbolPaletteComponent */
  @Input() palettes: PaletteMetadata[] = [];

  /** Input: Controls dialog visibility (bind with [visible] and (visibleChange)) */
  @Input() visible: boolean = false;

  /** Output: Emits array of enabled palette IDs when user clicks Apply */
  @Output() apply = new EventEmitter<string[]>();

  /** Output: Emits when user cancels or closes the dialog (Escape/X button) */
  @Output() cancel = new EventEmitter<void>();

  /** ViewChild reference to the Syncfusion ListView for programmatic check/uncheck */
  @ViewChild('listview') listview!: ListViewComponent;

  /** Internal simplified data source bound to the ListView (only id + text) */
  palettesData: any[] = [];

  /** Currently selected palette ID (used if a preview pane is added later) */
  selectedId: string = 'flow';

  /** Flag to show a fallback message/image when preview fails to load */
  imageLoadError: boolean = false;

  /** Animation settings for the Syncfusion Dialog */
  readonly animationSettings: AnimationSettingsModel = { effect: 'FadeZoom' };

  /** Field mapping passed to ejs-listview for text, id */
  fields: { text: string; id: string } = { 
    text: 'text', 
    id: 'id', 
  };

  /** Footer buttons for the dialog (Apply + Cancel) */
  dialogButtons: any[] = [
    {
      click: () => this.onApply(),
      buttonModel: { content: 'Apply', isPrimary: true, cssClass: 'e-primary' }
    },
    {
      click: () => this.onCancel(),
      buttonModel: { content: 'Cancel' }
    }
  ];

  /**
   * ngOnChanges
   * 
   * When the dialog becomes visible, we:
   *   1. Build the ListView data source
   *   2. Reset selection & error state
   *   3. Restore checked items after a tiny delay to ensure ListView is rendered
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && changes['visible'].currentValue === true) {
      this.initializeData();
      this.selectedId = 'flow';
      this.imageLoadError = false;

      // Small delay so ListView is fully rendered before calling checkItem
      setTimeout(() => {
        this.applyInitialChecks();
      }, 30);
    }
  }

  /**
   * Builds the minimal data array required by the Syncfusion ListView.
   * Only id and displayName are needed for rendering.
   */
  private initializeData(): void {
    this.palettesData = this.palettes.map((p) => ({
      id: p.id,
      text: p.displayName,
    }));
  }

  /**
   * Restores the checked state of palettes that were enabled before the dialog opened.
   */
  private applyInitialChecks(): void {
    if (!this.listview || !this.palettesData.length) return;

    const initiallyCheckedIds = this.palettes
      .filter((p) => p.enabled)
      .map((p) => p.id);

    initiallyCheckedIds.forEach((id) => {
      const itemData = this.palettesData.find((item) => item.id === id);
      if (itemData) {
        this.listview.checkItem({ id: itemData.id, text: itemData.text });
      }
    });
  }

  /**
   * Called when user selects an item in the ListView.
   */
  onItemSelect(args: any): void {
    this.selectedId = (args as any).data.id as string;
    this.imageLoadError = false;
  }

  /**
   * Callback triggered when a palette preview image fails to load.
   */
  onImageLoadError(): void {
    this.imageLoadError = true;
  }

  /**
   * onApply
   * 
   * Reads the currently checked items from the ListView and emits their IDs.
   * Parent (SymbolPaletteComponent) will update paletteMeta and rebuild active palettes.
   */
  onApply(): void {
    if (!this.listview) {
      this.apply.emit([]);
      return;
    }

    const checkedResult: SelectedCollection = this.listview.getSelectedItems() as SelectedCollection;
    let enabledIds: string[] = (checkedResult.data as any).map((item: any) => item.id);

    this.apply.emit(enabledIds);
  }

  /**
   * Emits cancel when user clicks the Cancel button.
   */
  onCancel(): void {
    this.cancel.emit();
  }

  /**
   * Emits cancel when the dialog is closed via Escape key or the X button.
   */
  onDialogClose(): void {
    this.cancel.emit();
  }
}