'use client';

import { useState } from 'react';
import Header from '@/components/ui/Header';
import ImageUploader from '@/components/ui/ImageUploader';
import LUTController from '@/components/ui/LUTController';
import PreviewCanvas from '@/components/ui/PreviewCanvas';
import QualityIndicator from '@/components/ui/QualityIndicator';
import LUTDebugConsole from '@/components/dev/LUTDebugConsole';
import { LUTLayer } from '@/lib/types';

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const [lutLayers, setLutLayers] = useState<LUTLayer[]>([
    { lutIndex: 0, opacity: 0, enabled: false, blendMode: 'normal' },
    { lutIndex: 0, opacity: 0, enabled: false, blendMode: 'normal' },
    { lutIndex: 0, opacity: 0, enabled: false, blendMode: 'normal' }
  ]);

  const handleImageUpload = (image: HTMLImageElement, file: File) => {
    setUploadedImage(image);
    setUploadedFile(file);
    
    // Extract ImageData for quality analysis
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setImageData(data);
    }
  };

  const getCurrentOpacity = (): number => {
    return lutLayers.reduce((max, layer) => 
      layer.enabled ? Math.max(max, layer.opacity) : max, 0
    );
  };

  return (
    <div className="min-h-screen bg-glaze-primary text-glaze-text-primary">
      <Header />
      
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-8">
          {/* 左側または上側: アップロード＋コントロール */}
          <div className="space-y-4 sm:space-y-6">
            <ImageUploader onImageUpload={handleImageUpload} />
            
            {/* モバイル専用: プレビューを挟む */}
            <div className="lg:hidden">
              <PreviewCanvas 
                image={uploadedImage}
                lutLayers={lutLayers}
                onProcessingChange={setIsProcessing}
                onProcessedDataChange={setProcessedImageData}
              />
            </div>
            
            <LUTController 
              layers={lutLayers}
              onLayersChange={setLutLayers}
            />
            
            {/* 品質インジケーター */}
            {uploadedImage && (
              <QualityIndicator
                uploadedFile={uploadedFile}
                imageData={imageData}
                processedImageData={processedImageData}
                currentOpacity={getCurrentOpacity()}
                isProcessing={isProcessing}
              />
            )}
          </div>
          
          {/* 右側: プレビュー（デスクトップのみ） */}
          <div className="hidden lg:block">
            <PreviewCanvas 
              image={uploadedImage}
              lutLayers={lutLayers}
              onProcessingChange={setIsProcessing}
              onProcessedDataChange={setProcessedImageData}
            />
          </div>
        </div>
      </main>

      {/* Development Debug Console */}
      <LUTDebugConsole
        isVisible={showDebugConsole}
        onToggle={() => setShowDebugConsole(!showDebugConsole)}
      />
    </div>
  );
}
