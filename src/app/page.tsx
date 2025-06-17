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
    { lutIndex: 0, opacity: 0, enabled: false },
    { lutIndex: 0, opacity: 0, enabled: false },
    { lutIndex: 0, opacity: 0, enabled: false }
  ]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <ImageUploader onImageUpload={setUploadedImage} />
            <LUTController 
              layers={lutLayers}
              onLayersChange={setLutLayers}
            />
          </div>
          
          <div>
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
