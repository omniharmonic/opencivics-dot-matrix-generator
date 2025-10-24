import { type Settings, type Keyframe, type LoopMode, type EasingFunction, Strategy } from '../types';
import { KeyframeManager } from './keyframeManager';

export class AnimationEngine {
  private keyframes: Keyframe[] = [];
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private loopMode: LoopMode = 'none';
  private animationId: number | null = null;
  private startTime: number = 0;
  private onUpdate?: (settings: Settings) => void;
  private totalDuration: number = 0;
  private direction: number = 1; // 1 for forward, -1 for backward (pingpong)

  // Easing functions for smooth animation
  static easing = {
    linear: (t: number): number => t,
    easeInOut: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeIn: (t: number): number => t * t,
    easeOut: (t: number): number => t * (2 - t),
    easeInOutCubic: (t: number): number =>
      t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  };

  constructor(onUpdate?: (settings: Settings) => void) {
    this.onUpdate = onUpdate;
  }

  setKeyframes(keyframes: Keyframe[]): void {
    this.keyframes = KeyframeManager.sortKeyframes(keyframes);
    this.totalDuration = this.calculateTotalDuration();
    this.currentTime = 0;
  }

  setLoopMode(mode: LoopMode): void {
    this.loopMode = mode;
  }

  setOnUpdate(callback: (settings: Settings) => void): void {
    this.onUpdate = callback;
  }

  private calculateTotalDuration(): number {
    return this.keyframes.reduce((total, kf) => total + kf.duration, 0);
  }

  play(): void {
    if (this.keyframes.length === 0) return;

    this.isPlaying = true;

    // If at the end and loop mode is 'none', restart from beginning
    if (this.currentTime >= this.totalDuration && this.loopMode === 'none') {
      this.currentTime = 0;
      this.direction = 1;
    }

    // Calculate start time based on current position and direction
    if (this.direction === 1) {
      this.startTime = performance.now() - this.currentTime;
    } else {
      // For reverse direction (pingpong), calculate from the end
      this.startTime = performance.now() - (this.totalDuration - this.currentTime);
    }

    this.animate();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  stop(): void {
    this.pause();
    this.currentTime = 0;
    this.direction = 1;
    this.updateCurrentSettings();
  }

  seekTo(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.totalDuration));
    this.updateCurrentSettings();
  }

  seekToNormalized(normalizedTime: number): void {
    this.seekTo(normalizedTime * this.totalDuration);
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getNormalizedTime(): number {
    return this.totalDuration > 0 ? this.currentTime / this.totalDuration : 0;
  }

  isAnimationPlaying(): boolean {
    return this.isPlaying;
  }

  private animate = (): void => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const elapsed = now - this.startTime;
    this.currentTime = elapsed * this.direction;

    // Handle loop modes and boundary conditions
    let shouldContinue = true;

    if (this.direction === 1 && this.currentTime >= this.totalDuration) {
      // Forward direction reached end
      switch (this.loopMode) {
        case 'none':
          this.currentTime = this.totalDuration;
          shouldContinue = false;
          break;
        case 'loop':
          // Reset to beginning and restart
          this.currentTime = 0;
          this.startTime = now;
          break;
        case 'pingpong':
          // Switch to reverse direction
          this.currentTime = this.totalDuration;
          this.direction = -1;
          this.startTime = now;
          break;
      }
    } else if (this.direction === -1 && this.currentTime <= 0) {
      // Reverse direction reached beginning (only possible in pingpong)
      if (this.loopMode === 'pingpong') {
        // Switch back to forward direction
        this.currentTime = 0;
        this.direction = 1;
        this.startTime = now;
      } else {
        // Shouldn't happen, but safety fallback
        this.currentTime = 0;
        shouldContinue = false;
      }
    }

    // Clamp time to valid range
    this.currentTime = Math.max(0, Math.min(this.totalDuration, this.currentTime));

    this.updateCurrentSettings();

    if (this.isPlaying && shouldContinue) {
      this.animationId = requestAnimationFrame(this.animate);
    } else if (!shouldContinue) {
      this.pause();
    }
  };

  private updateCurrentSettings(): void {
    if (this.keyframes.length === 0) return;

    const settings = this.interpolateSettings(this.currentTime);
    this.onUpdate?.(settings);
  }

  private interpolateSettings(time: number): Settings {
    if (this.keyframes.length === 0) {
      throw new Error('No keyframes available for interpolation');
    }

    if (this.keyframes.length === 1) {
      return { ...this.keyframes[0].settings };
    }

    // Find the two keyframes to interpolate between
    const [fromKeyframe, toKeyframe] = this.findInterpolationKeyframes(time);

    if (!fromKeyframe || !toKeyframe) {
      return { ...this.keyframes[0].settings };
    }

    if (fromKeyframe === toKeyframe) {
      return { ...fromKeyframe.settings };
    }

    // Calculate interpolation factor
    const keyframeStartTime = this.getKeyframeStartTime(fromKeyframe);
    const localTime = time - keyframeStartTime;
    const progress = Math.max(0, Math.min(1, localTime / fromKeyframe.duration));
    const easedProgress = AnimationEngine.easing.easeInOutCubic(progress);

    return this.interpolateBetweenSettings(
      fromKeyframe.settings,
      toKeyframe.settings,
      easedProgress
    );
  }

  private findInterpolationKeyframes(time: number): [Keyframe | null, Keyframe | null] {
    let currentTime = 0;

    for (let i = 0; i < this.keyframes.length; i++) {
      const keyframe = this.keyframes[i];
      const nextKeyframe = this.keyframes[i + 1];

      if (time >= currentTime && time <= currentTime + keyframe.duration) {
        return [keyframe, nextKeyframe || keyframe];
      }

      currentTime += keyframe.duration;
    }

    // Return last keyframe if time is beyond all keyframes
    const lastKeyframe = this.keyframes[this.keyframes.length - 1];
    return [lastKeyframe, lastKeyframe];
  }

  private getKeyframeStartTime(keyframe: Keyframe): number {
    let time = 0;
    for (const kf of this.keyframes) {
      if (kf.id === keyframe.id) break;
      time += kf.duration;
    }
    return time;
  }

  private interpolateBetweenSettings(
    from: Settings,
    to: Settings,
    progress: number
  ): Settings {
    return {
      // Grid Structure
      ringCount: Math.round(this.lerp(from.ringCount, to.ringCount, progress)),
      symmetrySides: Math.round(this.lerp(from.symmetrySides, to.symmetrySides, progress)),
      chaos: this.lerp(from.chaos, to.chaos, progress),

      // Connection Rules
      strategy: progress < 0.5 ? from.strategy : to.strategy, // Discrete value
      startRing: Math.round(this.lerp(from.startRing, to.startRing, progress)),
      endRing: Math.round(this.lerp(from.endRing, to.endRing, progress)),

      // Algorithm Parameters
      tangentialStep: Math.round(this.lerp(from.tangentialStep, to.tangentialStep, progress)),
      radialTwist: this.lerp(from.radialTwist, to.radialTwist, progress),
      clusterCount: Math.round(this.lerp(from.clusterCount, to.clusterCount, progress)),
      maxConnections: Math.round(this.lerp(from.maxConnections, to.maxConnections, progress)),

      // Appearance
      lineWidth: this.lerp(from.lineWidth, to.lineWidth, progress),
      dotSize: this.lerp(from.dotSize, to.dotSize, progress),
      curvature: this.lerp(from.curvature, to.curvature, progress),

      // Seed - for smooth transitions, we'll interpolate between seeds
      seed: Math.round(this.lerp(from.seed, to.seed, progress)),
    };
  }

  private lerp(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  }

  // Generate frames for export
  async generateFrames(
    fps: number = 30,
    onFrameGenerated?: (frame: number, total: number) => void
  ): Promise<Settings[]> {
    const frames: Settings[] = [];
    const frameCount = Math.ceil((this.totalDuration / 1000) * fps);
    const timeStep = this.totalDuration / frameCount;

    for (let i = 0; i <= frameCount; i++) {
      const time = i * timeStep;
      const settings = this.interpolateSettings(time);
      frames.push(settings);

      onFrameGenerated?.(i, frameCount);
    }

    return frames;
  }

  // Get current animation progress for UI
  getProgress(): {
    currentTime: number;
    totalDuration: number;
    normalizedTime: number;
    isPlaying: boolean;
    loopMode: LoopMode;
    direction: number;
  } {
    return {
      currentTime: this.currentTime,
      totalDuration: this.totalDuration,
      normalizedTime: this.getNormalizedTime(),
      isPlaying: this.isPlaying,
      loopMode: this.loopMode,
      direction: this.direction,
    };
  }
}