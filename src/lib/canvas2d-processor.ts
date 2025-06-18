/**
 * Canvas 2D Fallback Processor
 * WebGLが利用できない環境でのフォールバック処理
 */

import { LUTLayer } from './types';

export class Canvas2DProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Enhanced Canvas2D context with optimized settings
    const context = canvas.getContext('2d', { 
      willReadFrequently: true,  // Optimize for getImageData operations
      alpha: false,              // Disable alpha channel for better performance
      desynchronized: false      // Keep synchronization for predictable behavior
    });
    
    if (!context) {
      throw new Error('Canvas 2D not supported');
    }
    
    this.ctx = context;
    console.log('[Canvas2D] Fallback processor initialized with willReadFrequently optimization');
  }

  async processImage(image: HTMLImageElement, layers: LUTLayer[]): Promise<void> {
    console.log('[Canvas2D] Processing image with fallback method');
    
    // Set canvas size to match image
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw original image
    this.ctx.drawImage(image, 0, 0);
    
    // Apply basic filters if any layers are enabled
    const enabledLayers = layers.filter(layer => layer.enabled && layer.opacity > 0);
    
    if (enabledLayers.length > 0) {
      // Simple filter effects using Canvas 2D
      this.applyBasicFilters(enabledLayers);
    }
    
    // Add watermark
    this.addWatermark();
    
    console.log('[Canvas2D] Image processing completed');
  }

  private applyBasicFilters(layers: LUTLayer[]): void {
    // Get image data for pixel-level manipulation
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageData.data;
    
    // Apply basic color adjustments based on LUT selection
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;
      
      // Apply layers
      for (const layer of layers) {
        if (layer.enabled && layer.opacity > 0) {
          const processed = this.applyLUTTransform(r, g, b, layer.lutIndex, layer.opacity);
          r = processed.r;
          g = processed.g;
          b = processed.b;
        }
      }
      
      data[i] = Math.max(0, Math.min(255, r * 255));
      data[i + 1] = Math.max(0, Math.min(255, g * 255));
      data[i + 2] = Math.max(0, Math.min(255, b * 255));
    }
    
    // Put processed data back
    this.ctx.putImageData(imageData, 0, 0);
  }
  
  private applyLUTTransform(r: number, g: number, b: number, lutIndex: number, opacity: number): { r: number; g: number; b: number } {
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    
    // Enhanced LUT approximations based on actual file analysis
    switch (lutIndex) {
      case 1: // Anderson
        return this.applyAndersonEffect(r, g, b, luminance, opacity);
      case 2: // Blue Sierra  
        return this.applyBlueSierraEffect(r, g, b, luminance, opacity);
      case 3: // F-PRO400H
        return this.applyFPRO400HEffect(r, g, b, luminance, opacity);
      case 4: // K-Ektar
        return this.applyKEktarEffect(r, g, b, luminance, opacity);
      case 5: // Pastel Light
        return this.applyPastelLightEffect(r, g, b, luminance, opacity);
      default:
        return { r, g, b };
    }
  }
  
  private applyFPRO400HEffect(r: number, g: number, b: number, luminance: number, opacity: number): { r: number; g: number; b: number } {
    // F-PRO400H characteristics: warm highlights, lifted shadows, film grain look
    let newR = r;
    let newG = g;
    let newB = b;
    
    if (luminance < 0.3) {
      // Shadows: lift slightly, add warmth
      newR = r * 1.15 + 0.05;
      newG = g * 1.05 + 0.02;
      newB = b * 0.95;
    } else if (luminance > 0.7) {
      // Highlights: warm tone, slight compression
      newR = r * 1.08;
      newG = g * 0.98;
      newB = b * 0.85;
    } else {
      // Midtones: slight warmth
      newR = r * 1.05;
      newG = g * 0.98;
      newB = b * 0.92;
    }
    
    return {
      r: r + (newR - r) * opacity,
      g: g + (newG - g) * opacity,
      b: b + (newB - b) * opacity
    };
  }
  
  private applyBlueSierraEffect(r: number, g: number, b: number, _luminance: number, opacity: number): { r: number; g: number; b: number } {
    // Blue Sierra: blue color cast, cooler tones
    const newR = r * 0.88;
    const newG = g * 0.94;
    const newB = b * 1.12;
    
    return {
      r: r + (newR - r) * opacity,
      g: g + (newG - g) * opacity,
      b: b + (newB - b) * opacity
    };
  }
  
  private applyAndersonEffect(r: number, g: number, b: number, _luminance: number, opacity: number): { r: number; g: number; b: number } {
    // Anderson: muted, slightly desaturated
    const newR = r * 0.96;
    const newG = g * 0.92;
    const newB = b * 0.90;
    
    return {
      r: r + (newR - r) * opacity,
      g: g + (newG - g) * opacity,
      b: b + (newB - b) * opacity
    };
  }
  
  private applyKEktarEffect(r: number, g: number, b: number, _luminance: number, opacity: number): { r: number; g: number; b: number } {
    // K-Ektar: Kodak film emulation, saturated but natural
    const newR = r * 1.05;
    const newG = g * 1.02;
    const newB = b * 0.95;
    
    return {
      r: r + (newR - r) * opacity,
      g: g + (newG - g) * opacity,
      b: b + (newB - b) * opacity
    };
  }
  
  private applyPastelLightEffect(r: number, g: number, b: number, _luminance: number, opacity: number): { r: number; g: number; b: number } {
    // Pastel Light: lifted, airy, soft
    const newR = r * 1.08 + 0.02;
    const newG = g * 1.05 + 0.02;
    const newB = b * 1.02 + 0.02;
    
    return {
      r: r + (newR - r) * opacity,
      g: g + (newG - g) * opacity,
      b: b + (newB - b) * opacity
    };
  }

  private addWatermark(): void {
    const watermarkText = 'GLAZE Demo';
    const fontSize = Math.min(this.canvas.width, this.canvas.height) * 0.03;
    
    this.ctx.font = `${fontSize}px Arial`;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1;
    
    const textWidth = this.ctx.measureText(watermarkText).width;
    const x = this.canvas.width - textWidth - 20;
    const y = this.canvas.height - 20;
    
    this.ctx.strokeText(watermarkText, x, y);
    this.ctx.fillText(watermarkText, x, y);
  }

  dispose(): void {
    // Canvas 2D doesn't need explicit cleanup
    console.log('[Canvas2D] Processor disposed');
  }
}