'use client';

import { LUTLayer } from '@/lib/types';
import { LUT_PRESETS, UI_CONFIG, MARKETING_CONFIG } from '@/lib/constants';

interface LUTControllerProps {
  layers: LUTLayer[];
  onLayersChange: (layers: LUTLayer[]) => void;
}

export default function LUTController({ layers, onLayersChange }: LUTControllerProps) {
  const updateLayer = (index: number, updates: Partial<LUTLayer>) => {
    const newLayers = layers.map((layer, i) => 
      i === index ? { ...layer, ...updates } : layer
    );
    onLayersChange(newLayers);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">LUT Layers</h2>
        <p className="text-sm text-gray-400 mb-4">
          Apply up to 3 color grading layers. Each layer can use a different LUT with adjustable opacity.
        </p>
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 mb-6">
          <p className="text-xs text-blue-200">
            💡 <strong>Photoshop Compatible:</strong> Opacity values match Photoshop adjustment layer opacity. Professional LUTs work best at 25-50% for natural enhancement.
          </p>
        </div>
      </div>

      {layers.map((layer, index) => (
        <div key={index} className="bg-gray-700 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">
              Layer {index + 1}
            </h3>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={layer.enabled}
                onChange={(e) => updateLayer(index, { enabled: e.target.checked })}
                className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Enable</span>
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                LUT Preset
              </label>
              <select
                value={layer.lutIndex}
                onChange={(e) => {
                  const newIndex = parseInt(e.target.value);
                  updateLayer(index, { 
                    lutIndex: newIndex,
                    opacity: newIndex > 0 ? UI_CONFIG.DEFAULT_OPACITY : 0
                  });
                }}
                className="w-full bg-gray-600 border border-gray-500 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5"
                disabled={!layer.enabled}
              >
                {LUT_PRESETS.map((preset, presetIndex) => (
                  <option key={preset.id} value={presetIndex}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">
                  Opacity: {Math.round(layer.opacity * 100)}%
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => updateLayer(index, { opacity: UI_CONFIG.RECOMMENDED_OPACITY })}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                    disabled={!layer.enabled || layer.lutIndex === 0}
                  >
                    Natural (25%)
                  </button>
                  <button
                    onClick={() => updateLayer(index, { opacity: UI_CONFIG.PHOTOSHOP_STANDARD_OPACITY })}
                    className="text-xs text-green-400 hover:text-green-300 underline"
                    disabled={!layer.enabled || layer.lutIndex === 0}
                  >
                    PS Standard (75%)
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step={UI_CONFIG.OPACITY_STEP}
                value={layer.opacity}
                onChange={(e) => updateLayer(index, { opacity: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
                disabled={!layer.enabled || layer.lutIndex === 0}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0% Subtle</span>
                <span>25% Natural</span>
                <span>75% PS</span>
                <span>100% Full</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-yellow-400 text-lg">⚠️</div>
          <div>
            <h4 className="text-yellow-300 font-medium mb-2">Demo Limitations</h4>
            <ul className="text-sm text-yellow-200 space-y-1">
              {MARKETING_CONFIG.DEMO_LIMITATIONS.map((limitation, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => window.open(MARKETING_CONFIG.PLUGIN_PURCHASE_URL, '_blank')}
              className="mt-3 text-yellow-300 hover:text-yellow-100 underline text-sm font-medium"
            >
              Unlock Full Version →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}