import { type Keyframe, type Settings } from '../types';

export class KeyframeManager {
  private static generateId(): string {
    return `keyframe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static createKeyframe(
    settings: Settings,
    name: string = 'Keyframe',
    timestamp: number = 0,
    duration: number = 2000
  ): Keyframe {
    return {
      id: this.generateId(),
      name,
      timestamp,
      settings: { ...settings }, // Deep clone settings
      duration,
    };
  }

  static duplicateKeyframe(keyframe: Keyframe, newTimestamp?: number): Keyframe {
    return {
      ...keyframe,
      id: this.generateId(),
      name: `${keyframe.name} (Copy)`,
      timestamp: newTimestamp ?? keyframe.timestamp,
      settings: { ...keyframe.settings },
    };
  }

  static sortKeyframes(keyframes: Keyframe[]): Keyframe[] {
    return [...keyframes].sort((a, b) => a.timestamp - b.timestamp);
  }

  static normalizeTimestamps(keyframes: Keyframe[]): Keyframe[] {
    if (keyframes.length === 0) return [];
    if (keyframes.length === 1) {
      return [{ ...keyframes[0], timestamp: 0 }];
    }

    const sorted = this.sortKeyframes(keyframes);
    return sorted.map((kf, index) => ({
      ...kf,
      timestamp: index / (sorted.length - 1),
    }));
  }

  static insertKeyframe(keyframes: Keyframe[], newKeyframe: Keyframe): Keyframe[] {
    const result = [...keyframes, newKeyframe];
    return this.sortKeyframes(result);
  }

  static removeKeyframe(keyframes: Keyframe[], keyframeId: string): Keyframe[] {
    return keyframes.filter(kf => kf.id !== keyframeId);
  }

  static updateKeyframe(
    keyframes: Keyframe[],
    keyframeId: string,
    updates: Partial<Keyframe>
  ): Keyframe[] {
    return keyframes.map(kf =>
      kf.id === keyframeId ? { ...kf, ...updates } : kf
    );
  }

  static findKeyframeAt(keyframes: Keyframe[], timestamp: number): Keyframe | null {
    const sorted = this.sortKeyframes(keyframes);
    return sorted.find(kf => Math.abs(kf.timestamp - timestamp) < 0.001) || null;
  }

  static getKeyframesForInterpolation(
    keyframes: Keyframe[],
    timestamp: number
  ): [Keyframe | null, Keyframe | null] {
    if (keyframes.length === 0) return [null, null];
    if (keyframes.length === 1) return [keyframes[0], keyframes[0]];

    const sorted = this.sortKeyframes(keyframes);

    // Find the two keyframes to interpolate between
    let fromKeyframe: Keyframe | null = null;
    let toKeyframe: Keyframe | null = null;

    for (let i = 0; i < sorted.length - 1; i++) {
      if (timestamp >= sorted[i].timestamp && timestamp <= sorted[i + 1].timestamp) {
        fromKeyframe = sorted[i];
        toKeyframe = sorted[i + 1];
        break;
      }
    }

    // Handle edge cases
    if (!fromKeyframe && !toKeyframe) {
      if (timestamp <= sorted[0].timestamp) {
        return [sorted[0], sorted[0]];
      } else if (timestamp >= sorted[sorted.length - 1].timestamp) {
        return [sorted[sorted.length - 1], sorted[sorted.length - 1]];
      }
    }

    return [fromKeyframe, toKeyframe];
  }

  static exportKeyframes(keyframes: Keyframe[]): string {
    return JSON.stringify(keyframes, null, 2);
  }

  static importKeyframes(jsonString: string): Keyframe[] {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) {
        throw new Error('Invalid keyframes format');
      }

      // Validate keyframe structure
      return imported.filter(kf =>
        kf.id &&
        kf.name &&
        typeof kf.timestamp === 'number' &&
        kf.settings &&
        typeof kf.duration === 'number'
      );
    } catch (error) {
      throw new Error('Failed to import keyframes: ' + (error as Error).message);
    }
  }

  static getTotalDuration(keyframes: Keyframe[]): number {
    return keyframes.reduce((total, kf) => total + kf.duration, 0);
  }

  static getKeyframeAtTime(keyframes: Keyframe[], time: number): Keyframe | null {
    const sorted = this.sortKeyframes(keyframes);
    let currentTime = 0;

    for (const keyframe of sorted) {
      if (time >= currentTime && time <= currentTime + keyframe.duration) {
        return keyframe;
      }
      currentTime += keyframe.duration;
    }

    return sorted[sorted.length - 1] || null;
  }
}