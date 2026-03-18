import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  Output,
  EventEmitter,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DiagramModule,
  DiagramComponent,
  NodeModel,
  ConnectorModel,
  DiagramConstraints,
  DiagramTools,
  UndoRedoService,
  PrintAndExportService,
  BpmnDiagramsService,
  SymbolPaletteModule,
  DiagramCollaborationService,
  ConnectorBridgingService
} from '@syncfusion/ej2-angular-diagrams';
import type {
  ISelectionChangeEventArgs,
  ITextEditEventArgs,
  IHistoryChangeArgs,
  GridlinesModel,
  Node,
} from '@syncfusion/ej2-diagrams';
import { Subscription } from 'rxjs';
import { initialNodes, initialConnectors } from '../../data/initial-diagram-data';
import { DiagramFacadeService } from '../../services/diagram-facade.service';
import { CollaborationService } from '../../services/collaboration.service';
import { SelectionStateService } from '../../services/selection-state.service';
import type { SelectedItem, SelectionEvent, SelectorBounds } from '../../types/diagram-types';

const GRID_INTERVAL = [1, 9, 0.25, 9.75, 0.25, 9.75,
  0.25, 9.75, 0.25, 9.75, 0.25, 9.75, 0.25, 9.75,
  0.25, 9.75, 0.25, 9.75, 0.25, 9.75];
const GRIDLINES: GridlinesModel = { lineColor: 'lightgray', lineIntervals: GRID_INTERVAL, snapIntervals: [20] };

@Component({
  selector: 'app-diagram-editor',
  standalone: true,
  imports: [CommonModule, DiagramModule, SymbolPaletteModule],
  providers: [UndoRedoService, PrintAndExportService, BpmnDiagramsService, ConnectorBridgingService, DiagramCollaborationService],
  templateUrl: './diagram-editor.component.html',
  styleUrl: './diagram-editor.component.css',
})
export class DiagramEditorComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('diagram') diagramComponent!: DiagramComponent;
  @Output() selectionChange = new EventEmitter<SelectedItem>();
  @Output() textEdit = new EventEmitter<ITextEditEventArgs>();
  @Output() positionChange = new EventEmitter<unknown>();
  @Output() sizeChange = new EventEmitter<unknown>();
  @Output() rotateChange = new EventEmitter<unknown>();

  readonly initialNodes: NodeModel[] = initialNodes;
  readonly initialConnectors: ConnectorModel[] = initialConnectors;

  readonly DiagramConstraints = DiagramConstraints;
  readonly DiagramTools = DiagramTools;
  readonly gridlines = GRIDLINES;

  diagramConstraints = DiagramConstraints.Default | DiagramConstraints.UndoRedo;

  private _subs: Subscription[] = [];
  private _editedElements: string[] = [];
  private _isGroupAction = false;

  constructor(
    private readonly facade: DiagramFacadeService,
    private readonly collab: CollaborationService,
    private readonly selectionStateService: SelectionStateService,
  ) {}

  ngOnInit(): void {
    // Intentionally do not start the collaboration connection here.
    // Subscriptions that reference the DiagramComponent must be established
    // after the view is initialized so `this.diagramComponent` is defined.
  }

  async ngAfterViewInit(): Promise<void> {
    this.facade.register(this.diagramComponent);

    // Set up collaboration subscriptions now that the DiagramComponent exists.
    let lastReceiveDataTimestamp = 0;
    this._subs.push(
      this.collab.receiveData$.subscribe(({ data, serverVersion, evt }) => {
        lastReceiveDataTimestamp = Date.now();
        try { this.diagramComponent.setDiagramUpdates(data); } catch { /* ignore */ }
      }),
      this.collab.receiveUpdates$.subscribe((data) => {
        if (Date.now() - lastReceiveDataTimestamp > 50) {
          try { this.diagramComponent.setDiagramUpdates(data as string[]); } catch (updateError: any) {
            console.error('Error applying remote updates:', updateError);
          }
        }
      }),
      this.collab.loadDiagramData$.subscribe((remoteData) => {
        if (remoteData?.data) this.diagramComponent?.loadDiagram?.(remoteData.data);
        this.diagramComponent?.fitToPage();
      }),
      this.collab.saveDiagramStateRequested$.subscribe(async (requestId) => {
        const data: string = this.diagramComponent?.saveDiagram?.() || '';
        await this.collab.provideDiagramState(requestId, data);
      }),
      this.collab.peerSelectionsChanged$.subscribe(() => this.renderPeerBadges()),
    );

    // Start collaboration after subscriptions are in place to avoid missing early events
    await this.collab.connect();

    this.diagramComponent.fitToPage();
  }

  ngOnDestroy(): void {
    this._subs.forEach((s) => s.unsubscribe());
    this.facade.unregister();
    this.collab.disconnect();
    this._removePeerBadgeLayer();
  }

  // --- Event handlers (bound in template) ---------------------------

  onSelectionChange(args: ISelectionChangeEventArgs): void {
    try {
      const values: unknown[] = Array.isArray(args.newValue)
        ? args.newValue
        : args.newValue
          ? [args.newValue]
          : [];

      if (values.length === 0) {
        this.selectionChange.emit(null);
        this.selectionStateService.clear();
        this.facade.refreshToolbarState();
        this._broadcastSelection([]);
        return;
      }

      let selected: SelectedItem = null;

      if (values.length > 1) {
        const nodes = values.filter((v: any) => v?.offsetX !== undefined) as NodeModel[];
        const connectors = values.filter((v: any) => v?.sourceID !== undefined || v?.targetID !== undefined) as ConnectorModel[];
        selected = { type: 'multiple', nodes, connectors };
        this.selectionStateService.setSelection({ type: 'multiple', selectedItem: selected, count: nodes.length + connectors.length });
      } else {
        const item = values[0] as any;
        if (item?.offsetX !== undefined) {
          selected = { type: 'node', node: item };
          this.selectionStateService.setSelection({ type: 'node', selectedItem: selected, count: 1 });
        } else if (item?.sourceID !== undefined || item?.targetID !== undefined || item?.sourcePoint !== undefined) {
          selected = { type: 'connector', connector: item };
          this.selectionStateService.setSelection({ type: 'connector', selectedItem: selected, count: 1 });
        }
      }

      this.selectionChange.emit(selected);
      this.facade.refreshToolbarState();

      // Broadcast selection to peers
      if (args.state === 'Changed') {
        const selectedIds: string[] = (values as any[]).filter((v) => v?.id).map((v: any) => v.id as string);
        this._broadcastSelection(selectedIds);
      }
    } catch {
      this.selectionChange.emit(null);
    }
  }

  onTextEdit(args: ITextEditEventArgs): void {
    this.textEdit.emit(args);
    try {
      const node = args.element;
      const annotation = args.annotation;
      if (node && annotation) {
        const index = node.annotations ? node.annotations.findIndex(a => a === annotation) : 0;
        const sel: SelectedItem = {
          type: 'annotation',
          nodeId: node.id as string,
          annotationIndex: Math.max(0, index),
          annotation,
        };
        this.selectionChange.emit(sel);
      }
    } catch { /* ignore */ }
  }

  onPositionChange(args: unknown): void {
    this.positionChange.emit(args);
    this._emitUpdatedSelection();
  }

  onSizeChange(args: unknown): void {
    this.sizeChange.emit(args);
    this._emitUpdatedSelection();
  }

  onRotateChange(args: unknown): void {
    this.rotateChange.emit(args);
    this._emitUpdatedSelection();
  }

  /** Re-emits the currently selected node/connector so that property panels
   *  refresh their X / Y / W / H / R fields after a drag or resize. */
  private _emitUpdatedSelection(): void {
    try {
      const si = this.diagramComponent?.selectedItems;
      if (!si) return;
      const nodes: NodeModel[] = si.nodes ?? [];
      const connectors: ConnectorModel[] = si.connectors ?? [];
      const total = nodes.length + connectors.length;
      if (total === 0) return;

      let selected: SelectedItem = null;
      if (total > 1) {
        selected = { type: 'multiple', nodes, connectors };
      } else if (nodes.length === 1) {
        selected = { type: 'node', node: nodes[0] };
      } else if (connectors.length === 1) {
        selected = { type: 'connector', connector: connectors[0] };
      }

      if (selected) {
        this.selectionChange.emit(selected);
      }
    } catch { /* ignore */ }
  }

  onHistoryChange(args: IHistoryChangeArgs): void {
    this.facade.refreshToolbarState();

    try {
      const diagram = this.diagramComponent;
      const changes: string[] = diagram.getDiagramUpdates(args) || [];

      const isUndo = args.action === 'Undo';
      const changeType = (args.change as any)?.type;
      const isStartGroup = changeType === (isUndo ? 'EndGroup' : 'StartGroup');
      const isEndGroup = changeType === (isUndo ? 'StartGroup' : 'EndGroup');

      if (isStartGroup) { this._editedElements = []; this._isGroupAction = true; }

      if (args.source?.length) {
        for (const src of args.source) {
          if (src?.id) this._editedElements.push(src.id as string);
        }
      }

      if (changes.length > 0) {
        const { ids, bounds } = this._getSelectionBounds();
        const selEvent: SelectionEvent = { elementIds: ids, selectorBounds: bounds } as any;
        this.collab.broadcastChanges(
          changes,
          this.collab.clientVersion,
          this._editedElements,
          selEvent,
          this.collab.roomName,
        );
      }

      if (isEndGroup || !this._isGroupAction) { this._editedElements = []; this._isGroupAction = false; }
    } catch { /* ignore */ }
  }

  getNodeDefaults(node: NodeModel): NodeModel {
    if (node.id === 'TitleNode') {
      node.style = { fill: 'transparent', strokeColor: 'transparent', strokeWidth: 0 };
    }
    else if (node.shape?.type === 'Flow') {
      node.style = { fill: '#357BD2', strokeColor: '#357BD2', strokeWidth: 1 };
    }
    else if (!(node.addInfo && (node.addInfo as any).type === 'CustomShapes') && (!node.children)) {
      node.style = { fill:'#FFFFFF', strokeColor: '#000000ff' };
    }
    return node;
  }

  getConnectorDefaults(connector: ConnectorModel): ConnectorModel {
    connector.style = { strokeColor: '#424242', strokeWidth: 2 };
    connector.targetDecorator = { shape: 'Arrow', style: { fill: '#000000ff', strokeColor: '#0f0f0fff' } };
    return connector;
  }

  // --- Peer Overlay -------------------------------------------------

  private _peerBadgeLayer: SVGGElement | null = null;

  renderPeerBadges(): void {
    const svgNS = 'http://www.w3.org/2000/svg';
    const diagramLayerElement = document.getElementById('diagram_diagramLayer') as unknown as SVGSVGElement | null;
    if (!diagramLayerElement) return;

    this._removePeerBadgeLayer();

    const badgeGroupElement = document.createElementNS(svgNS, 'g');
    badgeGroupElement.setAttribute('id', 'badge-layer');
    const renderedElementIds = new Set<string>();

    this.collab.peerSelections.forEach((peer) => {
      const selectorBounds = peer.selectorBounds;
      if (!selectorBounds?.bounds) return;
      const boundsRect = selectorBounds.bounds!;
      const centerX = boundsRect.x;
      const centerY = boundsRect.y;
      const boundsWidth = (boundsRect.width || 0) + 2;
      const boundsHeight = (boundsRect.height || 0) + 2;
      const rotationAngle = selectorBounds.rotationAngle || 0;
      const startX = centerX - (boundsRect.width || 0) / 2;
      const startY = centerY - (boundsRect.height || 0) / 2;

      const rect = document.createElementNS(svgNS, 'rect');
      rect.setAttribute('x', startX.toString());
      rect.setAttribute('y', startY.toString());
      rect.setAttribute('width', boundsWidth.toString());
      rect.setAttribute('height', boundsHeight.toString());
      rect.setAttribute('stroke', '#3b82f6');
      rect.setAttribute('stroke-width', '2');
      rect.setAttribute('fill', 'none');
      rect.setAttribute('transform', `rotate(${rotationAngle},${centerX},${centerY})`);
      badgeGroupElement.appendChild(rect);

      let overlapCount = 0;
      peer.nodeIds?.forEach((id) => { if (renderedElementIds.has(id)) overlapCount++; });
      const rotationRadians = rotationAngle * Math.PI / 180;
      const originalBadgeX = centerX + boundsWidth / 2;
      const originalBadgeY = centerY - boundsHeight / 2;
      let finalBadgeX = centerX + (originalBadgeX - centerX) * Math.cos(rotationRadians) - (originalBadgeY - centerY) * Math.sin(rotationRadians) + 5;
      let finalBadgeY = centerY + (originalBadgeX - centerX) * Math.sin(rotationRadians) + (originalBadgeY - centerY) * Math.cos(rotationRadians) + 20 * (overlapCount > 0 ? overlapCount : 0) - 15;

      const peerUserName = (peer.userName || '').toString();
      const peerUserId = parseInt(peerUserName, 10);
      if (!isNaN(peerUserId)) {
        const badgeTitle = `G-${('0000' + peerUserId).slice(-4)}`;
        const badgeLabel = `Guest ID: SF${('0000' + peerUserId).slice(-4)}`;

        const foreignObjectElement = document.createElementNS(svgNS, 'foreignObject');
        foreignObjectElement.setAttribute('x', finalBadgeX.toString());
        foreignObjectElement.setAttribute('y', finalBadgeY.toString());
        foreignObjectElement.setAttribute('width', '50');
        foreignObjectElement.setAttribute('height', '30');

        const badgeContainer = document.createElement('div');
        badgeContainer.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        badgeContainer.setAttribute('title', badgeLabel);
        badgeContainer.setAttribute('style', 'background:#3b82f6;color:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;width:50px;height:30px;font-size:12px;');
        badgeContainer.textContent = badgeTitle;
        foreignObjectElement.appendChild(badgeContainer);
        badgeGroupElement.appendChild(foreignObjectElement);
      }

      peer.nodeIds?.forEach((id) => renderedElementIds.add(id));
    });

    diagramLayerElement.appendChild(badgeGroupElement);
    this._peerBadgeLayer = badgeGroupElement;
  }

  private _removePeerBadgeLayer(): void {
    this._peerBadgeLayer?.remove();
    this._peerBadgeLayer = null;
  }

  // --- Private helpers ----------------------------------------------

  private _broadcastSelection(selectedIds: string[]): void {
    const settings = (this.diagramComponent as any)?.selectedItems;
    if (!settings) return;
    const bounds: SelectorBounds = {
      bounds: { x: settings.offsetX, y: settings.offsetY, width: settings.width, height: settings.height },
      rotationAngle: settings.rotateAngle,
    };
    this.collab.selectElements(selectedIds, bounds);
  }

  private _getSelectionBounds(currentConnectionId?: string): { ids: string[]; bounds: SelectorBounds } {
    const diag = this.diagramComponent as any;
    const selectedItems = diag?.selectedItems;
    const currentlySelectedElementIds = new Set<string>();
    let currentSelectionBounds: SelectorBounds = { bounds: null, rotationAngle: 0 };
    let shouldRefreshBadges = false;

    if (!selectedItems) return { ids: [], bounds: currentSelectionBounds };
    (selectedItems.nodes || []).forEach((n: any) => {
      const id = (n?.id || '').trim();
      if (id) currentlySelectedElementIds.add(id);
    });

    (selectedItems.connectors || []).forEach((c: any) => {
      const id = (c?.id || '').trim();
      if (id) currentlySelectedElementIds.add(id);
    });

    currentSelectionBounds = {
      bounds: { x: selectedItems.offsetX, y: selectedItems.offsetY, width: selectedItems.width, height: selectedItems.height },
      rotationAngle: selectedItems.rotateAngle,
    };
    const peerConnectionIdsToRemove: string[] = [];

    // Update peer selections based on current selection
    this.collab.peerSelections.forEach((peerSelection, peerConnectionId) => {
      if (peerConnectionId === currentConnectionId) { return; }
      const peerSelectedNodeIds = peerSelection.nodeIds;

      // If nothing is currently selected, check for peer selections that need cleanup
      if (currentlySelectedElementIds.size === 0) {
        const editedElementsSet = new Set<string>(this._editedElements);
        const commonElementIds = Array.from(peerSelectedNodeIds).filter((id: string) => editedElementsSet.has(id));
        if (commonElementIds.length > 0) {
          for (const elementId of commonElementIds) {
            const diagramObject = this.diagramComponent.getObject(elementId);
            if (!diagramObject) {
              peerSelectedNodeIds.delete(elementId);
              shouldRefreshBadges = true;
            }
          }
          if (peerSelectedNodeIds.size === 0) {
            peerConnectionIdsToRemove.push(peerConnectionId);
            shouldRefreshBadges = true;
          }
        }
      } else if (this.collab.setsEqual(peerSelectedNodeIds, currentlySelectedElementIds)) {
        // Update peer's selector bounds if selecting same elements
        this.collab.peerSelections.set(peerConnectionId, { userName: peerSelection.userName, nodeIds: peerSelectedNodeIds, selectorBounds: currentSelectionBounds });
        shouldRefreshBadges = true;
      } else if (peerSelectedNodeIds && peerSelectedNodeIds.size > 0) {
        // currently selected node(s), compute connector bounds and update the peer selection.
        const firstElementId = Array.from(peerSelectedNodeIds)[0];
        let isConnector = false;

        if (selectedItems && selectedItems.nodes && selectedItems.nodes.length > 0 && firstElementId) {
          const currentNode = selectedItems.nodes[0] as any;
          try {
            isConnector = (currentNode && currentNode.inEdges && currentNode.inEdges.indexOf(firstElementId) !== -1) ||
              (currentNode && currentNode.outEdges && currentNode.outEdges.indexOf(firstElementId) !== -1);
          } catch (e) {
            isConnector = false;
          }

          if (isConnector) {
            const connectorObj = this.diagramComponent.getObject(firstElementId) as any;
            if (connectorObj) {
              const sourcePoint = connectorObj.sourcePoint || (connectorObj.points && connectorObj.points[0]);
              const targetPoint = connectorObj.targetPoint || (connectorObj.points && connectorObj.points[connectorObj.points.length - 1]);
              if (sourcePoint && targetPoint) {
                const sourceX = sourcePoint.x || 0;
                const sourceY = sourcePoint.y || 0;
                const targetX = targetPoint.x || 0;
                const targetY = targetPoint.y || 0;
                const minX = Math.min(sourceX, targetX);
                const minY = Math.min(sourceY, targetY);
                const width = Math.abs(targetX - sourceX);
                const height = Math.abs(targetY - sourceY);
                const selectorBounds = {
                  bounds: {
                    x: minX + width / 2,
                    y: minY + height / 2,
                    width,
                    height
                  },
                  rotationAngle: selectedItems.rotateAngle
                } as SelectorBounds;

                this.collab.peerSelections.set(peerConnectionId, { userName: peerSelection.userName, nodeIds: peerSelectedNodeIds, selectorBounds });
                shouldRefreshBadges = true;
              }
            }
          }
        }
      }
    });

    // Remove peer selections that no longer exist
    for (const connectionIdToRemove of peerConnectionIdsToRemove) {
      this.collab.peerSelections.delete(connectionIdToRemove);
    }

    if (shouldRefreshBadges) {
      this.collab.peerSelectionsChanged$.next();
    }

    return { ids: this.collab.setToArray(currentlySelectedElementIds), bounds: currentSelectionBounds };
  }

}
