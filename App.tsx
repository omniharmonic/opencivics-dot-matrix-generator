import React, { useState, useEffect, useMemo } from 'react';
import { ArtCanvas, type ArtCanvasHandles } from './components/ArtCanvas';
import { ControlsPanel } from './components/ControlsPanel';
import { AnimationPanel } from './components/AnimationPanel';
import { generateGridPoints, generateArt } from './services/artGenerator';
import { type Point, type Line, type Settings, type Keyframe, type LoopMode, Strategy } from './types';

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    gridStartRing: 0,
    gridEndRing: 4,
    symmetrySides: 6,
    chaos: 0,
    strategy: Strategy.Web,
    connectionStartRing: 0,
    connectionEndRing: 3,
    tangentialStep: 1,
    radialTwist: 0,
    clusterCount: 5,
    maxConnections: 2,
    lineWidth: 2,
    dotSize: 4,
    curvature: 0,
    seed: Math.floor(Math.random() * 1000),
  });

  const [gridPoints, setGridPoints] = useState<Point[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [activeTab, setActiveTab] = useState<'controls' | 'animation'>('controls');

  // Mobile UI state
  const [showControls, setShowControls] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  // Animation state - lifted up to persist across tab switches
  const [keyframes, setKeyframes] = useState<Keyframe[]>([]);
  const [loopMode, setLoopMode] = useState<LoopMode>('none');

  const canvasRef = React.useRef<ArtCanvasHandles>(null);
  const canvasSize = 1000;

  // Regenerate grid points only when grid structure settings change
  useEffect(() => {
    const points = generateGridPoints(
      canvasSize / 2,
      canvasSize / 2,
      settings.gridStartRing,
      settings.gridEndRing,
      settings.symmetrySides,
      settings.chaos,
      settings.seed
    );
    setGridPoints(points);

    // Clamp connection rings to valid grid range
    const maxRing = settings.gridEndRing;
    const minRing = settings.gridStartRing;
    if(settings.connectionStartRing < minRing || settings.connectionStartRing > maxRing ||
       settings.connectionEndRing < minRing || settings.connectionEndRing > maxRing) {
        setSettings(s => ({...s, connectionStartRing: minRing, connectionEndRing: maxRing}));
    }

  }, [settings.gridStartRing, settings.gridEndRing, settings.symmetrySides, settings.chaos, settings.seed]);

  // Regenerate art (lines) when any setting changes
  useEffect(() => {
    if (gridPoints.length > 0) {
      const artLines = generateArt(gridPoints, settings);
      setLines(artLines);
    }
  }, [gridPoints, settings]);

  const handleSettingsChange = (newSettings: Partial<Settings>) => {
    setSettings(prev => {
        const updated = { ...prev, ...newSettings };

        // Ensure grid end ring is not smaller than grid start ring
        if (newSettings.gridStartRing !== undefined && newSettings.gridStartRing > updated.gridEndRing) {
            updated.gridEndRing = newSettings.gridStartRing;
        }
        if (newSettings.gridEndRing !== undefined && newSettings.gridEndRing < updated.gridStartRing) {
            updated.gridStartRing = newSettings.gridEndRing;
        }

        // Ensure connection end ring is not smaller than connection start ring
        if (newSettings.connectionStartRing !== undefined && newSettings.connectionStartRing > updated.connectionEndRing) {
            updated.connectionEndRing = newSettings.connectionStartRing;
        }
        if (newSettings.connectionEndRing !== undefined && newSettings.connectionEndRing < updated.connectionStartRing) {
            updated.connectionStartRing = newSettings.connectionEndRing;
        }

        return updated;
    });
  };

  const handleRandomizeSeed = () => {
    setSettings(prev => ({ ...prev, seed: Math.floor(Math.random() * 1000) }));
  };
  
  const handleExportSvg = () => canvasRef.current?.exportSvg();
  const handleExportPng = () => canvasRef.current?.exportPng();

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans relative overflow-hidden">
      {/* Mobile Menu Buttons - Only visible on mobile */}
      <div className="fixed top-4 left-4 z-30 flex gap-2 md:hidden">
        <button
          onClick={() => {
            setShowControls(!showControls);
            setShowAnimation(false);
          }}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2"
          aria-label="Toggle controls"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="text-sm">Controls</span>
        </button>
        <button
          onClick={() => {
            setShowAnimation(!showAnimation);
            setShowControls(false);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2"
          aria-label="Toggle animation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">Animation</span>
        </button>
      </div>

      {/* Canvas Container */}
      <div className="flex justify-center items-center min-h-screen p-4 md:pr-[420px] md:pb-[320px]">
        <ArtCanvas
          ref={canvasRef}
          points={gridPoints}
          lines={lines}
          settings={settings}
          width={canvasSize}
          height={canvasSize}
        />
      </div>

      {/* Desktop: Floating Controls Panel (visible on md+) */}
      <div className="hidden md:block fixed top-4 right-4 bottom-4 w-[400px] z-10">
        <ControlsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onRandomizeSeed={handleRandomizeSeed}
          onExportSvg={handleExportSvg}
          onExportPng={handleExportPng}
        />
      </div>

      {/* Mobile: Slide-in Controls Panel (visible on mobile when toggled) */}
      <div className={`md:hidden fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
           onClick={() => setShowControls(false)}>
        <div className={`fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-gray-800 transform transition-transform ${showControls ? 'translate-x-0' : 'translate-x-full'}`}
             onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold">Controls</h2>
            <button onClick={() => setShowControls(false)} className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="h-[calc(100%-4rem)] overflow-y-auto">
            <ControlsPanel
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onRandomizeSeed={handleRandomizeSeed}
              onExportSvg={handleExportSvg}
              onExportPng={handleExportPng}
            />
          </div>
        </div>
      </div>

      {/* Desktop: Bottom Animation Panel (visible on md+) */}
      <div className="hidden md:block fixed bottom-0 left-0 right-[420px] z-10 p-4 max-h-[300px] overflow-y-auto">
        <AnimationPanel
          currentSettings={settings}
          onSettingsChange={setSettings}
          keyframes={keyframes}
          onKeyframesChange={setKeyframes}
          loopMode={loopMode}
          onLoopModeChange={setLoopMode}
        />
      </div>

      {/* Mobile: Slide-up Animation Panel (visible on mobile when toggled) */}
      <div className={`md:hidden fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity ${showAnimation ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
           onClick={() => setShowAnimation(false)}>
        <div className={`fixed bottom-0 left-0 right-0 max-h-[80vh] bg-gray-900 transform transition-transform ${showAnimation ? 'translate-y-0' : 'translate-y-full'}`}
             onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold">Animation</h2>
            <button onClick={() => setShowAnimation(false)} className="text-gray-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="h-[calc(80vh-4rem)] overflow-y-auto p-4">
            <AnimationPanel
              currentSettings={settings}
              onSettingsChange={setSettings}
              keyframes={keyframes}
              onKeyframesChange={setKeyframes}
              loopMode={loopMode}
              onLoopModeChange={setLoopMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
