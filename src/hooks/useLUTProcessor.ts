'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { LUTProcessor } from '@/lib/lutProcessor';
import { LUTLayer } from '@/lib/types';
import { UI_CONFIG } from '@/lib/constants';

export const useLUTProcessor = () => {
  const processorRef = useRef<LUTProcessor | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processImage = useCallback(async (
    image: HTMLImageElement,
    layers: LUTLayer[],
    canvas: HTMLCanvasElement
  ): Promise<void> => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        setIsProcessing(true);
        setError(null);

        if (!processorRef.current) {
          processorRef.current = new LUTProcessor(canvas);
        }

        await processorRef.current.processImage(image, layers);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('LUT processing error:', err);
      } finally {
        setIsProcessing(false);
      }
    }, UI_CONFIG.PROCESSING_DEBOUNCE);
  }, []);

  const clearProcessor = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.dispose();
      processorRef.current = null;
    }
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      clearProcessor();
    };
  }, [clearProcessor]);

  return {
    processImage,
    isProcessing,
    error,
    clearProcessor
  };
};