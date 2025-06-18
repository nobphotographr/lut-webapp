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
        <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">LUTレイヤー</h2>
        <p className="text-sm text-gray-400 mb-3 sm:mb-4 break-words leading-relaxed">
          最大3つのカラーグレーディングレイヤーを適用できます。各レイヤーで異なるLUTと不透明度を設定できます。
        </p>
        <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 mb-4 sm:mb-6">
          <p className="text-xs sm:text-sm text-blue-200 break-words leading-relaxed">
            💡 <strong>Photoshop互換：</strong> 不透明度の値はPhotoshopの調整レイヤーと同等です。プロ用LUTは25-50%で自然な仕上がりになります。
          </p>
        </div>
      </div>

      {layers.map((layer, index) => (
        <div key={index} className="bg-gray-700 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-medium text-white">
              レイヤー {index + 1}
            </h3>
            <label className="flex items-center min-h-[44px] touch-manipulation">
              <input
                type="checkbox"
                checked={layer.enabled}
                onChange={(e) => updateLayer(index, { enabled: e.target.checked })}
                className="mr-2 w-4 h-4 text-blue-600 bg-gray-100 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">有効</span>
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                LUTプリセット
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
                className="w-full bg-gray-600 border border-gray-500 text-white text-base sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3 sm:p-2.5 min-h-[44px] touch-manipulation"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="text-sm font-medium text-gray-300">
                  不透明度: {Math.round(layer.opacity * 100)}%
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateLayer(index, { opacity: UI_CONFIG.RECOMMENDED_OPACITY })}
                    className="text-xs sm:text-sm text-blue-400 hover:text-blue-300 underline px-2 py-1 min-h-[32px] touch-manipulation"
                    disabled={!layer.enabled || layer.lutIndex === 0}
                  >
                    自然 (25%)
                  </button>
                  <button
                    onClick={() => updateLayer(index, { opacity: UI_CONFIG.PHOTOSHOP_STANDARD_OPACITY })}
                    className="text-xs sm:text-sm text-green-400 hover:text-green-300 underline px-2 py-1 min-h-[32px] touch-manipulation"
                    disabled={!layer.enabled || layer.lutIndex === 0}
                  >
                    PS標準 (75%)
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
                className="w-full h-3 sm:h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider touch-manipulation"
                disabled={!layer.enabled || layer.lutIndex === 0}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1 break-words">
                <span>0%<br className="sm:hidden"/>微細</span>
                <span>25%<br className="sm:hidden"/>自然</span>
                <span>75%<br className="sm:hidden"/>PS</span>
                <span>100%<br className="sm:hidden"/>最大</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3 sm:p-4">
        <div className="flex items-start space-x-3">
          <div className="text-yellow-400 text-lg flex-shrink-0">⚠️</div>
          <div className="min-w-0 flex-1">
            <h4 className="text-yellow-300 font-medium mb-2 text-sm sm:text-base">デモ版の制限事項</h4>
            <ul className="text-xs sm:text-sm text-yellow-200 space-y-1">
              {MARKETING_CONFIG.DEMO_LIMITATIONS.map((limitation, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-2 flex-shrink-0">•</span>
                  <span className="break-words leading-relaxed">{limitation}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => window.open(MARKETING_CONFIG.PLUGIN_PURCHASE_URL, '_blank')}
              className="mt-3 text-yellow-300 hover:text-yellow-100 underline text-sm font-medium px-2 py-1 min-h-[32px] touch-manipulation"
            >
              完全版を入手 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}