'use client';

import { useState } from 'react';
import { LUTDataValidator, ValidationResult } from '@/lib/lut-validator';
import { LUT_PRESETS } from '@/lib/constants';
import { LUTParser } from '@/lib/lut-parser';

interface LUTDebugConsoleProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function LUTDebugConsole({ isVisible, onToggle }: LUTDebugConsoleProps) {
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [selectedLUT, setSelectedLUT] = useState<string>('');

  const validateAllLUTs = async () => {
    setIsValidating(true);
    const results: Record<string, ValidationResult> = {};

    for (const preset of LUT_PRESETS) {
      if (!preset.file) continue;
      
      try {
        console.log(`🔍 Validating ${preset.name}...`);
        const lutData = await LUTParser.loadLUTFromURL(preset.file);
        const validation = LUTDataValidator.validateLUTFile(preset.name, lutData);
        results[preset.name] = validation;
      } catch (error) {
        console.error(`❌ Failed to validate ${preset.name}:`, error);
        results[preset.name] = {
          isValid: false,
          dataIntegrity: false,
          valueRange: { valid: false, outOfRangeCount: 0, examples: [] },
          knownPoints: [],
          coverage: 0,
          size: 0,
          totalDataPoints: 0
        };
      }
    }

    setValidationResults(results);
    setIsValidating(false);
  };

  const testSpecificColor = (rgb: number[]) => {
    if (!selectedLUT || !validationResults[selectedLUT]) return;

    const lutName = selectedLUT;
    const preset = LUT_PRESETS.find(p => p.name === lutName);
    if (!preset?.file) return;

    LUTParser.loadLUTFromURL(preset.file).then(lutData => {
      const result = LUTDataValidator.getLUTValue(lutData, rgb);
      console.log(`🎨 ${lutName} color test:`);
      console.log(`Input: rgb(${rgb.map(v => Math.round(v * 255)).join(', ')})`);
      console.log(`Output: rgb(${result.map(v => Math.round(v * 255)).join(', ')})`);
      console.log(`Difference: ${rgb.map((v, i) => ((result[i] - v) * 255).toFixed(1)).join(', ')}`);
    });
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors z-50"
      >
        🔧 Debug
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">🔍 LUT Debug Console</h2>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-6">
            {/* LUT Validation */}
            <div>
              <div className="flex items-center gap-4 mb-4">
                <h3 className="text-base font-medium text-white">LUT Data Validation</h3>
                <button
                  onClick={validateAllLUTs}
                  disabled={isValidating}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isValidating ? '検証中...' : '全LUT検証'}
                </button>
              </div>

              {Object.keys(validationResults).length > 0 && (
                <div className="space-y-3">
                  {Object.entries(validationResults).map(([name, result]) => (
                    <div
                      key={name}
                      className={`border rounded-lg p-3 ${
                        result.isValid
                          ? 'border-green-600 bg-green-900/20'
                          : 'border-red-600 bg-red-900/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{name}</h4>
                        <span
                          className={`text-sm px-2 py-1 rounded ${
                            result.isValid
                              ? 'bg-green-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {result.isValid ? '✅ Valid' : '❌ Invalid'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-gray-400">Size:</span>
                          <span className="text-white ml-1">{result.size}³</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Points:</span>
                          <span className="text-white ml-1">{result.totalDataPoints.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Coverage:</span>
                          <span className="text-white ml-1">{result.coverage.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Range Issues:</span>
                          <span
                            className={`ml-1 ${
                              result.valueRange.outOfRangeCount > 0 ? 'text-red-400' : 'text-green-400'
                            }`}
                          >
                            {result.valueRange.outOfRangeCount}
                          </span>
                        </div>
                      </div>

                      {result.knownPoints.length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-blue-400 cursor-pointer">
                            Known Points Test ({result.knownPoints.length})
                          </summary>
                          <div className="mt-2 space-y-1 text-xs">
                            {result.knownPoints.map((point, index) => (
                              <div key={index} className="flex justify-between">
                                <span className="text-gray-300">{point.description}:</span>
                                <span className="text-white font-mono">
                                  [{point.input.join(',')}] → [{point.output.map(v => v.toFixed(3)).join(',')}]
                                  {point.isIdentity && <span className="text-green-400 ml-2">ID</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Color Testing */}
            <div>
              <h3 className="text-base font-medium text-white mb-4">Color Testing</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Select LUT:</label>
                  <select
                    value={selectedLUT}
                    onChange={(e) => setSelectedLUT(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 text-white rounded px-3 py-2"
                  >
                    <option value="">Choose LUT...</option>
                    {LUT_PRESETS.filter(p => p.file).map(preset => (
                      <option key={preset.id} value={preset.name}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedLUT && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                      onClick={() => testSpecificColor([1, 0.5, 0])}
                      className="bg-orange-600 text-white px-3 py-2 rounded text-sm hover:bg-orange-700"
                    >
                      Test Orange
                    </button>
                    <button
                      onClick={() => testSpecificColor([1, 0, 0])}
                      className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700"
                    >
                      Test Red
                    </button>
                    <button
                      onClick={() => testSpecificColor([0.5, 0.5, 0.5])}
                      className="bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700"
                    >
                      Test Gray
                    </button>
                    <button
                      onClick={() => testSpecificColor([0.8, 0.7, 0.6])}
                      className="bg-amber-600 text-white px-3 py-2 rounded text-sm hover:bg-amber-700"
                    >
                      Test Skin
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 8bit Quality Info */}
            <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
              <h3 className="text-base font-medium text-yellow-300 mb-2">
                8bit Processing Info
              </h3>
              <div className="text-sm text-yellow-200 space-y-1">
                <p>• JPEG: 256階調/チャンネル（8bit）</p>
                <p>• RAW: 16,384階調/チャンネル（14bit）</p>
                <p>• 制約: ブラウザ環境でのJPEG/PNG処理のみ</p>
                <p>• 対策: ディザリング + 適応的不透明度調整</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}