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
  gridStartRing: number;
  gridEndRing: number;
  symmetrySides: number;
  chaos: number;

  // Connection Rules
  strategy: Strategy;
  connectionStartRing: number;
  connectionEndRing: number;

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

export interface Keyframe {
  id: string;
  name: string;
  timestamp: number; // position in timeline (0-1)
  settings: Settings;
  duration: number; // transition duration to this keyframe in milliseconds
}

export type LoopMode = 'none' | 'loop' | 'pingpong';

export interface AnimationState {
  keyframes: Keyframe[];
  isPlaying: boolean;
  currentTime: number; // 0-1 normalized timeline position
  totalDuration: number; // total animation duration in milliseconds
  loopMode: LoopMode;
  fps: number; // frames per second for export
}

export interface ExportOptions {
  width: number;
  height: number;
  fps: number;
  quality: number;
  withAlpha: boolean;
  loopMode: LoopMode;
}

export interface EasingFunction {
  (t: number): number;
}
