'use client';

import { useEffect, useRef, useState } from 'react';
import { LUTLayer } from '@/lib/types';
import { useLUTProcessor } from '@/hooks/useLUTProcessor';

interface PreviewCanvasProps {
  image: HTMLImageElement | null;
  lutLayers: LUTLayer[];
}

export default function PreviewCanvas({ image, lutLayers }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { processImage, isProcessing, error: processingError } = useLUTProcessor();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const processImageAsync = async () => {
      try {
        setError(null);
        await processImage(image, lutLayers, canvasRef.current!);
      } catch (err) {
        console.error('Error processing image:', err);
        setError(processingError || 'Failed to process image. Please try again.');
      }
    };

    processImageAsync();
  }, [image, lutLayers, processImage, processingError]);

  const handleDownload = () => {
    // この機能は制限されていることを示す
    alert('Download feature is not available in demo version. Get the full plugin to save your edited images!');
  };

  if (!image) {
    return (
      <div className="w-full h-96 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-600">
        <div className="text-center">
          <div className="text-4xl text-gray-500 mb-4">🖼️</div>
          <p className="text-gray-400">Upload an image to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Preview</h2>
        <div className="flex items-center space-x-2">
          {isProcessing && (
            <div className="flex items-center text-sm text-blue-400">
              <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full mr-2"></div>
              Processing...
            </div>
          )}
          <button
            onClick={handleDownload}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
            disabled={isProcessing}
          >
            Download (Demo)
          </button>
        </div>
      </div>

      <div className="relative bg-gray-800 rounded-lg overflow-hidden border border-gray-600">
        <canvas
          ref={canvasRef}
          className="w-full h-auto max-h-[600px] object-contain"
          style={{ display: image ? 'block' : 'none' }}
        />
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90">
            <div className="text-center p-6">
              <div className="text-red-400 text-4xl mb-4">⚠️</div>
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-blue-400 text-lg">ℹ️</div>
          <div>
            <h4 className="text-blue-300 font-medium mb-1">Demo Preview</h4>
            <p className="text-sm text-blue-200">
              Watermark will be added to all processed images. 
              The full plugin provides watermark-free output and additional export options.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}