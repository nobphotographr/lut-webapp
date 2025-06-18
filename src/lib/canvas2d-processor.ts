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
    
    // Canvas2D context with willReadFrequently for better performance
    const context = canvas.getContext('2d', { 
      willReadFrequently: true,
      alpha: false
    });
    
    if (!context) {
      throw new Error('Canvas 2D not supported');
    }
    
    this.ctx = context;
    console.log('[Canvas2D] Fallback processor initialized');
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
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];
      
      // Apply layers
      for (const layer of layers) {
        if (layer.enabled && layer.opacity > 0) {
          const effect = this.getLUTEffect(layer.lutIndex);
          
          // Simple color transformation
          r = this.applyEffect(r, effect.r, layer.opacity);
          g = this.applyEffect(g, effect.g, layer.opacity);
          b = this.applyEffect(b, effect.b, layer.opacity);
        }
      }
      
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    
    // Put processed data back
    this.ctx.putImageData(imageData, 0, 0);
  }

  private getLUTEffect(lutIndex: number): { r: number; g: number; b: number } {
    // Simple predefined effects for different LUT indices
    const effects = [
      { r: 1.0, g: 1.0, b: 1.0 },    // No effect
      { r: 1.1, g: 0.95, b: 0.9 },   // Warm
      { r: 0.9, g: 0.95, b: 1.1 },   // Cool
      { r: 1.2, g: 1.0, b: 0.8 },    // Golden
      { r: 0.8, g: 1.0, b: 1.2 },    // Blue
      { r: 1.0, g: 0.8, b: 0.8 },    // Vintage
    ];
    
    return effects[Math.min(lutIndex, effects.length - 1)] || effects[0];
  }

  private applyEffect(value: number, multiplier: number, opacity: number): number {
    const adjusted = value * multiplier;
    return value + (adjusted - value) * opacity;
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