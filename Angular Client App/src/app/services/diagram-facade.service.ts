/**
 * DiagramFacadeService
 * Wraps the Syncfusion DiagramComponent instance and exposes
 * all diagram operations as a service.
 * The DiagramEditorComponent registers the diagram instance via register().
 */

import { Injectable } from '@angular/core';
import type { DiagramComponent } from '@syncfusion/ej2-angular-diagrams';
import { ConnectorConstraints, DiagramTools, Gradient, NodeConstraints } from '@syncfusion/ej2-diagrams';
import type { Connector, ConnectorModel, IExportOptions, LinkTarget, Node, NodeModel, ShapeAnnotationModel, TextStyleModel } from '@syncfusion/ej2-diagrams';
import type { NodeProperties, ConnectorProperties } from '../types/diagram-types';
import { ToolbarStateService } from './toolbar-state.service';
import { SelectionStateService } from './selection-state.service';
import { AnnotationAddService } from './annotation-add.service';
import { CollaborationService } from './collaboration.service';

@Injectable({ providedIn: 'root' })
export class DiagramFacadeService {
  private diagram: DiagramComponent | null = null;

  constructor(
    private readonly collab: CollaborationService,
    private readonly toolbarState: ToolbarStateService,
    private readonly selectionState: SelectionStateService,
    private readonly annotationAddSvc: AnnotationAddService,
  ) { }

  /** Called by DiagramEditorComponent once the EJ2 diagram is ready */
  register(diagram: DiagramComponent): void {
    this.diagram = diagram;
  }

  unregister(): void {
    this.diagram = null;
  }

  getDiagram(): DiagramComponent | null {
    return this.diagram;
  }

  // --- History ------------------------------------------------------

  undo(): void { this.diagram?.undo(); this.refreshToolbarState(); }
  redo(): void { this.diagram?.redo(); this.refreshToolbarState(); }
  canUndo(): boolean { return this.diagram?.historyManager?.canUndo ?? false; }
  canRedo(): boolean { return this.diagram?.historyManager?.canRedo ?? false; }

  // --- Clipboard ----------------------------------------------------

  cut(): void { this.diagram?.cut(); }
  copy(): void { this.diagram?.copy(); }
  paste(): void { this.diagram?.paste(); }

  // --- Group --------------------------------------------------------

  group(): void { this.diagram?.group(); this.refreshToolbarState(); }
  ungroup(): void { this.diagram?.unGroup?.(); this.refreshToolbarState(); }

  // --- Selection ----------------------------------------------------

  getSelectionCount(): number {
    if (!this.diagram) return 0;
    const nodes = this.diagram.selectedItems?.nodes?.length ?? 0;
    const connectors = this.diagram.selectedItems?.connectors?.length ?? 0;
    return nodes + connectors;
  }

  // --- Tools --------------------------------------------------------

  setDrawingTool(tool: 'Default' | 'Text' | 'Pan'): void {
    if (!this.diagram) return;
    if (tool === 'Default') {
      this.diagram.tool = DiagramTools.Default;
    } else if (tool === 'Text') {
      this.diagram.tool = DiagramTools.DrawOnce;
      this.diagram.drawingObject = { shape: { type: 'Text' } };
    } else if (tool === 'Pan') {
      this.diagram.tool = DiagramTools.ZoomPan;
    }
  }

  drawShape(shape: 'Rectangle' | 'Ellipse' | 'Polygon'): void {
    if (!this.diagram) return;
    this.diagram.tool = DiagramTools.ContinuousDraw;
    this.diagram.drawingObject = { shape: { type: 'Basic', shape } };
  }

  drawConnector(type: 'Straight' | 'Orthogonal' | 'Bezier'): void {
    if (!this.diagram) return;
    this.diagram.tool = DiagramTools.ContinuousDraw;
    const connector: ConnectorModel = { id: `connector_${Date.now()}`, type };
    this.diagram.drawingObject = connector;
  }

  // --- Zoom / View --------------------------------------------------

  zoomIn(): void { this.diagram?.zoomTo({ type: 'ZoomIn', zoomFactor: 0.2 }); }
  zoomOut(): void { this.diagram?.zoomTo({ type: 'ZoomOut', zoomFactor: 0.2 }); }
  fitToPage(): void { this.diagram?.fitToPage({ mode: 'Page', region: 'Content', canZoomOut: true }); }

  // --- File ops -----------------------------------------------------

  clearDiagram(): void {
    if (!this.diagram) return;
    const nodes = this.diagram.nodes;
    const connectors = this.diagram.connectors;
    this.diagram.startGroupAction();
    // remove nodes (loop backwards)
    for (let index = nodes.length - 1; index >= 0; index--) {
      this.diagram.remove(nodes[index]);
    }
    // remove connectors (loop backwards)
    for (let index = connectors.length - 1; index >= 0; index--) {
      this.diagram.remove(connectors[index]);
    }
    this.diagram.endGroupAction();
    this.diagram.clearHistory();
    this.selectionState.clear();
    this.toolbarState.reset();
  }

  async loadDiagram(data: string): Promise<void> {
    if (!this.diagram) return;
    this.diagram.loadDiagram(data);
    this.refreshToolbarState();
    // Broadcast load to other connected clients
    await this.collab.broadcastLoadDiagram(data);
    // Update diagram content childrens to update according to updated viewport(with or without propertypanel)
    this.diagram?.updateViewPort();
  }

  saveDiagram(): string {
    if (!this.diagram) return '{}';
    const json = this.diagram.saveDiagram() as string;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flowchart.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return json;
  }

  exportDiagram(format: 'JPG' | 'PNG' | 'SVG'): void {
    if (!this.diagram) return;
    const options: IExportOptions = { format, mode: 'Download', region: 'Content', fileName: 'Diagram' };
    this.diagram.exportDiagram(options);
  }

  print(): void {
    if (!this.diagram) return;
    this.diagram.print({ region: 'Content' });
  }

  // --- Property updates ---------------------------------------------

  updateNodeProperties(properties: Partial<NodeProperties>): void {
    if (!this.diagram) return;
    const selectedItems = this.diagram.selectedItems;
    if (!selectedItems?.nodes?.length) return;
    for (const node of selectedItems.nodes) {
      if (properties.offsetX !== undefined) node.offsetX = properties.offsetX;
      if (properties.offsetY !== undefined) node.offsetY = properties.offsetY;
      if (properties.width !== undefined) node.width = properties.width;
      if (properties.height !== undefined) node.height = properties.height;
      if (properties.rotateAngle !== undefined) node.rotateAngle = properties.rotateAngle;

      // Handle aspect ratio constraint
      if (properties.aspectRatio !== undefined) {
        const currentConstraints = node.constraints ?? NodeConstraints.Default;
        if (properties.aspectRatio) {
          // Enable aspect ratio constraint
          node.constraints = currentConstraints | NodeConstraints.AspectRatio;
        } else {
          // Disable aspect ratio constraint
          node.constraints = currentConstraints & ~NodeConstraints.AspectRatio;
        }
      }

      if (
        properties.fillColor !== undefined || properties.strokeColor !== undefined ||
        properties.strokeWidth !== undefined || properties.opacity !== undefined ||
        properties.borderDashArray !== undefined
      ) {
        const currentStyle = (node as Node).style || {};
        node.style = {
          ...currentStyle,
          fill: properties.fillColor ?? currentStyle.fill,
          strokeColor: properties.strokeColor ?? currentStyle.strokeColor,
          strokeWidth: properties.strokeWidth ?? currentStyle.strokeWidth,
          opacity: properties.opacity ?? currentStyle.opacity,
          strokeDashArray: properties.borderDashArray ?? currentStyle.strokeDashArray,
        };
      }

      if (
        properties.text !== undefined || properties.fontSize !== undefined ||
        properties.fontFamily !== undefined || properties.fontColor !== undefined ||
        properties.textAlign !== undefined || properties.bold !== undefined ||
        properties.italic !== undefined || properties.textOpacity !== undefined ||
        properties.underline !== undefined || properties.textPosition !== undefined
      ) {
        const annotations = node.annotations;
        if (annotations && annotations.length > 0) {
          const annIdx = properties.annotationIndex ?? 0;
          const idx = Math.max(0, Math.min(annIdx, annotations.length - 1));
          const ann = annotations[idx];

          if (!ann.style) ann.style = {};
          if (properties.text !== undefined) ann.content = properties.text;
          if (properties.fontSize !== undefined) ann.style.fontSize = properties.fontSize;
          if (properties.fontFamily !== undefined) ann.style.fontFamily = properties.fontFamily;
          if (properties.fontColor !== undefined) ann.style.color = properties.fontColor;
          if (properties.textAlign !== undefined) ann.style.textAlign = properties.textAlign;
          if (properties.bold !== undefined) ann.style.bold = properties.bold;
          if (properties.italic !== undefined) ann.style.italic = properties.italic;
          if (properties.underline !== undefined) ann.style.textDecoration = properties.underline ? 'Underline' : 'None';
          if (properties.textOpacity !== undefined) ann.style.opacity = properties.textOpacity;

          if (properties.textPosition !== undefined) ann.offset = DiagramFacadeService.getOffset(properties.textPosition);
        }
      }
    }

    this.diagram.dataBind?.();
  }


  /**
   * Applies or removes a linear gradient on the currently selected node's style.
   * Pass `null` to remove the gradient and fall back to a plain fill colour.
   */
  updateNodeGradient(
    data: { color1: string; color2: string; direction: string; fill: string } | null,
  ): void {
    if (!this.diagram) return;
    const selectedItems = this.diagram.selectedItems;
    if (!selectedItems?.nodes?.length) return;
    for (const node of selectedItems.nodes) {
      const currentStyle = node.style || {};

      if (!data) {
        // Remove gradient — restore plain fill
        node.style = {
          ...currentStyle,
          fill: currentStyle.fill || '#6BA5D7',
          gradient: { type: 'None' },
        };
      } else {
        const coords = DiagramFacadeService._gradientCoords(data.direction);
        node.style = {
          ...currentStyle,
          gradient: {
            type: 'Linear',
            x1: coords.x1,
            y1: coords.y1,
            x2: coords.x2,
            y2: coords.y2,
            stops: [
              { color: data.color1, offset: 0 },
              { color: data.color2, offset: 100 },
            ],
          },
        };
      }
    }
    this.diagram.dataBind?.();
  }

  static getOffset(position: string): { x: number; y: number } {
    switch (position.toLowerCase()) {
      case 'topleft': return { x: 0, y: 0 };
      case 'topcenter': return { x: 0.5, y: 0 };
      case 'topright': return { x: 1, y: 0 };
      case 'middleleft': return { x: 0, y: 0.5 };
      case 'middleright': return { x: 1, y: 0.5 };
      case 'bottomleft': return { x: 0, y: 1 };
      case 'bottomcenter': return { x: 0.5, y: 1 };
      case 'bottomright': return { x: 1, y: 1 };
      default: return { x: 0.5, y: 0.5 }; // center
    }
  }

  /** Reverse-maps an annotation offset {x,y} back to a named position string. */
  static getPositionFromOffset(offset: { x: number; y: number } | undefined): string {
    if (!offset) return 'Center';
    const { x, y } = offset;
    if (x === 0 && y === 0) return 'TopLeft';
    if (x === 0.5 && y === 0) return 'TopCenter';
    if (x === 1 && y === 0) return 'TopRight';
    if (x === 0 && y === 0.5) return 'MiddleLeft';
    if (x === 1 && y === 0.5) return 'MiddleRight';
    if (x === 0 && y === 1) return 'BottomLeft';
    if (x === 0.5 && y === 1) return 'BottomCenter';
    if (x === 1 && y === 1) return 'BottomRight';
    return 'Center';
  }

  private static _gradientCoords(direction: string): { x1: number; y1: number; x2: number; y2: number } {
    switch (direction) {
      case 'LeftToRight': return { x1: 0, y1: 0, x2: 100, y2: 0 };
      case 'RightToLeft': return { x1: 100, y1: 0, x2: 0, y2: 0 };
      case 'BottomToTop': return { x1: 0, y1: 100, x2: 0, y2: 0 };
      case 'TopToBottom':
      default: return { x1: 0, y1: 0, x2: 0, y2: 100 };
    }
  }

  static getGradientDirection(gradient: any): string {
    if (!gradient || gradient.type !== 'Linear') return 'TopToBottom';
    const { x1 = 0, y1 = 0, x2 = 0, y2 = 0 } = gradient;
    // Horizontal: y coords are both 0
    if (y1 === 0 && y2 === 0) return x2 === 100 ? 'LeftToRight' : 'RightToLeft';
    // Vertical: x coords are both 0
    return y2 === 100 ? 'TopToBottom' : 'BottomToTop';
  }

  updateNodeHyperlink(
    data: { content: string; link: string; hyperlinkOpenState: LinkTarget } | null,
  ): void {
    if (!this.diagram) return;
    const selectedItems = this.diagram.selectedItems;
    if (!selectedItems?.nodes?.length) return;
    const node = selectedItems.nodes[0];

    // Ensure the node has at least one annotation
    if (!node.annotations || node.annotations.length === 0) {
      this.diagram.addLabels(node, [{ content: data?.content ?? '', hyperlink: data ?? undefined }]);
      this.annotationAddSvc.notifyAction({ type: 'linkInserted', nodeId: node.id });
    } else {
      const ann = node.annotations[0];
      if (data) {
        ann.hyperlink = {
          content: data.content,
          link: data.link,
          hyperlinkOpenState: data.hyperlinkOpenState,
        };
        // Sync annotation display text with hyperlink content
        if (data.content) ann.content = data.content;
      }
    }

    this.diagram.dataBind?.();
  }

  updateConnectorProperties(properties: Partial<ConnectorProperties>): void {
    if (!this.diagram) return;
    const selectedItems = this.diagram.selectedItems;
    if (!selectedItems?.connectors?.length) return;
    for (const connector of selectedItems.connectors) {

      if (properties.connectorType !== undefined) connector.type = properties.connectorType;

      if (
        properties.strokeColor !== undefined || properties.strokeWidth !== undefined ||
        properties.strokeDashArray !== undefined || properties.opacity !== undefined
      ) {
        connector.style = {
          ...connector.style,
          strokeColor: properties.strokeColor ?? connector.style?.strokeColor,
          strokeWidth: properties.strokeWidth ?? connector.style?.strokeWidth,
          strokeDashArray: properties.strokeDashArray ?? connector.style?.strokeDashArray,
          opacity: properties.opacity ?? connector.style?.opacity,
        };
      }

      if (properties.sourceDecorator !== undefined || properties.startArrowSize !== undefined) {
        connector.sourceDecorator = {
          ...connector.sourceDecorator,
          shape: properties.sourceDecorator ?? connector.sourceDecorator?.shape,
          width: properties.startArrowSize ?? connector.sourceDecorator?.width,
          height: properties.startArrowSize ?? connector.sourceDecorator?.height,
        };
      }

      if (properties.targetDecorator !== undefined || properties.endArrowSize !== undefined) {
        connector.targetDecorator = {
          ...connector.targetDecorator,
          shape: properties.targetDecorator ?? connector.targetDecorator?.shape,
          width: properties.endArrowSize ?? connector.targetDecorator?.width,
          height: properties.endArrowSize ?? connector.targetDecorator?.height,
        };
      }
      // Handle bridging constraint
      if (properties.bridging !== undefined) {
        const currentConstraints = connector.constraints ?? ConnectorConstraints.Default;
        if (properties.bridging) {
          // Enable bridging constraint
          connector.constraints = currentConstraints | ConnectorConstraints.Bridging;
        } else {
          // Disable bridging constraint
          connector.constraints = currentConstraints & ~ConnectorConstraints.Bridging;
        }
      }

      if (
        properties.text !== undefined || properties.fontSize !== undefined ||
        properties.fontFamily !== undefined || properties.fontColor !== undefined ||
        properties.textPosition !== undefined || properties.textAlign !== undefined ||
        properties.bold !== undefined || properties.italic !== undefined ||
        properties.underline !== undefined || properties.textOpacity !== undefined
      ) {
        const annotations = (connector as Connector).annotations;
        if (annotations && annotations.length > 0) {
          const ann = annotations[0];
          if (!ann.style) ann.style = {};
          if (properties.text !== undefined) ann.content = properties.text;
          if (properties.fontSize !== undefined) ann.style.fontSize = properties.fontSize;
          if (properties.fontFamily !== undefined) ann.style.fontFamily = properties.fontFamily;
          if (properties.fontColor !== undefined) ann.style.color = properties.fontColor;
          if (properties.textPosition !== undefined) ann.alignment = properties.textPosition;
          if (properties.textAlign !== undefined) ann.style.textAlign = properties.textAlign;
          if (properties.bold !== undefined) ann.style.bold = properties.bold;
          if (properties.italic !== undefined) ann.style.italic = properties.italic;
          if (properties.underline !== undefined) ann.style.textDecoration = properties.underline ? 'Underline' : 'None';
          if (properties.textOpacity !== undefined) ann.style.opacity = properties.textOpacity;
        }
      }
    }
    this.diagram.dataBind?.();
  }

  // --- Helpers ------------------------------------------------------

  /** Returns true when exactly one node is selected and it is a group (has children). */
  isGroupNodeSelected(): boolean {
    if (!this.diagram) return false;
    const selectedItems = this.diagram.selectedItems;
    const nodes: NodeModel[] = selectedItems?.nodes ?? [];
    const connectors: ConnectorModel[] = selectedItems?.connectors ?? [];
    if (nodes.length === 1 && connectors.length === 0) {
      return Array.isArray(nodes[0]?.children) && nodes[0].children.length > 0;
    }
    return false;
  }

  refreshToolbarState(): void {
    const count = this.getSelectionCount();
    this.toolbarState.update({
      isUndoEnabled: this.canUndo(),
      isRedoEnabled: this.canRedo(),
      isCutEnabled: count > 0,
      isCopyEnabled: count > 0,
      // Group: enabled only when 2+ nodes/connectors are selected
      isGroupEnabled: count >= 2,
      // Ungroup: enabled only when a single group node (with children) is selected
      isUngroupEnabled: this.isGroupNodeSelected(),
    });
  }

  getFirstAnnotatedSelectedNode() {
    if (!this.diagram) return;
    const sel = this.diagram.selectedItems;
    const firstNodeWithAnno = (sel?.nodes ?? []).find(n => Array.isArray((n as any).annotations) && (n as any).annotations.length > 0);
    return firstNodeWithAnno ?? null;
  }
  getFirstAnnotatedSelectedConnector() {
    if (!this.diagram) return;
    const sel = this.diagram.selectedItems;
    const firstConnWithAnno = (sel?.connectors ?? []).find(c => Array.isArray((c as any).annotations) && (c as any).annotations.length > 0);
    return firstConnWithAnno ?? null;
  }

  /**
  * Convert a color name or hex to a hex value.
  * Returns null if invalid.
  */
  static colorToHex(colorInput: string | undefined): string | null {
    if (!colorInput) return null;

    const color = colorInput.trim().toLowerCase();

    // 1. If already a valid hex (#RGB, #RRGGBB)
    const hexRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
    if (hexRegex.test(color)) {
      // Normalize to 6-digit hex
      if (color.length === 4) {
        return "#" + [...color.slice(1)].map(ch => ch + ch).join("");
      }
      return color;
    }

    // 2. Try converting named color to hex
    const tempElem = document.createElement("div");
    tempElem.style.color = color;
    document.body.appendChild(tempElem);

    const rgb = window.getComputedStyle(tempElem).color;
    document.body.removeChild(tempElem);

    const rgbMatch = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!rgbMatch) return null;

    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, "0");
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, "0");
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, "0");

    return `#${r}${g}${b}`;
  }

  static getUserColor(userName: string | null | undefined): string {
    const colors: string[] = [
      "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
      "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6",
      "#f97316", "#06b6d4"
    ];

    if (userName && !isNaN(Number(userName))) {
      const userId = Number(userName);
      return colors[Math.abs(userId) % colors.length];
    }
    else if (userName && userName.length > 0) {
      const hash = DiagramFacadeService.simpleHash(userName);
      return colors[Math.abs(hash) % colors.length];
    }

    return colors[0];
  }

  static simpleHash(value: string): number {
    let hash = 0;

    for (let i = 0; i < value.length; i++) {
      hash += value.charCodeAt(i);
    }

    return hash;
  }
}
