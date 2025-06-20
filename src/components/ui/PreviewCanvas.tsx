'use client';

import { useEffect, useRef, useState } from 'react';
import { LUTLayer } from '@/lib/types';
import { useLUTProcessor } from '@/hooks/useLUTProcessor';

interface PreviewCanvasProps {
  image: HTMLImageElement | null;
  lutLayers: LUTLayer[];
}

export default function PreviewCanvas({ 
  image, 
  lutLayers
}: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { processImage, isProcessing, error: processingError } = useLUTProcessor();
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    if (!image || !canvasRef.current) {
      return;
    }

    const processImageAsync = async () => {
      try {
        setError(null);
        await processImage(image, lutLayers, canvasRef.current!);
        
      } catch (err) {
        console.error('Error processing image:', err);
        setError(processingError || '画像の処理に失敗しました。もう一度お試しください。');
      }
    };

    processImageAsync();
  }, [image, lutLayers]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!image) {
    return (
      <div className="w-full h-96 bg-glaze-secondary rounded-md flex items-center justify-center border border-glaze-border">
        <div className="text-center">
          <div className="text-4xl text-glaze-text-muted mb-4">🖼️</div>
          <p className="text-glaze-text-secondary">処理後の画像がここに表示されます</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-glaze-text-primary">プレビュー</h2>
        <div className="flex items-center space-x-2">
          {isProcessing && (
            <div className="flex items-center text-sm text-glaze-accent">
              <div className="animate-spin w-4 h-4 border-2 border-glaze-accent border-t-transparent rounded-full mr-2"></div>
              処理中...
            </div>
          )}
        </div>
      </div>

      <div className="relative bg-glaze-secondary rounded-md overflow-hidden border border-glaze-border">
        <canvas
          ref={canvasRef}
          className="w-full h-auto max-h-[600px] object-contain"
          style={{ display: image ? 'block' : 'none' }}
        />
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-glaze-secondary/90">
            <div className="text-center p-6">
              <div className="text-red-400 text-4xl mb-4">⚠️</div>
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-glaze-accent/20 border border-glaze-accent/30 rounded-md p-4">
        <div className="flex items-start space-x-3">
          <div className="text-glaze-accent text-lg">ℹ️</div>
          <div>
            <h4 className="text-glaze-accent-light font-medium mb-1">デモ版プレビュー</h4>
            <p className="text-sm text-glaze-accent-light">
              処理済み画像にはウォーターマークが追加されます。
              完全版ではウォーターマークなしの出力と追加のエクスポート機能が利用できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}