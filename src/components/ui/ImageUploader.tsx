'use client';

import { useCallback, useState } from 'react';
import { MAX_FILE_SIZE, MAX_IMAGE_DIMENSION, SUPPORTED_FORMATS } from '@/lib/constants';

interface ImageUploaderProps {
  onImageUpload: (image: HTMLImageElement, file: File) => void;
}

export default function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return '対応していないファイル形式です。JPEGまたはPNGをご使用ください。';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'ファイルサイズが大きすぎます。最大10MBまでです。';
    }
    
    return null;
  };

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
          setError(`画像サイズが大きすぎます。最大${MAX_IMAGE_DIMENSION}×${MAX_IMAGE_DIMENSION}pxまでです。`);
          URL.revokeObjectURL(url);
          setIsLoading(false);
          return;
        }

        onImageUpload(img, file);
        URL.revokeObjectURL(url);
        setIsLoading(false);
      };

      img.onerror = () => {
        setError('画像の読み込みに失敗しました。別のファイルをお試しください。');
        URL.revokeObjectURL(url);
        setIsLoading(false);
      };

      img.src = url;
    } catch {
      setError('画像処理中にエラーが発生しました。');
      setIsLoading(false);
    }
  }, [onImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-4 sm:p-6 md:p-8 text-center transition-all duration-200 min-h-[120px] sm:min-h-[140px]
          ${dragActive 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-manipulation"
          disabled={isLoading}
        />
        
        <div className="space-y-2 sm:space-y-4">
          <div className="text-2xl sm:text-3xl md:text-4xl text-gray-400">
            📸
          </div>
          
          <div>
            <p className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300 break-words">
              {isLoading ? '処理中...' : '画像をここにドロップしてください'}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-2 break-words">
              またはクリックしてファイルを選択
            </p>
          </div>
          
          <div className="text-xs text-gray-400 dark:text-gray-500 break-words leading-relaxed">
            JPEG、PNG対応<br className="sm:hidden"/>（最大10MB、{MAX_IMAGE_DIMENSION}×{MAX_IMAGE_DIMENSION}px）
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 sm:mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm break-words leading-relaxed">{error}</p>
        </div>
      )}
    </div>
  );
}