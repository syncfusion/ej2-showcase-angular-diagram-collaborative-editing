/**  
 * Root shell component that wires the diagram editor UI (toolbar, palette,  
 * property panels, collaboration, and spinner).
 */

import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { DiagramEditorComponent } from '../components/diagram-editor/diagram-editor.component';
import { ToolbarComponent } from '../components/toolbar/toolbar.component';
import { SymbolPaletteComponent } from '../components/symbol-palette/symbol-palette.component';
import { PropertyPanelComponent } from '../components/property-panel/property-panel.component';
import { ConnectorPropertyPanelComponent } from '../components/connector-property-panel/connector-property-panel.component';
import { MultiPropertyPanelComponent } from '../components/multi-property-panel/multi-property-panel.component';
import { SpinnerComponent } from '../components/spinner/spinner.component';
import { ToastComponent, ToastModule } from '@syncfusion/ej2-angular-notifications';

import { SelectionStateService } from '../services/selection-state.service';
import { ToolbarStateService } from '../services/toolbar-state.service';
import { CollaborationService } from '../services/collaboration.service';
import { SpinnerService } from '../services/spinner.service';

import type { SelectedItem, SelectedMultipleItem, ToolbarState } from '../types/diagram-types';
import type { SelectionState } from '../services/selection-state.service';
import { BannerComponent } from '../components/banner/banner.component';

const DEFAULT_TOOLBAR_STATE: ToolbarState = {
  isUndoEnabled: false,
  isRedoEnabled: false,
  isCutEnabled: false,
  isCopyEnabled: false,
  isPasteEnabled: false,
  isGroupEnabled: false,
  isUngroupEnabled: false,
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    AsyncPipe,
    CommonModule,
    DiagramEditorComponent,
    ToolbarComponent,
    SymbolPaletteComponent,
    PropertyPanelComponent,
    ConnectorPropertyPanelComponent,
    MultiPropertyPanelComponent,
    SpinnerComponent,
    BannerComponent,
    ToastModule 
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent implements OnInit, OnDestroy {
  toolbarState: ToolbarState = { ...DEFAULT_TOOLBAR_STATE };
  selectionState: SelectionState | null = null;
  availableGuests: number = 1;

  @ViewChild('connectionMessage') public connectionMessage!: ToastComponent;

  private _subs: Subscription[] = [];

  constructor(
    private readonly selectionSvc: SelectionStateService,
    private readonly toolbarStateSvc: ToolbarStateService,
    public readonly collab: CollaborationService,
    public readonly spinner: SpinnerService,
  ) {}

  ngOnInit(): void {
    this._subs.push(
      this.selectionSvc.state$.subscribe((s) => (this.selectionState = s)),
      this.toolbarStateSvc.state$.subscribe((s) => (this.toolbarState = s ?? { ...DEFAULT_TOOLBAR_STATE })),
      this.collab.userCount$.subscribe((n) => (this.availableGuests = n)),
      this.collab.toastNotification$.subscribe((n) => {
        this.connectionMessage.content = n;
        try { this.connectionMessage.show(); } catch { /* ignore show errors */ }
      })
    );
  }

  ngOnDestroy(): void {
    this._subs.forEach((s) => s.unsubscribe());
  }

  // --------------------------------------------------------------
  // Selection change from DiagramEditorComponent
  // --------------------------------------------------------------
  onSelectionChange(item: SelectedItem): void {
    if (!item) {
      this.selectionSvc.setSelection({ type: 'none', selectedItem: null, count: 0 });
    } else if (item.type === 'node') {
      this.selectionSvc.setSelection({ type: 'node', selectedItem: item, count: 1 });
    } else if (item.type === 'connector') {
      this.selectionSvc.setSelection({ type: 'connector', selectedItem: item, count: 1 });
    } else if (item.type === 'annotation') {
      this.selectionSvc.setSelection({ type: 'annotation', selectedItem: item, count: 1 });
    } else if (item.type === 'multiple') {
      const nodes = (item as SelectedMultipleItem).nodes?.length ?? 0;
      const connectors = (item as SelectedMultipleItem).connectors?.length ?? 0;
      this.selectionSvc.setSelection({ type: 'multiple', selectedItem: item, count: nodes + connectors });
    }
  }

  // --------------------------------------------------------------
  // Helpers for template
  // --------------------------------------------------------------
  get selectedItemForPanel(): SelectedItem {
    return this.selectionState?.selectedItem ?? null;
  }

  get showNodePanel(): boolean {
    return this.selectionState?.type === 'node';
  }

  get showConnectorPanel(): boolean {
    const type = this.selectionState?.type;

    // Single connector selection
    if (type === 'connector') return true;

    // Multiple selection: show when there are zero nodes (=> only connectors)
    if (type === 'multiple') {
      const multi = this.selectionState?.selectedItem as SelectedMultipleItem | undefined;
      const nodeCount = multi?.nodes?.length ?? 0;
      return nodeCount === 0;
    }

    return false;
  }

  get showMultiNodePanel(): boolean {
    // Multiple selection with at least one node
    if (this.selectionState?.type !== 'multiple') return false;

    const multi = this.selectionState?.selectedItem as SelectedMultipleItem | undefined;
    const nodeCount = multi?.nodes?.length ?? 0;
    return nodeCount > 0;
  }
}
