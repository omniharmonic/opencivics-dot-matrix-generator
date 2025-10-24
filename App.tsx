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
    <div className="min-h-screen bg-gray-900 text-white font-sans relative">
      {/* Canvas Container */}
      <div className="flex justify-center items-center min-h-screen p-4 pr-[420px] pb-[320px]">
        <ArtCanvas
          ref={canvasRef}
          points={gridPoints}
          lines={lines}
          settings={settings}
          width={canvasSize}
          height={canvasSize}
        />
      </div>

      {/* Floating Controls Panel */}
      <div className="fixed top-4 right-4 bottom-4 w-[400px] z-10">
        <ControlsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
          onRandomizeSeed={handleRandomizeSeed}
          onExportSvg={handleExportSvg}
          onExportPng={handleExportPng}
        />
      </div>

      {/* Bottom Animation Panel */}
      <div className="fixed bottom-0 left-0 right-[420px] z-10 p-4 max-h-[300px] overflow-y-auto">
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
  );
};

export default App;
