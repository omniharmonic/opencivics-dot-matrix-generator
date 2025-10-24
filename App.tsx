import React, { useState, useEffect, useMemo } from 'react';
import { ArtCanvas, type ArtCanvasHandles } from './components/ArtCanvas';
import { ControlsPanel } from './components/ControlsPanel';
import { AnimationPanel } from './components/AnimationPanel';
import { generateGridPoints, generateArt } from './services/artGenerator';
import { type Point, type Line, type Settings, type Keyframe, type LoopMode, Strategy } from './types';

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    ringCount: 4,
    symmetrySides: 6,
    chaos: 0,
    strategy: Strategy.Web,
    startRing: 0,
    endRing: 3,
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
      settings.ringCount,
      settings.symmetrySides,
      settings.chaos,
      settings.seed
    );
    setGridPoints(points);

    // Clamp start/end rings to valid range
    const maxRing = settings.ringCount > 0 ? settings.ringCount -1 : 0;
    if(settings.startRing > maxRing || settings.endRing > maxRing) {
        setSettings(s => ({...s, startRing: 0, endRing: maxRing}));
    }

  }, [settings.ringCount, settings.symmetrySides, settings.chaos, settings.seed]);

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
        // Ensure end ring is not smaller than start ring
        if (newSettings.startRing !== undefined && newSettings.startRing > updated.endRing) {
            updated.endRing = newSettings.startRing;
        }
        if (newSettings.endRing !== undefined && newSettings.endRing < updated.startRing) {
            updated.startRing = newSettings.endRing;
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
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans">
      <main className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Top Section: Canvas + Controls */}
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          <div className="flex-shrink-0 mx-auto xl:mx-0">
            <ArtCanvas
              ref={canvasRef}
              points={gridPoints}
              lines={lines}
              settings={settings}
              width={canvasSize}
              height={canvasSize}
            />
          </div>

          <div className="w-full xl:w-auto xl:min-w-[400px]">
            <ControlsPanel
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onRandomizeSeed={handleRandomizeSeed}
              onExportSvg={handleExportSvg}
              onExportPng={handleExportPng}
            />
          </div>
        </div>

        {/* Bottom Section: Animation Panel */}
        <div className="w-full">
          <AnimationPanel
            currentSettings={settings}
            onSettingsChange={setSettings}
            keyframes={keyframes}
            onKeyframesChange={setKeyframes}
            loopMode={loopMode}
            onLoopModeChange={setLoopMode}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
