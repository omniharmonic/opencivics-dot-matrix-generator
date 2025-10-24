import React, { useState } from 'react';
import { type LoopMode, type ExportOptions } from '../types';

interface AnimationControlsProps {
  isPlaying: boolean;
  loopMode: LoopMode;
  currentTime: number;
  totalDuration: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onLoopModeChange: (mode: LoopMode) => void;
  onExportGif: (options: ExportOptions) => Promise<void>;
  isExporting: boolean;
  exportProgress: number;
}

export const AnimationControls: React.FC<AnimationControlsProps> = ({
  isPlaying,
  loopMode,
  currentTime,
  totalDuration,
  onPlay,
  onPause,
  onStop,
  onLoopModeChange,
  onExportGif,
  isExporting,
  exportProgress,
}) => {
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    width: 800,
    height: 800,
    fps: 30,
    quality: 0.8,
    withAlpha: false,
  });

  const formatTime = (time: number): string => {
    const seconds = Math.floor(time / 1000);
    const ms = Math.floor((time % 1000) / 10);
    return `${seconds}.${ms.toString().padStart(2, '0')}s`;
  };

  const handleExportGif = async () => {
    try {
      await onExportGif(exportOptions);
      setShowExportDialog(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const getLoopModeIcon = (mode: LoopMode): string => {
    switch (mode) {
      case 'none': return '→';
      case 'loop': return '↻';
      case 'pingpong': return '⇄';
      default: return '→';
    }
  };

  const getLoopModeLabel = (mode: LoopMode): string => {
    switch (mode) {
      case 'none': return 'No Loop';
      case 'loop': return 'Loop';
      case 'pingpong': return 'Ping Pong';
      default: return 'No Loop';
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Animation Controls</h3>
        <div className="text-sm text-gray-400">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={totalDuration === 0}
          className="flex items-center justify-center w-12 h-12 bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-white rounded-full transition-colors"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        <button
          onClick={onStop}
          disabled={totalDuration === 0}
          className="flex items-center justify-center w-10 h-10 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Loop Mode */}
        <div className="ml-4 flex items-center gap-2">
          <span className="text-sm text-gray-400">Loop:</span>
          <div className="flex gap-1">
            {(['none', 'loop', 'pingpong'] as LoopMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onLoopModeChange(mode)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  loopMode === mode
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
                title={getLoopModeLabel(mode)}
              >
                {getLoopModeIcon(mode)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Export Controls */}
      <div className="border-t border-gray-700 pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-300">Export Animation</span>
          <button
            onClick={() => setShowExportDialog(true)}
            disabled={totalDuration === 0 || isExporting}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            {isExporting ? 'Exporting...' : 'Export GIF'}
          </button>
        </div>

        {isExporting && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Generating GIF...</span>
              <span>{Math.round(exportProgress * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${exportProgress * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Export Options</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Width</label>
                  <input
                    type="number"
                    value={exportOptions.width}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, width: parseInt(e.target.value) || 800 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
                    min="100"
                    max="2000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Height</label>
                  <input
                    type="number"
                    value={exportOptions.height}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, height: parseInt(e.target.value) || 800 }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 text-white"
                    min="100"
                    max="2000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  FPS: {exportOptions.fps}
                </label>
                <input
                  type="range"
                  value={exportOptions.fps}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, fps: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  min="10"
                  max="60"
                  step="5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Quality: {Math.round(exportOptions.quality * 100)}%
                </label>
                <input
                  type="range"
                  value={exportOptions.quality}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, quality: parseFloat(e.target.value) }))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  min="0.1"
                  max="1"
                  step="0.1"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="withAlpha"
                  checked={exportOptions.withAlpha}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, withAlpha: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="withAlpha" className="text-sm text-gray-400">
                  Transparent background
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowExportDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExportGif}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};