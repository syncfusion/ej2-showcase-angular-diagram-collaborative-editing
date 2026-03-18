/**
 * CollaborationService
 * Manages SignalR connection lifecycle, event routing, and peer presence.
 */

import { Injectable, OnDestroy } from '@angular/core';
import {
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
  type HubConnection,
  HubConnectionState
} from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../config/environment';
import type { SelectionEvent, SelectorBounds, DiagramData, DiagramRect } from '../types/diagram-types';
import { SpinnerService } from './spinner.service';


export type PeerSelection = {
  userName: string;
  nodeIds: Set<string>;
  selectorBounds?: SelectorBounds | null;
};

@Injectable({ providedIn: 'root' })
export class CollaborationService implements OnDestroy {
  private connection: HubConnection | null = null;
  readonly roomName = environment.roomName;

  /** Unique identity for this browser session — used as the SignalR userName. */
  readonly sessionId = `user_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  // --- Public streams --------------------------------------------------------

  /** Maintains Current HubConnectionState */
  readonly connectionState$ = new BehaviorSubject<HubConnectionState>(HubConnectionState.Disconnected);

  /** Maintains Current UserCount */
  readonly userCount$ = new BehaviorSubject<number>(1);

  /** Fires when remote diagram updates arrive (raw string[] patch) */
  readonly receiveUpdates$ = new Subject<unknown>();

  /** Fires when any peer selection changes */
  readonly peerSelectionsChanged$ = new Subject<void>();

  /** Fires when the server sends ReceiveData (combined patch + peer selection) */
  readonly receiveData$ = new Subject<{ data: string[]; serverVersion: number; evt: SelectionEvent }>();

  /** Fires when the server asks for the local diagram state */
  readonly saveDiagramStateRequested$ = new Subject<string>();

  /** Fires when the server pushes a full diagram to load */
  readonly loadDiagramData$ = new Subject<DiagramData>();

  /** Toast notifications */
  readonly toastNotification$ = new Subject<string>();

  // --- Peer selection map (mutable, consumed by overlay) -----------------
  readonly peerSelections: Map<string, PeerSelection> = new Map();

  clientVersion: number = 0;

  // --- Handler cleanup (prevents duplicate registrations) -----------------
  private readonly boundHandlers = new Map<string, (...args: any[]) => void>();

  constructor(private spinnerService: SpinnerService) { }

  // --- Lifecycle ---------------------------------------------------------

  async connect(): Promise<void> {
    if (this.connection) return; // already built

    this.connectionState$.next(HubConnectionState.Connecting);

    const buildConnection = (): HubConnection => {
      const builder = new HubConnectionBuilder()
        .withUrl(environment.signalRUrl, {
          skipNegotiation: false,
          transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect([0, 1000, 5000, 30000])
        .configureLogging(LogLevel.Information)
        .build();

      return builder;
    };

    let connection = buildConnection();
    this.connection = connection;

    this.registerHandlers(connection);

    // --- Start --------------------------------------------------------
    const startHubConnection = async () => {
      try {
        await connection.start();
        return;
      } catch (err) {
        console.error('Failed to start SignalR connection:', err);
        setTimeout(startHubConnection, 3000);
      }
    };

    await startHubConnection();
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      this.cleanupHandlers(this.connection);   // <-- explicit cleanup before stop
      await this.connection.stop();
      this.connection = null;
    }
  }

  // --- Client → Server --------------------------------------------------------

  async broadcastChanges(
    changes: string[],
    version: number,
    editedElements: string[],
    selectionBounds: SelectionEvent,
    room: string
  ): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.send(
        'BroadcastToOtherClients',
        changes,
        version,
        editedElements,
        selectionBounds,
        room,
      );
    } catch (err) {
      console.error('BroadcastToOtherClients failed:', err);
    }
  }

  async selectElements(ids: string[], bounds: SelectorBounds): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.invoke('SelectElements', ids, bounds);
    } catch (err) {
      console.error('SelectElements failed:', err);
    }
  }

  async provideDiagramState(requestId: string, data: string): Promise<void> {
    if (!this.connection) return;
    try {
      await this.connection.invoke('ProvideDiagramState', requestId, data);
    } catch (error: any) {
      console.error('Error providing diagram state:', error);
    }
  }

  // Broadcast load diagram to other clients via SignalR: clear selection then load
  async broadcastLoadDiagram(data: string): Promise<void> {
    try {
      const currentConnection = this.connection;
      if (currentConnection && currentConnection.state !== HubConnectionState.Disconnected) {
        await currentConnection.invoke('ClearSelectionForAll');
        await currentConnection.send('LoadDiagram', data);
      }
    } catch (err) {
      console.error('broadcastLoadDiagram failed:', err);
    }
  }

  // --- Handler registration & cleanup ----------------------------------

  private registerHandlers(conn: HubConnection): void {
    // Prevent any possible duplicates on this connection instance
    this.cleanupHandlers(conn);

    // Lifecycle handlers (set once per connection – they replace if called again)
    conn.onreconnecting(this.handleOnReconnecting.bind(this));
    conn.onreconnected(this.handleOnReconnected.bind(this));
    conn.onclose(this.handleOnClose.bind(this));

    // Hub method handlers – stored for .off cleanup
    this.addHandler(conn, 'OnConnectedAsync', this.handleOnConnectedAsync);
    this.addHandler(conn, 'ReceiveDataForEj2', this.handleReceiveDataForEj2);
    this.addHandler(conn, 'OnSaveDiagramState', this.handleOnSaveDiagramState);
    this.addHandler(conn, 'LoadDiagramData', this.handleLoadDiagramData);
    this.addHandler(conn, 'UserJoined', this.handleUserJoined);
    this.addHandler(conn, 'UserLeft', this.handleUserLeft);
    this.addHandler(conn, 'ShowConflict', this.handleShowConflict);
    this.addHandler(conn, 'UpdateVersion', this.handleUpdateVersion);
    this.addHandler(conn, 'ReceiveData', this.handleReceiveData);
    this.addHandler(conn, 'PeerSelectionChanged', this.handlePeerSelectionChanged);
    this.addHandler(conn, 'PeerSelectionCleared', this.handlePeerSelectionCleared);
    this.addHandler(conn, 'ClearAllSelection', this.handleClearAllSelection);
    this.addHandler(conn, 'PeerSelectionsBootstrap', this.handlePeerSelectionsBootstrap);
    this.addHandler(conn, 'CurrentUsers', this.handleCurrentUsers);
  }

  private addHandler(conn: HubConnection, method: string, handler: (...args: any[]) => void): void {
    const bound = handler.bind(this);
    conn.on(method, bound);
    this.boundHandlers.set(method, bound);
  }

  private cleanupHandlers(targetConn?: HubConnection): void {
    const connToClean = targetConn || this.connection;
    if (!connToClean) return;

    for (const [method, boundHandler] of this.boundHandlers.entries()) {
      connToClean.off(method, boundHandler);
    }
    this.boundHandlers.clear();
  }

  // --- Individual handlers (extracted for bind + cleanup) --------------------

  private handleOnReconnecting(): void {
    this.connectionState$.next(HubConnectionState.Reconnecting);
  }

  private handleOnReconnected(): void {
    this.connectionState$.next(HubConnectionState.Connected);
  }

  private handleOnClose(): void {
    this.connectionState$.next(HubConnectionState.Disconnected);
  }

  private async handleOnConnectedAsync(connId: string): Promise<void> {
    if (!connId) return;
    try {
      await this.connection!.send('JoinDiagram', this.roomName, this.sessionId, null);
      this.connectionState$.next(HubConnectionState.Connected);
    } catch (err) {
      this.spinnerService.hide();
      console.error('JoinDiagram failed:', err);
    }
  }

  private handleReceiveDataForEj2(data: unknown): void {
    this.receiveUpdates$.next(data);
  }

  private handleOnSaveDiagramState(requestId: string): void {
    this.saveDiagramStateRequested$.next(requestId);
  }

  private handleLoadDiagramData(remoteData: DiagramData): void {
    if (remoteData?.data) this.loadDiagramData$.next(remoteData);
  }

  private handleUserJoined(message: string): void {
    const id = parseInt(message, 10);
    try {
      const curr = this.userCount$.getValue();
      this.userCount$.next(Math.max(1, curr + 1));
    } catch {
      this.userCount$.next(1);
    }
    this.toastNotification$.next(`SF${('0000' + id).slice(-4)} joined the diagram.`);
  }

  private handleUserLeft(message: string): void {
    const id = parseInt(message, 10);
    try {
      const curr = this.userCount$.getValue();
      this.userCount$.next(Math.max(1, curr - 1));
    } catch {
      this.userCount$.next(1);
    }
    this.toastNotification$.next(`SF${('0000' + id).slice(-4)} left the diagram.`);
  }

  private handleShowConflict(): void {
    this.toastNotification$.next('You have a conflict. Your changes could not be merged.');
  }

  private handleUpdateVersion(serverVersion: number): void {
    this.clientVersion = serverVersion;
  }

  private handleReceiveData(data: string[], serverVersion: number, evt: SelectionEvent): void {
    this.clientVersion = serverVersion ?? this.clientVersion;
    this.receiveData$.next({ data, serverVersion, evt });
    if (evt) this._handlePeerSelectionChanged(evt);
  }

  private handlePeerSelectionChanged(evt: SelectionEvent | null): void {
    if (!evt) return;
    this._handlePeerSelectionChanged(evt);
  }

  private handlePeerSelectionCleared(evt: { connectionId?: string } | null): void {
    if (!evt) return;
    this.peerSelections.delete(evt.connectionId ?? '');
    this.peerSelectionsChanged$.next();
  }

  private handleClearAllSelection(): void {
    this.peerSelections.clear();
    this.peerSelectionsChanged$.next();
  }

  private handlePeerSelectionsBootstrap(list: SelectionEvent[] | null): void {
    if (!list?.length) return;
    for (const evt of list) {
      const connId = evt.connectionId ?? '';
      this.peerSelections.set(connId, {
        userName: evt.userName ?? '',
        nodeIds: new Set<string>(evt.elementIds ?? []),
        selectorBounds: evt.selectorBounds ?? null,
      });
    }
    this.peerSelectionsChanged$.next();
  }

  private handleCurrentUsers(list: string[] | null): void {
    this.userCount$.next(list?.length ?? 1);
    this.spinnerService.hide();
  }

  // --- Helpers --------------------------------------------------------

  private _handlePeerSelectionChanged(selectionEvent: SelectionEvent): void {
    if (!selectionEvent.userId || !selectionEvent.elementIds?.length) {
      if (selectionEvent.connectionId) this.peerSelections.delete(selectionEvent.connectionId);
    } else {
      const peerConnectionId = selectionEvent.connectionId ?? '';
      const peerSelectedNodeIds = new Set<string>((selectionEvent.elementIds || []) as string[]);
      const peerSelectorBounds = selectionEvent.selectorBounds || null;

      this.peerSelections.set(peerConnectionId, {
        userName: selectionEvent.userName || '',
        nodeIds: peerSelectedNodeIds,
        selectorBounds: peerSelectorBounds
      });

      this.peerSelections.forEach((existingPeerSelection, existingPeerConnectionId) => {
        if (existingPeerConnectionId === peerConnectionId) return;
        if (existingPeerSelection.nodeIds && this.setsEqual(existingPeerSelection.nodeIds, peerSelectedNodeIds)) {
          const existingPeerBounds = existingPeerSelection.selectorBounds || null;
          const newPeerBounds = peerSelectorBounds;
          if (!this.boundsEqual(existingPeerBounds?.bounds, newPeerBounds?.bounds) ||
            (existingPeerBounds?.rotationAngle || 0) !== (newPeerBounds?.rotationAngle || 0)) {
            this.peerSelections.set(existingPeerConnectionId, {
              userName: existingPeerSelection.userName,
              nodeIds: existingPeerSelection.nodeIds,
              selectorBounds: peerSelectorBounds
            });
          }
        }
      });
    }
    this.peerSelectionsChanged$.next();
  }

  setToArray(elementIdSet: Set<string>): string[] {
    const elementIdArray: string[] = [];
    elementIdSet.forEach(elementId => elementIdArray.push(elementId));
    return elementIdArray;
  }

  setsEqual(setA: Set<string>, setB: Set<string>): boolean {
    if (setA.size !== setB.size) return false;
    let isEqual = true;
    setA.forEach(elementId => {
      if (!setB.has(elementId)) isEqual = false;
    });
    return isEqual;
  }

  boundsEqual(boundsA?: DiagramRect | null, boundsB?: DiagramRect | null): boolean {
    if (!boundsA && !boundsB) return true;
    if (!boundsA || !boundsB) return false;
    return boundsA.x === boundsB.x &&
      boundsA.y === boundsB.y &&
      boundsA.width === boundsB.width &&
      boundsA.height === boundsB.height;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}