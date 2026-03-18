import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NumericTextBoxModule, SliderModule, ColorPickerModule } from '@syncfusion/ej2-angular-inputs';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { ButtonModule } from '@syncfusion/ej2-angular-buttons';
import { NodeModel, TextAlign } from '@syncfusion/ej2-angular-diagrams';
import type { ConnectorProperties, NodeProperties, SelectedItem } from '../../types/diagram-types';
import { DiagramFacadeService } from '../../services/diagram-facade.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-multi-property-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, NumericTextBoxModule, SliderModule, ColorPickerModule, DropDownListModule, ButtonModule],
  templateUrl: './multi-property-panel.component.html',
  styleUrl: './multi-property-panel.component.css',
})
export class MultiPropertyPanelComponent implements OnChanges {
  @Input() selectedItem: SelectedItem = null;

  properties: NodeProperties | null = null;
  showGradient = false;
  hasAnnotation = false;

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

  constructor(private readonly facade: DiagramFacadeService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedItem']) {
      this._buildProperties();
    }
  }

  get opacityPercent(): number {
    return Math.round((this.properties?.opacity ?? 1) * 100);
  }

  handlePropertyUpdate(key: keyof NodeProperties, value: unknown): void {
    if (!this.properties) return;
    (this.properties as any)[key] = value;
    this.facade.updateNodeProperties({ [key]: value } as Partial<NodeProperties>);
    this.facade.updateConnectorProperties({ [key]: value } as Partial<ConnectorProperties>);
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

  // --- Build properties from selectedItem ------------------------------
private _buildProperties(): void {
  // Expecting multi-selection context
  if (!this.selectedItem || this.selectedItem.type !== 'multiple') {
    this.properties = null;
    this.showGradient = false;
    this.hasAnnotation = false;
    return;
  }

  // --- Style source: first selected NODE only (ignore connectors) ---
  const firstNode: NodeModel | undefined = Array.isArray(this.selectedItem.nodes) && this.selectedItem.nodes.length > 0
    ? this.selectedItem.nodes[0]
    : undefined;

  // Safe style defaults if there is no node
  const nodeStyle = firstNode?.style ?? {};
  const gradient = (nodeStyle as any)?.gradient ?? { type: 'None', stops: [] };
  const isGradient: boolean = !!firstNode && gradient?.type && gradient.type !== 'None';
  this.showGradient = isGradient;

  // Derive gradientColor and direction safely
  const gradientStops = Array.isArray(gradient?.stops) ? gradient.stops : [];
  const gradientColor = isGradient && gradientStops[1]?.color ? gradientStops[1].color : '#FFFFFF';
  const gradientDirection = isGradient ? DiagramFacadeService.getGradientDirection(gradient) : 'TopToBottom';

  // --- Text source: first selected item (node or connector) that has an annotation ---
  const annotElement: any = this.facade.getFirstAnnotatedSelectedNode() ?? this.facade.getFirstAnnotatedSelectedConnector();
  const annotation = annotElement?.annotations?.length ? annotElement.annotations[0] : undefined;

  const hasAnnotation = !!annotation;
  this.hasAnnotation = hasAnnotation;

  // Text-related defaults if there is no annotation
  const defaultTextAlign: TextAlign = 'Center' as TextAlign;
  const rawTextAlign = (annotation?.style?.textAlign as string) ?? '';
  const validAlignValues = new Set(['Left', 'Center', 'Right', 'Justify']);
  const textAlign: TextAlign = (validAlignValues.has(rawTextAlign) ? rawTextAlign : defaultTextAlign) as TextAlign;

  const underline = ((): boolean => {
    const td = annotation?.style?.textDecoration;
    return td === 'Underline' || td === 'underline';
  })();

  // If you also want text opacity to default to 1 when not set
  const textOpacity = typeof annotation?.style?.opacity === 'number' ? annotation.style.opacity : 1;

  // Position: resolve from offset only if present
  const textPosition = DiagramFacadeService.getPositionFromOffset(
    (annotation?.offset as any) ?? { x: 0.5, y: 0.5 }
  );

  // Build properties object
  this.properties = {
    // ID comes from the first node if present; otherwise empty string
    id: firstNode?.id ?? '',

    // --- Style-bound to first selected NODE ---
    fillColor: DiagramFacadeService.colorToHex(nodeStyle.fill) as string || '#6BA5D7',
    isGradient,
    gradientColor: DiagramFacadeService.colorToHex(gradientColor) as string || '#FFFFFF',
    gradientDirection,
    strokeColor: DiagramFacadeService.colorToHex(nodeStyle.strokeColor) as string || '#6BA5D7',
    strokeWidth: nodeStyle.strokeWidth ?? 1,
    opacity: nodeStyle.opacity ?? 1,
    borderDashArray: nodeStyle.strokeDashArray ?? '',

    // --- Text-bound to first annotated selected element (node or connector) ---
    text: annotation?.content ?? '',
    fontSize: annotation?.style.fontSize ?? 12,
    fontFamily: annotation?.style?.fontFamily ?? 'Arial',
    fontColor: DiagramFacadeService.colorToHex(annotation?.style?.color) as string || '#FFFFFF',
    textAlign,
    bold: !!annotation?.style?.bold,
    italic: !!annotation?.style?.italic,
    underline,
    textOpacity,
    textPosition,
  };
}

}
