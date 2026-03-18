/**
 * Type definitions for collaborative diagram editor (Angular port)
 * Mirrors react-app/src/script/diagramTypes.ts with Angular-compatible imports
 */

import type { NodeModel, ConnectorModel, LinkTarget, TextAlign, Segments, AnnotationAlignment  } from '@syncfusion/ej2-diagrams';

// Diagram state representation for collaboration
export interface DiagramState {
  nodes: NodeModel[];
  connectors: ConnectorModel[];
  timestamp?: number;
}

// Collaboration message types
export enum MessageType {
  DIAGRAM_UPDATE = 'DIAGRAM_UPDATE',
  REQUEST_STATE = 'REQUEST_STATE',
  STATE_SYNC = 'STATE_SYNC',
  NODE_ADDED = 'NODE_ADDED',
  NODE_UPDATED = 'NODE_UPDATED',
  NODE_DELETED = 'NODE_DELETED',
  CONNECTOR_ADDED = 'CONNECTOR_ADDED',
  CONNECTOR_UPDATED = 'CONNECTOR_UPDATED',
  CONNECTOR_DELETED = 'CONNECTOR_DELETED',
}

// Base collaboration message
export interface CollaborationMessage {
  type: MessageType;
  payload: unknown;
  clientId?: string;
  timestamp: number;
}

// Diagram rect / bounds
export interface DiagramRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SelectorBounds {
  bounds?: DiagramRect | null;
  rotationAngle: number;
}

export interface SelectionEvent {
  connectionId?: string | null;
  userId?: string | null;
  userName?: string | null;
  elementIds?: string[] | null;
  selectorBounds?: SelectorBounds | null;
}

export interface DiagramData {
  diagramId: string | null;
  data: string | null;
  version: number;
}

// Property panel data for selected node
export interface NodeProperties {
  id: string;
  offsetX?: number;
  offsetY?: number;
  width?: number;
  height?: number;
  rotateAngle?: number;
  aspectRatio?: boolean;
  fillColor?: string;
  gradientColor?: string;
  gradientDirection?: string;
  isGradient?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  borderDashArray?: string;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  textAlign?: TextAlign;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textOpacity?: number;
  /**
   * Named position of the annotation inside the node, mapped to annotation.offset.
   * Values: TopLeft | TopCenter | TopRight | MiddleLeft | Center | MiddleRight | BottomLeft | BottomCenter | BottomRight
   */
  textPosition?: string;
  /** Annotation horizontal alignment within the node bounds (0–100) */
  horizontalAlignment?: 'Left' | 'Center' | 'Right' | 'Stretch' | 'Auto';
  /** Annotation vertical alignment within the node bounds (0–100) */
  verticalAlignment?: 'Top' | 'Center' | 'Bottom' | 'Stretch' | 'Auto';
  annotationIndex?: number;
  constraints?: unknown;
  hyperlinkContent?: string;
  hyperlinkUrl?: string;
  hyperlinkOpenState?: LinkTarget;
}

// Selection models for property panel
export interface SelectedNodeItem {
  type: 'node';
  node: NodeModel;
}

export interface SelectedConnectorItem {
  type: 'connector';
  connector: ConnectorModel;
}

export interface SelectedAnnotationItem {
  type: 'annotation';
  nodeId: string;
  annotationIndex: number;
  annotation: unknown;
}

export interface SelectedMultipleItem {
  type: 'multiple';
  nodes: NodeModel[];
  connectors: ConnectorModel[];
}

export type SelectedItem =
  | SelectedNodeItem
  | SelectedConnectorItem
  | SelectedAnnotationItem
  | SelectedMultipleItem
  | null;

// Toolbar action types
export type ToolbarAction =
  | 'new'
  | 'open'
  | 'save'
  | 'print'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'exportJPG'
  | 'exportPNG'
  | 'exportSVG'
  | 'fitToPage'
  | 'zoomIn'
  | 'zoomOut'
  | 'select'
  | 'pointer'
  | 'text'
  | 'connector'
  | 'pan'
  | 'undo'
  | 'redo';

// Property panel data for selected connector
export interface ConnectorProperties {
  id: string;
  sourceID: string;
  targetID: string;
  type: string;
  connectorType?: Segments;
  strokeColor?: string;
  strokeWidth?: number;
  strokeDashArray?: string;
  startArrowSize?: number;
  endArrowSize?: number;
  sourceDecorator?: 'None' | 'Arrow' | 'Circle' | 'Diamond' | 'OpenArrow' | 'Square' | 'DoubleArrow';
  targetDecorator?: 'None' | 'Arrow' | 'Circle' | 'Diamond' | 'OpenArrow' | 'Square' | 'DoubleArrow';
  bridging?: boolean;
  opacity?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  textAlign?: TextAlign ;
  textPosition?: AnnotationAlignment ;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textOpacity?: number;
  constraints?: unknown;
}

// Toolbar state snapshot
export interface ToolbarState {
  isUndoEnabled: boolean;
  isRedoEnabled: boolean;
  isCutEnabled: boolean;
  isCopyEnabled: boolean;
  isPasteEnabled: boolean;
  isGroupEnabled: boolean;
  isUngroupEnabled: boolean;
}
