/**
 * Initial Diagram Data - CI/CD Pipeline
 * Converted from Blazor C# to EJ2 React Diagram format
 */

import { NodeModel, ConnectorModel, OrthogonalSegmentModel, NodeConstraints, PortVisibility, PointPortModel } from '@syncfusion/ej2-angular-diagrams';

// Layout positions
const centerX = 200;   // center column
const leftX = 20;      // left column
const rightX = 400;    // right column

// Vertical offset to move the diagram down to make room for the title
const offsetY = 70;

// Y coordinates (top to bottom) + offset
const startY = 20 + offsetY;
const commitY = 110 + offsetY;
const decisionY1 = 190 + offsetY;
const testReportY = 270 + offsetY;
const rateY = 290 + offsetY;
const decisionY2 = 380 + offsetY;
const deployY = 470 + offsetY;
const endY = 560 + offsetY;

// Helper orthogonal segments for connector routing
const segmentDown75: OrthogonalSegmentModel = {
  type: 'Orthogonal',
  length: 75,
  direction: 'Bottom'
};

const segmentDown100: OrthogonalSegmentModel = {
  type: 'Orthogonal',
  length: 100,
  direction: 'Bottom'
};

const segmentRight150: OrthogonalSegmentModel = {
  type: 'Orthogonal',
  length: 150,
  direction: 'Right'
};

const segmentLeft140: OrthogonalSegmentModel = {
  type: 'Orthogonal',
  length: 140,
  direction: 'Left'
};

/**
 * Helper function to create a flow node
 */
function createFlowNode(
  id: string,
  offsetX: number,
  offsetY: number,
  shape: 'Terminator' | 'Process' | 'Decision' | 'Document',
  label: string
): NodeModel {
  let port: PointPortModel[] = [];
  if (label === 'Tests pass?') {
    port = [{
      id: 'nodePort',
      offset: { x: 0, y: 0.5 },
      visibility: PortVisibility.Hidden,
    }];
  }
  return {
    id,
    offsetX,
    offsetY,
    width: 140,
    height: 60,
    shape: {
      type: 'Flow',
      shape: shape
    },
    style: {
      fill: '#357BD2',
      strokeColor: '#357BD2'
    },
    ports: port,
    annotations: [
      {
        content: label,
        style: {
          color: '#ffffffff',
          fill: 'transparent',
          fontSize: 12,
          bold: false
        }
      }
    ]
  };
}

/**
 * Helper function to create a connector
 */
function createConnector(
  id: string,
  sourceID: string,
  targetID: string,
  label?: string,
  portDirection?: string
): ConnectorModel {
  const connector: ConnectorModel = {
    id,
    sourceID,
    targetID,
    type: 'Orthogonal',
    style: {
      strokeColor: '#424242',
      strokeWidth: 2
    },
    targetDecorator: {
      shape: 'Arrow',
      style: {
        fill: '#424242',
        strokeColor: '#424242'
      }
    }
  };

  // Add label if provided
  if (label) {
    connector.annotations = [
      {
        content: label,
        style: {
          fill: '#ffffffff',
          color: '#424242',
          fontSize: 12
        }
      }
    ];
  }

  // Add segments if provided
  if (portDirection === 'SourcePort') {
    connector.sourcePortID = 'nodePort';
  }
  else if (portDirection === 'TargetPort') {
    connector.targetPortID = 'nodePort';
  }

  return connector;
}

/**
 * Initial Nodes for CI/CD Pipeline
 */
export const initialNodes: NodeModel[] = [
  // Title Node (text shape)
  {
    id: 'TitleNode',
    offsetX: centerX,
    offsetY: 30,
    width: 250,
    height: 40,
    shape: {
      type: 'Text',
      content: 'CI / CD Pipeline'
    },
    style: {
      fontSize: 20,
      bold: true,
      fill: 'transparent',
      strokeColor: 'transparent',
      color: '#000000'
    },
    constraints: NodeConstraints.ReadOnly | NodeConstraints.Delete // No selection, resize, etc.
  },

  // Flow Nodes
  createFlowNode('start', centerX, startY, 'Terminator', 'Start'),
  createFlowNode('commit', centerX, commitY, 'Process', 'Commit (VCS)'),
  createFlowNode('gate1', centerX, decisionY1, 'Decision', 'Tests pass?'),
  createFlowNode('build', rightX, decisionY1, 'Process', 'Build'),
  createFlowNode('report', leftX, testReportY, 'Document', 'Test Report'),
  createFlowNode('rate', centerX, rateY, 'Process', 'Rate-limit'),
  createFlowNode('gate2', centerX, decisionY2, 'Decision', 'Tests pass?'),
  createFlowNode('deployR', rightX, decisionY2, 'Process', 'Deploy'),
  createFlowNode('deploy', centerX, deployY, 'Process', 'Deploy'),
  createFlowNode('end', centerX, endY, 'Terminator', 'End')
];

/**
 * Initial Connectors for CI/CD Pipeline
 */
export const initialConnectors: ConnectorModel[] = [
  // Main flow
  createConnector('conn1', 'start', 'commit'),
  createConnector('conn2', 'commit', 'gate1'),

  // gate1 branches
  createConnector('conn3', 'gate1', 'build', 'No'),
  createConnector('conn4', 'gate1', 'report', 'Yes', 'SourcePort'),

  // report → gate2 (loop)
  createConnector('conn5', 'report', 'gate2', undefined, 'TargetPort'),

  // center flow: gate1 → rate-limit → gate2
  createConnector('conn6', 'gate1', 'rate'),
  createConnector('conn7', 'rate', 'gate2'),

  // gate2 branches
  createConnector('conn8', 'gate2', 'deployR', 'No'),
  createConnector('conn9', 'gate2', 'deploy', 'Yes'),

  // Deploy center → End
  createConnector('conn10', 'deploy', 'end')
];
