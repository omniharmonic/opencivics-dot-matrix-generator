import React from 'react';
import { type Settings, Strategy } from '../types';

interface ControlsPanelProps {
  settings: Settings;
  onSettingsChange: (newSettings: Partial<Settings>) => void;
  onRandomizeSeed: () => void;
  onExportSvg: () => void;
  onExportPng: () => void;
}

const Slider: React.FC<{label: string, value: string, name: keyof Settings, current: number, min: number, max: number, step: number, onChange: any}> =
  ({label, value, name, current, min, max, step, onChange}) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-400 mb-2">{label}: {value}</label>
      <input
        type="range"
        id={name}
        name={name}
        value={current}
        onChange={onChange}
        className="w-full h-2 md:h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer touch-manipulation"
        min={min}
        max={max}
        step={step}
      />
    </div>
);

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  settings,
  onSettingsChange,
  onRandomizeSeed,
  onExportSvg,
  onExportPng,
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isNumber = type === 'number' || type === 'range';
    onSettingsChange({ [name]: isNumber ? parseFloat(value) : value });
  };
  
  const maxGridRing = 10; // Maximum possible ring
  const maxConnectionRing = settings.gridEndRing;
  
  return (
    <div className="bg-gray-800 text-white md:rounded-lg md:shadow-2xl w-full h-full flex flex-col overflow-hidden">
      <h2 className="hidden md:block text-xl font-bold text-center border-b border-gray-700 p-4 flex-shrink-0">Generative Controls</h2>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 md:space-y-4">
        {/* Grid Structure */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wide">Grid Structure</h3>
          <Slider label="Grid Start Ring" name="gridStartRing" value={settings.gridStartRing.toString()} current={settings.gridStartRing} min={0} max={maxGridRing} step={1} onChange={handleInputChange} />
          <Slider label="Grid End Ring" name="gridEndRing" value={settings.gridEndRing.toString()} current={settings.gridEndRing} min={0} max={maxGridRing} step={1} onChange={handleInputChange} />
          <Slider label="Symmetry Sides" name="symmetrySides" value={settings.symmetrySides.toString()} current={settings.symmetrySides} min={3} max={12} step={1} onChange={handleInputChange} />
          <Slider label="Chaos" name="chaos" value={settings.chaos.toFixed(2)} current={settings.chaos} min={0} max={10} step={0.1} onChange={handleInputChange} />
        </div>

        {/* Connection Rules */}
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wide">Connection Rules</h3>
          <div>
            <label htmlFor="strategy" className="block text-sm font-medium text-gray-400 mb-2">Strategy</label>
            <select id="strategy" name="strategy" value={settings.strategy} onChange={handleInputChange} className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-sm touch-manipulation">
              {Object.values(Strategy).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Slider label="Start Ring" name="connectionStartRing" value={settings.connectionStartRing.toString()} current={settings.connectionStartRing} min={settings.gridStartRing} max={maxConnectionRing} step={1} onChange={handleInputChange} />
          <Slider label="End Ring" name="connectionEndRing" value={settings.connectionEndRing.toString()} current={settings.connectionEndRing} min={settings.gridStartRing} max={maxConnectionRing} step={1} onChange={handleInputChange} />
        </div>

        {/* Algorithm Parameters */}
        <div className="space-y-3 pt-2 border-t border-gray-700">
           <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wide">Algorithm</h3>
           <Slider label="Tangential Step" name="tangentialStep" value={settings.tangentialStep.toString()} current={settings.tangentialStep} min={0} max={10} step={1} onChange={handleInputChange} />
           <Slider label="Radial Twist" name="radialTwist" value={settings.radialTwist.toFixed(2)} current={settings.radialTwist} min={-1} max={1} step={0.05} onChange={handleInputChange} />
           {settings.strategy === Strategy.Clusters && <Slider label="Cluster Count" name="clusterCount" value={settings.clusterCount.toString()} current={settings.clusterCount} min={1} max={15} step={1} onChange={handleInputChange} />}
           {settings.strategy === Strategy.Random && <Slider label="Max Connections" name="maxConnections" value={settings.maxConnections.toString()} current={settings.maxConnections} min={1} max={5} step={1} onChange={handleInputChange} />}
        </div>

        {/* Appearance */}
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wide">Appearance</h3>
          <Slider label="Line Weight" name="lineWidth" value={settings.lineWidth.toFixed(1)} current={settings.lineWidth} min={0} max={100} step={0.1} onChange={handleInputChange} />
          <Slider label="Dot Size" name="dotSize" value={settings.dotSize.toFixed(1)} current={settings.dotSize} min={0} max={100} step={0.1} onChange={handleInputChange} />
          <Slider label="Line Curvature" name="curvature" value={settings.curvature.toFixed(2)} current={settings.curvature} min={-1} max={1} step={0.01} onChange={handleInputChange} />
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <h3 className="text-sm font-semibold text-teal-400 uppercase tracking-wide">Actions</h3>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Seed: {settings.seed}</label>
            <button onClick={onRandomizeSeed} className="w-full bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 text-sm touch-manipulation">
              Randomize
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onExportSvg} className="bg-gray-600 hover:bg-gray-500 active:bg-gray-400 text-white font-bold py-3 px-3 rounded-md transition duration-300 text-sm touch-manipulation">
              Export SVG
            </button>
            <button onClick={onExportPng} className="bg-gray-600 hover:bg-gray-500 active:bg-gray-400 text-white font-bold py-3 px-3 rounded-md transition duration-300 text-sm touch-manipulation">
              Export PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};