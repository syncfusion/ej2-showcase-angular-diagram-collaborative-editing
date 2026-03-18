import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NumericTextBoxModule, SliderModule, ColorPickerModule } from '@syncfusion/ej2-angular-inputs';
import { DropDownListModule } from '@syncfusion/ej2-angular-dropdowns';
import { CheckBoxModule, ButtonModule } from '@syncfusion/ej2-angular-buttons';
import type { ConnectorProperties, SelectedItem, SelectedMultipleItem } from '../../types/diagram-types';
import { DiagramFacadeService } from '../../services/diagram-facade.service';
import { ConnectorConstraints, ConnectorModel } from '@syncfusion/ej2-angular-diagrams';

@Component({
  selector: 'app-connector-property-panel',
  standalone: true,
  imports: [CommonModule, NumericTextBoxModule, SliderModule, DropDownListModule, CheckBoxModule, ColorPickerModule, ButtonModule ],
  templateUrl: './connector-property-panel.component.html',
  styleUrl: './connector-property-panel.component.css',
})
export class ConnectorPropertyPanelComponent implements OnChanges {
  @Input() selectedItem: SelectedItem = null;

  properties: ConnectorProperties | null = null;
  sourceDecoratorType = 'None';
  targetDecoratorType = 'Arrow';
  hasAnnotation = false;

  readonly connectorTypes = [
    { text: 'Straight', value: 'Straight' },
    { text: 'Orthogonal', value: 'Orthogonal' },
    { text: 'Bezier', value: 'Bezier' },
  ];

  readonly strokeStyles = [
    { text: '', value: '', className: 'ddl-svg-style ddl_linestyle_none' },
    { text: '1,2', value: '1,2', className: 'ddl-svg-style ddl_linestyle_one_two' },
    { text: '3,3', value: '3,3', className: 'ddl-svg-style ddl_linestyle_three_three' },
    { text: '5,3', value: '5,3', className: 'ddl-svg-style ddl_linestyle_five_three' },
    { text: '4,4,1', value: '4,4,1', className: 'ddl-svg-style ddl_linestyle_four_four_one' },
  ];

  readonly decoratorTypes = [
    { text: 'None', value: 'None' },
    { text: 'Arrow', value: 'Arrow' },
    { text: 'Circle', value: 'Circle' },
    { text: 'Diamond', value: 'Diamond' },
    { text: 'OpenArrow', value: 'OpenArrow' },
    { text: 'Square', value: 'Square' },
    { text: 'DoubleArrow', value: 'DoubleArrow' },
  ];

  readonly fontFamilies = [
    { text: 'Arial', value: 'Arial' },
    { text: 'Times New Roman', value: 'Times New Roman' },
    { text: 'Courier New', value: 'Courier New' },
    { text: 'Verdana', value: 'Verdana' },
    { text: 'Georgia', value: 'Georgia' },
  ];

  readonly annotationAlignmentOptions = [
    { text: 'Before', value: 'Before' },
    { text: 'Center', value: 'Center' },
    { text: 'After', value: 'After' },
  ];

  constructor(private readonly facade: DiagramFacadeService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedItem']) {
      this._buildProperties();
    }
  }

  // Update Selected Connectors with new property values when user changes an input
  handlePropertyUpdate(key: keyof ConnectorProperties, value: unknown): void {
    if (!this.properties) return;
    (this.properties as any)[key] = value;
    this.facade.updateConnectorProperties({ [key]: value } as Partial<ConnectorProperties>);
  }

  onSourceDecoratorChange(value: string): void {
    this.sourceDecoratorType = value;
    this.facade.updateConnectorProperties({
      sourceDecorator: value as any,
    });
  }

  onTargetDecoratorChange(value: string): void {
    this.targetDecoratorType = value;
    this.facade.updateConnectorProperties({
      targetDecorator: value as any,
    });
  }

  // Builds properties and decorator flags from the currently selected connector
  private _buildProperties(): void {
    if (!this.selectedItem || (this.selectedItem.type === 'node' ||
      (this.selectedItem?.type === 'multiple' && this.selectedItem.nodes?.length !== 0))
    ) {
      this.properties = null;
      this.hasAnnotation = false;
      return;
    }

    let connector: ConnectorModel;
    if (this.selectedItem?.type === 'connector') {
      connector = this.selectedItem.connector;
    }
    else {
      // Multiple selected connectors
      connector = (this.selectedItem as SelectedMultipleItem).connectors[0];
    }

    this.sourceDecoratorType = connector.sourceDecorator?.shape || 'None';
    this.targetDecoratorType = connector.targetDecorator?.shape || 'Arrow';
    const hasBridging = !!(connector.constraints && (connector.constraints & ConnectorConstraints.Bridging));
    
    // --- Text source: first selected connector that has an annotation ---
    const annotElement: any = this.facade.getFirstAnnotatedSelectedConnector();
    const annotation = annotElement?.annotations?.length ? annotElement.annotations[0] : undefined;

    const hasAnnotation = !!annotation;
    this.hasAnnotation = hasAnnotation;

    this.properties = {
      id: connector.id || '',
      sourceID: connector.sourceID || '',
      targetID: connector.targetID || '',
      type: connector.type || 'Straight',
      connectorType: connector.type || 'Straight',
      strokeColor: DiagramFacadeService.colorToHex(connector.style?.strokeColor) as string || '#424242',
      strokeWidth: connector.style?.strokeWidth || 2,
      strokeDashArray: connector.style?.strokeDashArray || '',
      startArrowSize: connector.sourceDecorator?.width || 10,
      endArrowSize: connector.targetDecorator?.width || 10,
      bridging: hasBridging,
      opacity: connector.style?.opacity ?? 1,
      text: annotation?.content || '',
      fontSize: annotation?.style?.fontSize || 12,
      fontFamily: annotation?.style?.fontFamily || 'Arial',
      fontColor: DiagramFacadeService.colorToHex(annotation?.style?.color) as string || '#000000',
      textPosition: annotation?.alignment || 'Center',
      textAlign: annotation?.style?.textAlign || 'Center',
      bold: annotation?.style?.bold || false,
      italic: annotation?.style?.italic || false,
      underline: annotation?.style?.textDecoration === 'Underline',
      textOpacity: annotation?.style?.opacity ?? 1,
    };
  }
}
