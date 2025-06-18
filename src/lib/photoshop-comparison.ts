/**
 * Photoshop LUT Comparison and Analysis Tools
 * PhotoshopのLUT適用結果との比較とデータ抽出機能
 */

export interface ColorSample {
  x: number;
  y: number;
  original: { r: number; g: number; b: number };
  processed: { r: number; g: number; b: number };
  lutName: string;
  opacity: number;
}

export interface PhotoshopComparisonData {
  lutName: string;
  opacity: number;
  colorSamples: ColorSample[];
  averageDelta: number;
  maxDelta: number;
  recommendedAdjustment: number;
}

/**
 * Canvas上の指定座標の色を取得
 */
export function sampleColorFromCanvas(
  canvas: HTMLCanvasElement, 
  x: number, 
  y: number
): { r: number; g: number; b: number } {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  
  const imageData = ctx.getImageData(x, y, 1, 1);
  const data = imageData.data;
  
  return {
    r: data[0] / 255,
    g: data[1] / 255,
    b: data[2] / 255
  };
}

/**
 * 複数のサンプルポイントで色を比較
 */
export function createColorSamples(
  originalCanvas: HTMLCanvasElement,
  processedCanvas: HTMLCanvasElement,
  lutName: string,
  opacity: number,
  sampleCount: number = 16
): ColorSample[] {
  const samples: ColorSample[] = [];
  const width = originalCanvas.width;
  const height = originalCanvas.height;
  
  // グリッド状にサンプルポイントを配置
  const gridSize = Math.ceil(Math.sqrt(sampleCount));
  
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      if (samples.length >= sampleCount) break;
      
      const x = Math.floor((width / (gridSize + 1)) * (i + 1));
      const y = Math.floor((height / (gridSize + 1)) * (j + 1));
      
      try {
        const original = sampleColorFromCanvas(originalCanvas, x, y);
        const processed = sampleColorFromCanvas(processedCanvas, x, y);
        
        samples.push({
          x,
          y,
          original,
          processed,
          lutName,
          opacity
        });
      } catch (error) {
        console.warn(`Failed to sample at (${x}, ${y}):`, error);
      }
    }
  }
  
  return samples;
}

/**
 * 色差を計算（Delta E 2000近似）
 */
export function calculateColorDelta(
  color1: { r: number; g: number; b: number },
  color2: { r: number; g: number; b: number }
): number {
  // 簡易的なDelta E計算（より正確にはLAB色空間で計算すべき）
  const deltaR = color1.r - color2.r;
  const deltaG = color1.g - color2.g;
  const deltaB = color1.b - color2.b;
  
  // 視覚的重み付け（人間の目は緑に敏感）
  const weightedDelta = Math.sqrt(
    0.3 * deltaR * deltaR +
    0.59 * deltaG * deltaG +
    0.11 * deltaB * deltaB
  );
  
  return weightedDelta;
}

/**
 * Photoshop参照画像との比較分析
 */
export function analyzePhotoshopComparison(
  originalCanvas: HTMLCanvasElement,
  webProcessedCanvas: HTMLCanvasElement,
  photoshopReferenceCanvas: HTMLCanvasElement,
  lutName: string,
  currentOpacity: number
): PhotoshopComparisonData {
  const sampleCount = 25; // 5x5グリッド
  
  // Web版とPhotoshop版のサンプルを取得
  const webSamples = createColorSamples(
    originalCanvas, 
    webProcessedCanvas, 
    lutName, 
    currentOpacity,
    sampleCount
  );
  
  const photoshopSamples = createColorSamples(
    originalCanvas,
    photoshopReferenceCanvas,
    lutName + ' (Photoshop)',
    1.0, // Photoshop基準として100%
    sampleCount
  );
  
  // 色差を計算
  const deltas: number[] = [];
  const adjustedSamples: ColorSample[] = [];
  
  for (let i = 0; i < Math.min(webSamples.length, photoshopSamples.length); i++) {
    const webColor = webSamples[i].processed;
    const psColor = photoshopSamples[i].processed;
    
    const delta = calculateColorDelta(webColor, psColor);
    deltas.push(delta);
    
    adjustedSamples.push({
      ...webSamples[i],
      processed: psColor // Photoshop参照色を使用
    });
  }
  
  const averageDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
  const maxDelta = Math.max(...deltas);
  
  // 推奨調整値を計算（色差を最小化する不透明度倍率）
  let recommendedAdjustment = 1.0;
  if (averageDelta > 0.05) { // 5%以上の差がある場合
    // より強い効果が必要
    recommendedAdjustment = Math.min(2.0, 1.0 + averageDelta * 4);
  } else if (averageDelta < 0.01) { // 1%未満の差の場合
    // 効果が強すぎる可能性
    recommendedAdjustment = Math.max(0.5, 1.0 - averageDelta * 2);
  }
  
  return {
    lutName,
    opacity: currentOpacity,
    colorSamples: adjustedSamples,
    averageDelta,
    maxDelta,
    recommendedAdjustment
  };
}

/**
 * LUT効果の強度を自動調整
 */
export function generateOpacityRecommendation(
  comparisonData: PhotoshopComparisonData
): {
  recommendedOpacity: number;
  intensityMultiplier: number;
  reasoning: string;
} {
  const { averageDelta, opacity } = comparisonData;
  
  let reasoning = '';
  let intensityMultiplier = 1.0;
  let recommendedOpacity = opacity;
  
  if (averageDelta > 0.1) {
    reasoning = 'LUT効果が大幅に弱い - 不透明度とコントラストの大幅増強を推奨';
    intensityMultiplier = 1.5;
    recommendedOpacity = Math.min(1.0, opacity * 1.3);
  } else if (averageDelta > 0.05) {
    reasoning = 'LUT効果がやや弱い - 不透明度の増加を推奨';
    intensityMultiplier = 1.2;
    recommendedOpacity = Math.min(1.0, opacity * 1.15);
  } else if (averageDelta > 0.02) {
    reasoning = 'LUT効果が軽微に弱い - わずかな調整を推奨';
    intensityMultiplier = 1.1;
    recommendedOpacity = Math.min(1.0, opacity * 1.05);
  } else if (averageDelta < 0.005) {
    reasoning = 'LUT効果が強すぎる可能性 - 不透明度の減少を検討';
    intensityMultiplier = 0.9;
    recommendedOpacity = Math.max(0.1, opacity * 0.95);
  } else {
    reasoning = 'LUT効果は適切なレベル';
    intensityMultiplier = 1.0;
    recommendedOpacity = opacity;
  }
  
  return {
    recommendedOpacity,
    intensityMultiplier,
    reasoning
  };
}

/**
 * Photoshop比較レポートの生成
 */
export function generateComparisonReport(
  comparisonData: PhotoshopComparisonData
): string {
  const recommendation = generateOpacityRecommendation(comparisonData);
  
  return `
# Photoshop LUT比較レポート

## LUT: ${comparisonData.lutName}
- 現在の不透明度: ${(comparisonData.opacity * 100).toFixed(1)}%
- 平均色差: ${(comparisonData.averageDelta * 100).toFixed(2)}%
- 最大色差: ${(comparisonData.maxDelta * 100).toFixed(2)}%

## 推奨調整
- 推奨不透明度: ${(recommendation.recommendedOpacity * 100).toFixed(1)}%
- 強度倍率: ${recommendation.intensityMultiplier.toFixed(2)}x
- 理由: ${recommendation.reasoning}

## サンプル分析
サンプル数: ${comparisonData.colorSamples.length}
平均変化量: R${(comparisonData.colorSamples.reduce((sum, s) => sum + (s.processed.r - s.original.r), 0) / comparisonData.colorSamples.length * 100).toFixed(1)}% G${(comparisonData.colorSamples.reduce((sum, s) => sum + (s.processed.g - s.original.g), 0) / comparisonData.colorSamples.length * 100).toFixed(1)}% B${(comparisonData.colorSamples.reduce((sum, s) => sum + (s.processed.b - s.original.b), 0) / comparisonData.colorSamples.length * 100).toFixed(1)}%
  `.trim();
}