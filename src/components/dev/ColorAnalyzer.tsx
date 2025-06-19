'use client';

import React, { useState, useRef } from 'react';
import { extractColorSamples, analyzeColorDifferences, generateColorAnalysisReport, STANDARD_SAMPLE_POSITIONS, ColorAnalysisResult } from '@/lib/color-analysis';

interface ColorAnalyzerProps {
  outputCanvas: HTMLCanvasElement | null;
}

export default function ColorAnalyzer({ outputCanvas }: ColorAnalyzerProps) {
  const [analysisResult, setAnalysisResult] = useState<ColorAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Photoshop reference samples (manually extracted from reference images)
  const PHOTOSHOP_SAMPLES = {
    'anderson': [
      { position: { x: 100, y: 100 }, description: 'Top Left - Sky', color: { r: 0.45, g: 0.52, b: 0.58 } },
      { position: { x: 300, y: 150 }, description: 'Top Center - Water', color: { r: 0.35, g: 0.45, b: 0.52 } },
      { position: { x: 500, y: 100 }, description: 'Top Right - Sky', color: { r: 0.48, g: 0.54, b: 0.60 } },
      { position: { x: 200, y: 250 }, description: 'Middle Left - Car', color: { r: 0.15, g: 0.18, b: 0.22 } },
      { position: { x: 400, y: 300 }, description: 'Center - Concrete', color: { r: 0.68, g: 0.72, b: 0.75 } },
      { position: { x: 600, y: 250 }, description: 'Middle Right - Water', color: { r: 0.38, g: 0.47, b: 0.55 } },
      { position: { x: 150, y: 400 }, description: 'Bottom Left - Road', color: { r: 0.65, g: 0.68, b: 0.70 } },
      { position: { x: 350, y: 450 }, description: 'Bottom Center - Railing', color: { r: 0.58, g: 0.62, b: 0.65 } },
      { position: { x: 550, y: 400 }, description: 'Bottom Right - Road', color: { r: 0.62, g: 0.65, b: 0.67 } }
    ],
    'blue-sierra': [
      { position: { x: 100, y: 100 }, description: 'Top Left - Sky', color: { r: 0.42, g: 0.48, b: 0.62 } },
      { position: { x: 300, y: 150 }, description: 'Top Center - Water', color: { r: 0.28, g: 0.38, b: 0.58 } },
      { position: { x: 500, y: 100 }, description: 'Top Right - Sky', color: { r: 0.45, g: 0.51, b: 0.65 } },
      { position: { x: 200, y: 250 }, description: 'Middle Left - Car', color: { r: 0.12, g: 0.15, b: 0.25 } },
      { position: { x: 400, y: 300 }, description: 'Center - Concrete', color: { r: 0.62, g: 0.68, b: 0.78 } },
      { position: { x: 600, y: 250 }, description: 'Middle Right - Water', color: { r: 0.32, g: 0.42, b: 0.62 } },
      { position: { x: 150, y: 400 }, description: 'Bottom Left - Road', color: { r: 0.58, g: 0.62, b: 0.72 } },
      { position: { x: 350, y: 450 }, description: 'Bottom Center - Railing', color: { r: 0.52, g: 0.58, b: 0.68 } },
      { position: { x: 550, y: 400 }, description: 'Bottom Right - Road', color: { r: 0.55, g: 0.59, b: 0.69 } }
    ],
    'f-pro400h': [
      { position: { x: 100, y: 100 }, description: 'Top Left - Sky', color: { r: 0.46, g: 0.50, b: 0.56 } },
      { position: { x: 300, y: 150 }, description: 'Top Center - Water', color: { r: 0.36, g: 0.42, b: 0.50 } },
      { position: { x: 500, y: 100 }, description: 'Top Right - Sky', color: { r: 0.49, g: 0.52, b: 0.58 } },
      { position: { x: 200, y: 250 }, description: 'Middle Left - Car', color: { r: 0.16, g: 0.18, b: 0.22 } },
      { position: { x: 400, y: 300 }, description: 'Center - Concrete', color: { r: 0.70, g: 0.72, b: 0.74 } },
      { position: { x: 600, y: 250 }, description: 'Middle Right - Water', color: { r: 0.40, g: 0.45, b: 0.53 } },
      { position: { x: 150, y: 400 }, description: 'Bottom Left - Road', color: { r: 0.67, g: 0.68, b: 0.69 } },
      { position: { x: 350, y: 450 }, description: 'Bottom Center - Railing', color: { r: 0.60, g: 0.62, b: 0.64 } },
      { position: { x: 550, y: 400 }, description: 'Bottom Right - Road', color: { r: 0.64, g: 0.65, b: 0.66 } }
    ]
  };

  const analyzeColors = (lutType: string) => {
    if (!outputCanvas) {
      alert('No output canvas available');
      return;
    }

    setIsAnalyzing(true);

    try {
      // Extract color samples from web app output
      const webAppSamples = extractColorSamples(outputCanvas, STANDARD_SAMPLE_POSITIONS);
      
      // Get corresponding Photoshop samples
      const photoshopSamples = PHOTOSHOP_SAMPLES[lutType as keyof typeof PHOTOSHOP_SAMPLES];
      
      if (!photoshopSamples) {
        alert('No reference samples available for this LUT');
        return;
      }

      // Perform analysis
      const result = analyzeColorDifferences(webAppSamples, photoshopSamples);
      setAnalysisResult(result);

      // Log detailed report
      console.log('=== COLOR ANALYSIS REPORT ===');
      console.log(generateColorAnalysisReport(result));

    } catch (error) {
      console.error('Color analysis failed:', error);
      alert('Color analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-300 rounded-md p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Color Analysis Tool</h3>
      
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Compare current output with Photoshop reference images
        </p>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => analyzeColors('anderson')}
            disabled={isAnalyzing || !outputCanvas}
            className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-400"
          >
            Analyze Anderson
          </button>
          <button
            onClick={() => analyzeColors('blue-sierra')}
            disabled={isAnalyzing || !outputCanvas}
            className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-400"
          >
            Analyze Blue Sierra
          </button>
          <button
            onClick={() => analyzeColors('f-pro400h')}
            disabled={isAnalyzing || !outputCanvas}
            className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:bg-gray-400"
          >
            Analyze F-PRO400H
          </button>
        </div>
      </div>

      {analysisResult && (
        <div className="bg-gray-50 rounded p-3 text-sm">
          <h4 className="font-semibold mb-2">Analysis Results</h4>
          <div className="space-y-1">
            <p><strong>Dominant Cast:</strong> {analysisResult.dominantCast}</p>
            <p><strong>Severity:</strong> {analysisResult.severity}</p>
            <p><strong>Average Difference:</strong> R:{(analysisResult.averageDifference.r * 100).toFixed(2)}% G:{(analysisResult.averageDifference.g * 100).toFixed(2)}% B:{(analysisResult.averageDifference.b * 100).toFixed(2)}%</p>
          </div>
          
          {analysisResult.recommendations.length > 0 && (
            <div className="mt-3">
              <h5 className="font-semibold">Recommendations:</h5>
              <ul className="list-disc list-inside">
                {analysisResult.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm">{rec}</li>
                ))}
              </ul>
            </div>
          )}
          
          <p className="text-xs text-gray-500 mt-2">
            Check browser console for detailed report
          </p>
        </div>
      )}
    </div>
  );
}