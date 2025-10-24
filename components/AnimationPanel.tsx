import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timeline } from './Timeline';
import { AnimationControls } from './AnimationControls';
import { type Settings, type Keyframe, type LoopMode, type ExportOptions } from '../types';
import { KeyframeManager } from '../services/keyframeManager';
import { AnimationEngine } from '../services/animationEngine';
import { GifExporter } from '../services/gifExporter';

interface AnimationPanelProps {
  currentSettings: Settings;
  onSettingsChange: (settings: Settings) => void;
  keyframes: Keyframe[];
  onKeyframesChange: (keyframes: Keyframe[]) => void;
  loopMode: LoopMode;
  onLoopModeChange: (mode: LoopMode) => void;
}

export const AnimationPanel: React.FC<AnimationPanelProps> = ({
  currentSettings,
  onSettingsChange,
  keyframes,
  onKeyframesChange,
  loopMode,
  onLoopModeChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const animationEngineRef = useRef<AnimationEngine | null>(null);
  const gifExporterRef = useRef<GifExporter | null>(null);

  // Initialize animation engine
  useEffect(() => {
    animationEngineRef.current = new AnimationEngine((settings) => {
      onSettingsChange(settings);
    });

    // Set up animation progress update loop
    const updateProgress = () => {
      if (animationEngineRef.current) {
        const progress = animationEngineRef.current.getProgress();
        setCurrentTime(progress.currentTime);
        setIsPlaying(progress.isPlaying);
        setDirection(progress.direction);
      }
      requestAnimationFrame(updateProgress);
    };
    updateProgress();

    return () => {
      if (animationEngineRef.current) {
        animationEngineRef.current.pause();
      }
    };
  }, [onSettingsChange]);

  // Update animation engine when keyframes change
  useEffect(() => {
    if (animationEngineRef.current) {
      animationEngineRef.current.setKeyframes(keyframes);
      const newTotalDuration = KeyframeManager.getTotalDuration(keyframes);
      setTotalDuration(newTotalDuration);
    }
  }, [keyframes]);

  // Update animation engine loop mode
  useEffect(() => {
    if (animationEngineRef.current) {
      animationEngineRef.current.setLoopMode(loopMode);
    }
  }, [loopMode]);

  const handleAddKeyframe = useCallback((timestamp?: number) => {
    const normalizedTimestamp = timestamp ? timestamp / totalDuration : 0;
    const newKeyframe = KeyframeManager.createKeyframe(
      currentSettings,
      `Keyframe ${keyframes.length + 1}`,
      normalizedTimestamp,
      2000 // Default 2 second duration
    );
    onKeyframesChange(KeyframeManager.insertKeyframe(keyframes, newKeyframe));
  }, [currentSettings, keyframes, totalDuration, onKeyframesChange]);

  const handleKeyframeSelect = useCallback((keyframe: Keyframe) => {
    onSettingsChange(keyframe.settings);
  }, [onSettingsChange]);

  const handleKeyframeDelete = useCallback((keyframeId: string) => {
    onKeyframesChange(KeyframeManager.removeKeyframe(keyframes, keyframeId));
  }, [keyframes, onKeyframesChange]);

  const handleKeyframeUpdate = useCallback((keyframeId: string, updates: Partial<Keyframe>) => {
    onKeyframesChange(KeyframeManager.updateKeyframe(keyframes, keyframeId, updates));
  }, [keyframes, onKeyframesChange]);

  const handleSeekTo = useCallback((time: number) => {
    if (animationEngineRef.current) {
      animationEngineRef.current.seekTo(time);
    }
  }, []);

  const handlePlay = useCallback(() => {
    if (animationEngineRef.current) {
      animationEngineRef.current.play();
    }
  }, []);

  const handlePause = useCallback(() => {
    if (animationEngineRef.current) {
      animationEngineRef.current.pause();
    }
  }, []);

  const handleStop = useCallback(() => {
    if (animationEngineRef.current) {
      animationEngineRef.current.stop();
    }
  }, []);

  const handleExportGif = useCallback(async (options: ExportOptions) => {
    if (!animationEngineRef.current || keyframes.length === 0) {
      throw new Error('No animation to export');
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Generate frames
      const frames = await animationEngineRef.current.generateFrames(
        options.fps,
        (frame, total) => {
          setExportProgress(frame / total * 0.5); // First 50% for frame generation
        }
      );

      // Export GIF
      gifExporterRef.current = new GifExporter();
      const blob = await gifExporterRef.current.exportAnimation(
        frames,
        options,
        (progress) => {
          setExportProgress(0.5 + progress * 0.5); // Remaining 50% for GIF creation
        }
      );

      // Download the GIF
      gifExporterRef.current.downloadGif(blob);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      gifExporterRef.current = null;
    }
  }, [keyframes]);

  const handleSaveKeyframes = useCallback(() => {
    const jsonData = KeyframeManager.exportKeyframes(keyframes);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `animation-keyframes-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [keyframes]);

  const handleLoadKeyframes = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const importedKeyframes = KeyframeManager.importKeyframes(jsonData);
        onKeyframesChange(importedKeyframes);
      } catch (error) {
        alert('Failed to load keyframes: ' + (error as Error).message);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  }, [onKeyframesChange]);

  const handleClearKeyframes = useCallback(() => {
    if (confirm('Are you sure you want to clear all keyframes?')) {
      onKeyframesChange([]);
      handleStop();
    }
  }, [onKeyframesChange, handleStop]);

  return (
    <div className="bg-gray-900 text-white space-y-4">
      <div className="bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-teal-400">Animation Studio</h2>
          <div className="text-sm text-gray-400">
            {keyframes.length} keyframe{keyframes.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Keyframe Management */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => handleAddKeyframe()}
            className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm transition-colors"
          >
            Save Current State
          </button>

          <button
            onClick={handleSaveKeyframes}
            disabled={keyframes.length === 0}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            Export Keyframes
          </button>

          <label className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors cursor-pointer">
            Import Keyframes
            <input
              type="file"
              accept=".json"
              onChange={handleLoadKeyframes}
              className="hidden"
            />
          </label>

          <button
            onClick={handleClearKeyframes}
            disabled={keyframes.length === 0}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            Clear All
          </button>
        </div>

        {keyframes.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="mb-2">No keyframes yet</p>
            <p className="text-sm">Click "Save Current State" to create your first keyframe</p>
          </div>
        )}
      </div>

      {keyframes.length > 0 && (
        <>
          <Timeline
            keyframes={keyframes}
            currentTime={currentTime}
            totalDuration={totalDuration}
            onKeyframeSelect={handleKeyframeSelect}
            onKeyframeDelete={handleKeyframeDelete}
            onKeyframeUpdate={handleKeyframeUpdate}
            onSeekTo={handleSeekTo}
            onAddKeyframe={handleAddKeyframe}
          />

          <AnimationControls
            isPlaying={isPlaying}
            loopMode={loopMode}
            currentTime={currentTime}
            totalDuration={totalDuration}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onLoopModeChange={onLoopModeChange}
            onExportGif={handleExportGif}
            isExporting={isExporting}
            exportProgress={exportProgress}
          />
        </>
      )}
    </div>
  );
};