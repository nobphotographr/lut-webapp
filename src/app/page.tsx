'use client';

import { useState } from 'react';
import Header from '@/components/ui/Header';
import ImageUploader from '@/components/ui/ImageUploader';
import LUTController from '@/components/ui/LUTController';
import PreviewCanvas from '@/components/ui/PreviewCanvas';
import { LUTLayer } from '@/lib/types';

export default function Home() {
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [lutLayers, setLutLayers] = useState<LUTLayer[]>([
    { lutIndex: 0, opacity: 0, enabled: false, blendMode: 'normal' },
    { lutIndex: 0, opacity: 0, enabled: false, blendMode: 'normal' },
    { lutIndex: 0, opacity: 0, enabled: false, blendMode: 'normal' }
  ]);

  const handleImageUpload = (image: HTMLImageElement) => {
    setUploadedImage(image);
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
              />
            </div>
            
            <LUTController 
              layers={lutLayers}
              onLayersChange={setLutLayers}
            />
          </div>
          
          {/* 右側: プレビュー（デスクトップのみ） */}
          <div className="hidden lg:block">
            <PreviewCanvas 
              image={uploadedImage}
              lutLayers={lutLayers}
            />
          </div>
        </div>
      </main>

    </div>
  );
}
