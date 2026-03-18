/**
 * Application environment configuration
 */
export const environment = {
  production: false,
  signalRUrl: 'https://diagram-collaborative-editing-hxhkc9dsbeb2f2et.eastus2-01.azurewebsites.net/diagramhub',
  signalRTransport: 'WebSockets' as const,
  roomName: 'ej2_angular_diagram',
};
