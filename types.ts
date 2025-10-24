export interface Point {
  id: number;
  x: number;
  y: number;
  ring: number;
  angle: number;
}

export type Line = [number, number];

export enum Strategy {
  Web = 'Web',
  Spokes = 'Spokes',
  Swirl = 'Swirl',
  Random = 'Random',
  Clusters = 'Clusters',
}

export interface Settings {
  // Grid Structure
  ringCount: number;
  symmetrySides: number;
  chaos: number;

  // Connection Rules
  strategy: Strategy;
  startRing: number;
  endRing: number;
  
  // Algorithm Parameters
  tangentialStep: number;
  radialTwist: number;
  clusterCount: number;
  maxConnections: number;
  
  // Appearance
  lineWidth: number;
  dotSize: number;
  curvature: number;

  // Seed for randomness
  seed: number;
}
