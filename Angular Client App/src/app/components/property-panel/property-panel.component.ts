import { Component, Input, OnChanges, OnInit, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NumericTextBoxModule, SliderModule, ColorPickerModule } from '@syncfusion/ej2-angular-inputs';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { NodeConstraints, TextAlign } from '@syncfusion/ej2-angular-diagrams';
import type { NodeProperties, SelectedItem } from '../../types/diagram-types';
import { DiagramFacadeService } from '../../services/diagram-facade.service';
import { FormsModule } from '@angular/forms';
import {
  InsertHyperlinkDialogComponent,
  type HyperlinkData,
} from './insert-hyperlink-dialog/insert-hyperlink-dialog.component';
import { AnnotationAddService } from '../../services/annotation-add.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-property-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NumericTextBoxModule, SliderModule, ColorPickerModule, DropDownListModule, ButtonModule, InsertHyperlinkDialogComponent],
  templateUrl: './property-panel.component.html',
  styleUrl: './property-panel.component.css',
})
export class PropertyPanelComponent implements OnChanges, OnInit, OnDestroy {
  @Input() selectedItem: SelectedItem = null;

  properties: NodeProperties | null = null;
  showGradient = false;
  hasAnnotation = false;

  // --- Hyperlink dialog state ---------------------------------------
  hyperlinkDialogVisible = false;
  hyperlinkInitialData: Partial<HyperlinkData> | null = null;

  readonly fontFamilies = [
    { text: 'Arial', value: 'Arial' },
    { text: 'Verdana', value: 'Verdana' },
    { text: 'Times New Roman', value: 'Times New Roman' },
    { text: 'Courier New', value: 'Courier New' },
    { text: 'Georgia', value: 'Georgia' },
    { text: 'Comic Sans MS', value: 'Comic Sans MS' },
  ];

  readonly textPositions = [
    { text: 'Top Left', value: 'TopLeft' },
    { text: 'Top Center', value: 'TopCenter' },
    { text: 'Top Right', value: 'TopRight' },
    { text: 'Middle Left', value: 'MiddleLeft' },
    { text: 'Center', value: 'Center' },
    { text: 'Middle Right', value: 'MiddleRight' },
    { text: 'Bottom Left', value: 'BottomLeft' },
    { text: 'Bottom Center', value: 'BottomCenter' },
    { text: 'Bottom Right', value: 'BottomRight' },
  ];

  readonly textAligns = [
    { text: 'Left', value: 'Left' },
    { text: 'Center', value: 'Center' },
    { text: 'Right', value: 'Right' },
  ];

  readonly backgroundTypes = [
    { text: 'Solid', value: 'Solid' },
    { text: 'Gradient', value: 'Gradient' },
  ];

  readonly borderTypes = [
    { text: '', value: '', className: 'ddl-svg-style ddl_linestyle_none' },
    { text: '1,2', value: '1,2', className: 'ddl-svg-style ddl_linestyle_one_two' },
    { text: '3,3', value: '3,3', className: 'ddl-svg-style ddl_linestyle_three_three' },
    { text: '5,3', value: '5,3', className: 'ddl-svg-style ddl_linestyle_five_three' },
    { text: '4,4,1', value: '4,4,1', className: 'ddl-svg-style ddl_linestyle_four_four_one' },
  ];

  readonly gradientDirections = [
    { text: 'Bottom to Top', value: 'BottomToTop' },
    { text: 'Top to Bottom', value: 'TopToBottom' },
    { text: 'Right to Left', value: 'RightToLeft' },
    { text: 'Left to Right', value: 'LeftToRight' },
  ];

  constructor(private readonly facade: DiagramFacadeService, private readonly annotationAddSvc: AnnotationAddService) {}

  private _subs: Subscription[] = []
  
  ngOnInit() {
    this._subs.push(this.annotationAddSvc.annotationChanged$.subscribe(event => {
      if (event.type === 'linkInserted' && this.selectedItem?.type === 'node' && this.selectedItem.node.id === event.nodeId) {
        // If a link was inserted into the currently selected node, refresh properties to show hyperlink data
        this._buildProperties();
      }
    }));
  }

  ngOnDestroy() {
    this._subs?.forEach(sub => sub.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedItem']) {
      this._buildProperties();
    }
  }

  get opacityPercent(): number {
    return Math.round((this.properties?.opacity ?? 1) * 100);
  }

  // Update Selected Node with new property values when user changes an input
  handlePropertyUpdate(key: keyof NodeProperties, value: unknown): void {
    if (!this.properties) return;
    (this.properties as any)[key] = value;
    this.facade.updateNodeProperties({ [key]: value } as Partial<NodeProperties>);
  }

  onGradientChange(value: string): void {
    if (!this.properties) return;
    const isGradient = value === 'Gradient';
    this.properties.isGradient = isGradient;
    this.showGradient = isGradient;

    if (isGradient) {
      // Enable gradient using current fill as color1 and existing gradientColor as color2
      this.facade.updateNodeGradient({
        color1: this.properties.fillColor ?? '#6BA5D7',
        color2: this.properties.gradientColor ?? '#FFFFFF',
        direction: this.properties.gradientDirection ?? 'TopToBottom',
        fill: this.properties.fillColor ?? '#6BA5D7',
      });
    } else {
      // Remove gradient — keep fill color
      this.facade.updateNodeGradient(null);
    }
  }

  onFillColorChange(e: any): void {
    const color = e.currentValue?.hex ?? e.value;
    this.handlePropertyUpdate('fillColor', color);
    // If gradient is active, re-apply gradient with updated primary color
    if (this.properties?.isGradient) {
      this.facade.updateNodeGradient({
        color1: color,
        color2: this.properties.gradientColor ?? '#FFFFFF',
        direction: this.properties.gradientDirection ?? 'TopToBottom',
        fill: color,
      });
    }
  }

  onStrokeColorChange(e: any): void {
    this.handlePropertyUpdate('strokeColor', e.currentValue?.hex ?? e.value);
  }

  onFontColorChange(e: any): void {
    this.handlePropertyUpdate('fontColor', e.currentValue?.hex ?? e.value);
  }

  onGradientColorChange(e: any): void {
    if (!this.properties) return;
    const color = e.currentValue?.hex ?? e.value;
    this.properties.gradientColor = color;
    if (this.properties.isGradient) {
      this.facade.updateNodeGradient({
        color1: this.properties.fillColor ?? '#6BA5D7',
        color2: color,
        direction: this.properties.gradientDirection ?? 'TopToBottom',
        fill: this.properties.fillColor ?? '#6BA5D7',
      });
    }
  }

  onGradientDirectionChange(e: any): void {
    if (!this.properties) return;
    const direction = e.value as string;
    this.properties.gradientDirection = direction;
    if (this.properties.isGradient) {
      this.facade.updateNodeGradient({
        color1: this.properties.fillColor ?? '#6BA5D7',
        color2: this.properties.gradientColor ?? '#FFFFFF',
        direction,
        fill: this.properties.fillColor ?? '#6BA5D7',
      });
    }
  }

  onTextPositionChange(e: any): void {
    this.handlePropertyUpdate('textPosition', e.value);
  }

  onTextAlignChange(align: 'Left' | 'Center' | 'Right'): void {
    this.handlePropertyUpdate('textAlign', align);
  }

  // -- Hyperlink dialog handlers --------------------------------------------

  openHyperlinkDialog(): void {
    if (!this.properties) return;
    this.hyperlinkInitialData = {
      content: this.properties.hyperlinkContent ?? this.properties.text ?? '',
      link: this.properties.hyperlinkUrl ?? '',
      hyperlinkOpenState: this.properties.hyperlinkOpenState ?? 'NewTab',
    };
    this.hyperlinkDialogVisible = true;
  }

  onHyperlinkApply(data: HyperlinkData): void {
    this.hyperlinkDialogVisible = false;
    if (!this.properties) return;

    if (!data.link) {
      // Remove hyperlink — clear fields and push null hyperlink to diagram
      this.properties.hyperlinkContent = undefined;
      this.properties.hyperlinkUrl = undefined;
      this.properties.hyperlinkOpenState = undefined;
      this.facade.updateNodeHyperlink(null);
      return;
    }

    this.properties.hyperlinkContent = data.content;
    this.properties.hyperlinkUrl = data.link;
    this.properties.hyperlinkOpenState = data.hyperlinkOpenState;

    this.facade.updateNodeHyperlink({
      content: data.content,
      link: data.link,
      hyperlinkOpenState: data.hyperlinkOpenState,
    });
  }

  onHyperlinkCancel(): void {
    this.hyperlinkDialogVisible = false;
  }

  // -- Build properties from selectedItem -------------------------------------

  private _buildProperties(): void {
    if (!this.selectedItem || this.selectedItem.type !== 'node') {
      this.properties = null;
      this.showGradient = false;
      this.hasAnnotation = false;
      return;
    }

    const node = this.selectedItem.node;
    const hasAnnotations = !!(node.annotations?.length);
    this.hasAnnotation = hasAnnotations;

    const rawTextAlign = node.annotations?.[0]?.style?.textAlign;
    const textAlignValue =
      rawTextAlign === 'Left' || rawTextAlign === 'Center' || rawTextAlign === 'Right'
        ? rawTextAlign : 'Center';

    const gradient = node.style!.gradient;
    const isGradient = gradient!.type !== 'None';
    this.showGradient = isGradient;

    // Check if aspect ratio constraint is enabled
    const nodeConstraints = node.constraints ?? NodeConstraints.Default;
    const hasAspectRatio = !!(nodeConstraints & NodeConstraints.AspectRatio);

    this.properties = {
      id: node.id || '',
      offsetX: node.offsetX || 0,
      offsetY: node.offsetY || 0,
      width: node.width || 100,
      height: node.height || 100,
      rotateAngle: node.rotateAngle || 0,
      aspectRatio: hasAspectRatio,
      fillColor: DiagramFacadeService.colorToHex(node.style?.fill) as string || '#6BA5D7',
      isGradient,
      gradientColor: isGradient ? DiagramFacadeService.colorToHex(gradient!.stops![1].color) as string : '#FFFFFF',
      gradientDirection: isGradient ? DiagramFacadeService.getGradientDirection(gradient) : 'TopToBottom',
      strokeColor: DiagramFacadeService.colorToHex(node.style?.strokeColor) as string || '#6BA5D7',
      strokeWidth: node.style?.strokeWidth || 1,
      opacity: node.style?.opacity ?? 1,
      borderDashArray: node.style?.strokeDashArray || '',
      text: node.annotations?.[0]?.content || '',
      fontSize: node.annotations?.[0]?.style?.fontSize || 12,
      fontFamily: node.annotations?.[0]?.style?.fontFamily || 'Arial',
      fontColor: DiagramFacadeService.colorToHex(node.annotations?.[0]?.style?.color) as string || '#FFFFFF',
      textAlign: textAlignValue as TextAlign,
      bold: node.annotations?.[0]?.style?.bold || false,
      italic: node.annotations?.[0]?.style?.italic || false,
      underline: node.annotations?.[0]?.style?.textDecoration === 'Underline',
      textOpacity: node.annotations?.[0]?.style?.opacity ?? 1,
      textPosition: DiagramFacadeService.getPositionFromOffset(node.annotations?.[0]?.offset as any),
      // Hyperlink
      hyperlinkContent: node.annotations?.[0]?.hyperlink?.content ?? undefined,
      hyperlinkUrl: node.annotations?.[0]?.hyperlink?.link ?? undefined,
      hyperlinkOpenState: node.annotations?.[0]?.hyperlink?.hyperlinkOpenState ?? undefined,
    };
  }
}
