import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ToolbarModule,
  ToolbarComponent as EjsToolbarComponent,
  ClickEventArgs,
} from '@syncfusion/ej2-angular-navigations';
import {
  DropDownButtonModule,
  DropDownButtonComponent,
} from '@syncfusion/ej2-angular-splitbuttons';
import type { MenuEventArgs } from '@syncfusion/ej2-splitbuttons';
import { DiagramFacadeService } from '../../services/diagram-facade.service';
import { ToolbarStateService } from '../../services/toolbar-state.service';
import type { ToolbarState } from '../../types/diagram-types';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, ToolbarModule, DropDownButtonModule],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.css',
})
export class ToolbarComponent implements OnChanges {
  @Input() availableGuests = 1;
  @Input() toolbarState: ToolbarState = {
    isUndoEnabled: false,
    isRedoEnabled: false,
    isCutEnabled: false,
    isCopyEnabled: false,
    isPasteEnabled: false,
    isGroupEnabled: false,
    isUngroupEnabled: false,
  };

  @ViewChild('ejsToolbar') ejsToolbar?: EjsToolbarComponent;

  // Dropdown items
  readonly exportItems = [
    { text: 'JPG' },
    { text: 'PNG' },
    { text: 'SVG' },
  ];

  readonly shapeItems = [
    { text: 'Rectangle', iconCss: 'e-rectangle e-icons' },
    { text: 'Ellipse', iconCss: 'e-circle e-icons' },
    { text: 'Polygon', iconCss: 'e-line e-icons' },
  ];

  readonly connectorItems = [
    { text: 'Straight', iconCss: 'e-icons e-line' },
    { text: 'Orthogonal', iconCss: 'sf-diagram-icon-orthogonal' },
    { text: 'Bezier', iconCss: 'sf-diagram-icon-bezier' }
  ];

  get groupItems() {
    return [
      { iconCss: 'e-icons e-group-1', text: 'Group', disabled: !this.toolbarState.isGroupEnabled },
      { iconCss: 'e-icons e-ungroup-1', text: 'Ungroup', disabled: !this.toolbarState.isUngroupEnabled },
    ];
  }

  constructor(
    private readonly facade: DiagramFacadeService,
    private readonly toolbarStateService: ToolbarStateService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Re-enable/disable items when state changes
    if (changes['toolbarState']) {
      this._updateToolbarItems();
    }
  }

  // --- Toolbar click handler ----------------------------------------

  onToolbarClick(args: ClickEventArgs): void {
    const id = args.item.id;
    switch (id) {
      case 'new': this.facade.clearDiagram(); break;
      case 'open': this._openFile(); break;
      case 'save': this.facade.saveDiagram(); break;
      case 'print': this.facade.print(); break;
      case 'cut':
        this.facade.cut();
        this.toolbarStateService.enablePasteOnce();
        break;
      case 'copy':
        this.facade.copy();
        this.toolbarStateService.enablePasteOnce();
        break;
      case 'paste': this.facade.paste(); break;
      case 'undo': this.facade.undo(); break;
      case 'redo': this.facade.redo(); break;
      case 'pointer': this.facade.setDrawingTool('Default'); break;
      case 'text': this.facade.setDrawingTool('Text'); break;
      case 'pan': this.facade.setDrawingTool('Pan'); break;
      case 'zoomIn': this.facade.zoomIn(); break;
      case 'zoomOut': this.facade.zoomOut(); break;
      case 'fitToPage': this.facade.fitToPage(); break;
    }
  }

  // --- Dropdown select handlers -------------------------------------

  onExportSelect(args: MenuEventArgs): void {
    const format = args.item.text as 'JPG' | 'PNG' | 'SVG';
    this.facade.exportDiagram(format);
  }

  onShapeSelect(args: MenuEventArgs): void {
    const shape = args.item.text as 'Rectangle' | 'Ellipse' | 'Polygon';
    this.facade.drawShape(shape);
  }

  onConnectorSelect(args: MenuEventArgs): void {
    const type = args.item.text as 'Straight' | 'Orthogonal' | 'Bezier';
    this.facade.drawConnector(type);
  }

  onGroupSelect(args: MenuEventArgs): void {
    if (args.item.text === 'Group') this.facade.group();
    else this.facade.ungroup();
  }

  // --- Private helpers ----------------------------------------------

  private _openFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result as string;
          if (data) {
            JSON.parse(data); // validate
            this.facade.loadDiagram(data);
          }
        } catch { /* ignore invalid JSON */ }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  private _updateToolbarItems(): void {
    if (!this.ejsToolbar) return;
    const items = this.ejsToolbar.items;
    const enable = (id: string, val: boolean) => {
      const item = items.find((i) => i.id === id);
      if (item) item.disabled = !val;
    };
    enable('undo', this.toolbarState.isUndoEnabled);
    enable('redo', this.toolbarState.isRedoEnabled);
    enable('cut', this.toolbarState.isCutEnabled);
    enable('copy', this.toolbarState.isCopyEnabled);
    enable('paste', this.toolbarState.isPasteEnabled);
    this.ejsToolbar.refresh?.();
  }
}
