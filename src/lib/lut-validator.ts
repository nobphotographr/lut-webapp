/**
 * LUT Data Validation and Testing Utilities
 * 8bit JPEG制約による品質問題の調査・対応ツール
 */

import { LUTData } from './types';

export interface ValidationResult {
  isValid: boolean;
  dataIntegrity: boolean;
  valueRange: { valid: boolean; outOfRangeCount: number; examples: Array<{index: number, value: number}> };
  knownPoints: Array<{ input: number[], output: number[], description: string; isIdentity: boolean }>;
  coverage: number;
  size: number;
  totalDataPoints: number;
}

export interface QualityMetrics {
  tonalRange: number;
  smoothness: number;
  artifacts: number;
  effectiveRange: number;
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  suggestions: string[];
}

export interface ProcessingQuality {
  inputFormat: '8bit-jpeg' | '8bit-png' | 'unknown';
  compression: 'high' | 'medium' | 'low';
  recommendedOpacity: { min: number; max: number; optimal: number };
  qualityIndicator: QualityMetrics;
}

/**
 * LUTデータ適用の正確性検証（最優先）
 */
export class LUTDataValidator {
  /**
   * LUTファイルの基本検証
   */
  static validateLUTFile(lutName: string, lutData: LUTData): ValidationResult {
    console.log(`=== ${lutName} LUTデータ検証 ===`);
    
    // 基本情報
    const expectedCount = lutData.size * lutData.size * lutData.size * 3;
    console.log(`ファイルサイズ: ${lutData.data.length} floats`);
    console.log(`LUTサイズ: ${lutData.size}³`);
    console.log(`期待データ数: ${expectedCount}`);
    console.log(`実データ数: ${lutData.data.length}`);
    
    // データ完全性チェック
    const dataIntegrity = lutData.data.length === expectedCount;
    if (!dataIntegrity) {
      console.error(`❌ データ不足: ${expectedCount - lutData.data.length} 要素欠損`);
    } else {
      console.log(`✅ データ完全性: OK`);
    }
    
    // 値の範囲チェック
    const outOfRange: Array<{index: number, value: number}> = [];
    for (let i = 0; i < lutData.data.length; i++) {
      if (lutData.data[i] < 0 || lutData.data[i] > 1) {
        outOfRange.push({index: i, value: lutData.data[i]});
        if (outOfRange.length >= 10) break; // 最初の10個だけ表示
      }
    }
    
    const valueRangeValid = outOfRange.length === 0;
    if (outOfRange.length > 0) {
      console.warn(`⚠️ 範囲外値検出: ${outOfRange.length}個`);
      outOfRange.forEach(item => {
        console.log(`  Index ${item.index}: ${item.value}`);
      });
    } else {
      console.log(`✅ 値範囲: 全て0-1内`);
    }
    
    // 既知の基準点をテスト
    const knownPoints = this.testKnownPoints(lutData);
    
    // カバレッジ計算
    const coverage = (lutData.data.length / 3) / (lutData.size * lutData.size * lutData.size) * 100;
    
    return {
      isValid: dataIntegrity && valueRangeValid,
      dataIntegrity,
      valueRange: {
        valid: valueRangeValid,
        outOfRangeCount: outOfRange.length,
        examples: outOfRange.slice(0, 5)
      },
      knownPoints,
      coverage,
      size: lutData.size,
      totalDataPoints: lutData.data.length / 3
    };
  }

  /**
   * 既知ポイントのテスト
   */
  private static testKnownPoints(lutData: LUTData): Array<{ input: number[], output: number[], description: string, isIdentity: boolean }> {
    const testPoints = [
      { rgb: [0, 0, 0], desc: "黒" },
      { rgb: [1, 1, 1], desc: "白" },
      { rgb: [1, 0, 0], desc: "純赤" },
      { rgb: [0, 1, 0], desc: "純緑" },
      { rgb: [0, 0, 1], desc: "純青" },
      { rgb: [0.5, 0.5, 0.5], desc: "中間グレー" },
      { rgb: [1, 0.5, 0], desc: "オレンジ（問題テスト）" }
    ];
    
    console.log("\n=== 既知ポイントテスト ===");
    const results = testPoints.map(point => {
      const lutResult = this.getLUTValue(lutData, point.rgb);
      console.log(`${point.desc} [${point.rgb.join(',')}] → [${lutResult.map(v => v.toFixed(3)).join(',')}]`);
      
      // アイデンティティチェック（変化なしLUTの場合）
      const isIdentity = point.rgb.every((val, i) => Math.abs(val - lutResult[i]) < 0.01);
      if (isIdentity) console.log(`  → アイデンティティ確認`);
      
      return {
        input: point.rgb,
        output: lutResult,
        description: point.desc,
        isIdentity
      };
    });
    
    return results;
  }

  /**
   * 直接的なLUT値取得（シェーダーと同じロジック）
   */
  static getLUTValue(lutData: LUTData, rgb: number[]): number[] {
    const size = lutData.size;
    const [r, g, b] = rgb.map(v => Math.max(0, Math.min(1, v)));
    
    // 座標計算
    const lutCoord = [r, g, b].map(v => v * (size - 1));
    const lutIndex = lutCoord.map(v => Math.floor(v));
    const lutFraction = lutCoord.map((v, i) => v - lutIndex[i]);
    
    // 8点サンプリング座標
    const coords = [];
    for (let z = 0; z <= 1; z++) {
      for (let y = 0; y <= 1; y++) {
        for (let x = 0; x <= 1; x++) {
          const idx = [
            Math.min(lutIndex[0] + x, size - 1),
            Math.min(lutIndex[1] + y, size - 1),
            Math.min(lutIndex[2] + z, size - 1)
          ];
          
          // 1Dインデックス計算
          const linearIndex = (idx[2] * size * size + idx[1] * size + idx[0]) * 3;
          coords.push({
            weight: (x ? lutFraction[0] : 1 - lutFraction[0]) *
                   (y ? lutFraction[1] : 1 - lutFraction[1]) *
                   (z ? lutFraction[2] : 1 - lutFraction[2]),
            rgb: [
              lutData.data[linearIndex] || 0,
              lutData.data[linearIndex + 1] || 0, 
              lutData.data[linearIndex + 2] || 0
            ]
          });
        }
      }
    }
    
    // 重み付き平均
    const result = [0, 0, 0];
    coords.forEach(coord => {
      result[0] += coord.rgb[0] * coord.weight;
      result[1] += coord.rgb[1] * coord.weight;
      result[2] += coord.rgb[2] * coord.weight;
    });
    
    return result;
  }
}

/**
 * 8bit制約の影響度測定
 */
export class TonalAnalyzer {
  static analyzeBeforeAfter(originalImageData: ImageData, lutProcessedData: ImageData, lutOpacity: number): QualityMetrics {
    const original = this.getHistogram(originalImageData);
    const processed = this.getHistogram(lutProcessedData);
    
    const toneJumps = this.detectToneJumps(processed);
    const clipping = this.detectClipping(processed);
    const smoothness = this.measureSmoothness(original, processed);
    const effectiveRange = this.getEffectiveRange(processed);
    
    const score = this.calculateQualityScore(original, processed, toneJumps, clipping);
    const level = this.getQualityLevel(score);
    const suggestions = this.generateSuggestions(toneJumps, clipping, smoothness, lutOpacity);
    
    return {
      tonalRange: effectiveRange,
      smoothness,
      artifacts: toneJumps.length + clipping,
      effectiveRange,
      score,
      level,
      suggestions
    };
  }

  private static getHistogram(imageData: ImageData): number[] {
    const histogram = new Array(256).fill(0);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // グレースケール値計算 (luminance)
      const luminance = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      histogram[luminance]++;
    }
    
    return histogram;
  }

  private static detectToneJumps(histogram: number[]): Array<{position: number, severity: number}> {
    const TONE_JUMP_THRESHOLD = histogram.length * 0.05; // 5%以上の変化に緩和
    const jumps = [];
    
    for (let i = 1; i < histogram.length - 1; i++) {
      const diff = Math.abs(histogram[i+1] - histogram[i-1]);
      if (diff > TONE_JUMP_THRESHOLD) {
        jumps.push({ position: i, severity: diff });
      }
    }
    
    return jumps.sort((a, b) => b.severity - a.severity);
  }

  private static detectClipping(histogram: number[]): number {
    // 黒つぶれ・白飛びの検出
    const blackClipping = histogram[0];
    const whiteClipping = histogram[255];
    const totalPixels = histogram.reduce((sum, count) => sum + count, 0);
    
    return (blackClipping + whiteClipping) / totalPixels;
  }

  private static measureSmoothness(original: number[], processed: number[]): number {
    // ヒストグラムの滑らかさを測定
    let originalVariation = 0;
    let processedVariation = 0;
    
    for (let i = 1; i < original.length; i++) {
      originalVariation += Math.abs(original[i] - original[i-1]);
      processedVariation += Math.abs(processed[i] - processed[i-1]);
    }
    
    return originalVariation > 0 ? 1 - (processedVariation / originalVariation) : 1;
  }

  private static getEffectiveRange(histogram: number[]): number {
    // 有効な階調範囲を計算
    const totalPixels = histogram.reduce((sum, count) => sum + count, 0);
    const threshold = totalPixels * 0.001; // 0.1%以上のピクセルがある範囲
    
    let minEffective = 0;
    let maxEffective = 255;
    
    for (let i = 0; i < histogram.length; i++) {
      if (histogram[i] > threshold) {
        minEffective = i;
        break;
      }
    }
    
    for (let i = histogram.length - 1; i >= 0; i--) {
      if (histogram[i] > threshold) {
        maxEffective = i;
        break;
      }
    }
    
    return (maxEffective - minEffective) / 255;
  }

  private static calculateQualityScore(original: number[], processed: number[], toneJumps: Array<{position: number, severity: number}>, clipping: number): number {
    let score = 100;
    
    // トーンジャンプによる減点（より緩和）
    score -= Math.min(toneJumps.length * 2, 20); // 最大20点減点
    
    // クリッピングによる減点（大幅緩和）
    score -= Math.min(clipping * 30, 25); // 最大25点減点
    
    // 極端な変化による減点（しきい値を緩和）
    const totalChange = processed.reduce((sum, val, i) => sum + Math.abs(val - original[i]), 0);
    const normalizedChange = totalChange / original.reduce((sum, val) => sum + val, 0);
    if (normalizedChange > 1.0) score -= 15; // しきい値を50%→100%に緩和
    
    return Math.max(30, Math.min(100, score)); // 最低スコアを30に設定
  }

  private static getQualityLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 85) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  }

  private static generateSuggestions(toneJumps: Array<{position: number, severity: number}>, clipping: number, smoothness: number, opacity: number): string[] {
    const suggestions = [];
    
    if (toneJumps.length > 8) {
      suggestions.push('不透明度を下げると階調の破綻を軽減できます');
    }
    
    if (clipping > 0.15) {
      suggestions.push('黒つぶれ・白飛びが発生しています。より控えめな効果をお試しください');
    }
    
    if (smoothness < 0.4) {
      suggestions.push('グラデーションが粗くなっています。JPEG品質の高い画像での処理を推奨');
    }
    
    if (opacity > 0.5) {
      suggestions.push('8bit画像では不透明度30%以下が推奨です');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('良好な品質で処理されています');
    }
    
    return suggestions;
  }
}

/**
 * JPEG品質自動検出とユーザーガイダンス
 */
export class ImageQualityDetector {
  static analyzeImageQuality(file: File, imageData: ImageData): ProcessingQuality {
    const isJpeg = file.type === 'image/jpeg';
    const compression = this.detectCompressionLevel(imageData);
    const recommendedOpacity = this.getRecommendedOpacity(isJpeg, compression);
    
    return {
      inputFormat: isJpeg ? '8bit-jpeg' : (file.type === 'image/png' ? '8bit-png' : 'unknown'),
      compression,
      recommendedOpacity,
      qualityIndicator: {
        tonalRange: this.estimateTonalRange(imageData),
        smoothness: this.estimateSmoothnessCapability(),
        artifacts: this.estimateCompressionArtifacts(imageData),
        effectiveRange: 0.8, // デフォルト値
        score: 75, // デフォルト値
        level: 'good', // デフォルト値
        suggestions: this.getInitialSuggestions(isJpeg, compression)
      }
    };
  }

  private static detectCompressionLevel(imageData: ImageData): 'high' | 'medium' | 'low' {
    const artifacts = this.detectJpegBlocks(imageData);
    const noise = this.detectCompressionNoise(imageData);
    
    if (artifacts < 0.05 && noise < 0.1) return 'high';
    if (artifacts < 0.15 && noise < 0.3) return 'medium';
    return 'low';
  }

  private static detectJpegBlocks(imageData: ImageData): number {
    // 8x8ブロックパターンの検出
    const data = imageData.data;
    const width = imageData.width;
    let blockiness = 0;
    let blockCount = 0;
    
    for (let y = 8; y < imageData.height - 8; y += 8) {
      for (let x = 8; x < width - 8; x += 8) {
        const i = (y * width + x) * 4;
        const above = ((y - 1) * width + x) * 4;
        const below = ((y + 1) * width + x) * 4;
        
        // ブロック境界での急激な変化を検出
        const diff = Math.abs(data[i] - data[above]) + Math.abs(data[i] - data[below]);
        blockiness += diff;
        blockCount++;
      }
    }
    
    return blockCount > 0 ? blockiness / (blockCount * 255 * 2) : 0;
  }

  private static detectCompressionNoise(imageData: ImageData): number {
    // 高周波ノイズの検出
    const data = imageData.data;
    const width = imageData.width;
    let noise = 0;
    let pixelCount = 0;
    
    for (let y = 1; y < imageData.height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        const left = (y * width + x - 1) * 4;
        const right = (y * width + x + 1) * 4;
        const up = ((y - 1) * width + x) * 4;
        const down = ((y + 1) * width + x) * 4;
        
        // 隣接ピクセルとの差分の分散
        const diffs = [
          Math.abs(data[i] - data[left]),
          Math.abs(data[i] - data[right]),
          Math.abs(data[i] - data[up]),
          Math.abs(data[i] - data[down])
        ];
        
        const variance = diffs.reduce((sum, diff) => sum + diff * diff, 0) / 4;
        noise += variance;
        pixelCount++;
      }
    }
    
    return pixelCount > 0 ? noise / (pixelCount * 255 * 255) : 0;
  }

  private static getRecommendedOpacity(isJpeg: boolean, compression: 'high' | 'medium' | 'low'): { min: number; max: number; optimal: number } {
    if (!isJpeg) {
      return { min: 0.2, max: 0.6, optimal: 0.4 };
    }
    
    switch (compression) {
      case 'high':
        return { min: 0.15, max: 0.4, optimal: 0.25 };
      case 'medium':
        return { min: 0.1, max: 0.3, optimal: 0.2 };
      case 'low':
        return { min: 0.05, max: 0.25, optimal: 0.15 };
    }
  }

  private static estimateTonalRange(imageData: ImageData): number {
    const histogram = new Array(256).fill(0);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const luminance = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      histogram[luminance]++;
    }
    
    // 有効範囲の計算
    const totalPixels = histogram.reduce((sum, count) => sum + count, 0);
    const threshold = totalPixels * 0.001;
    
    let usedRange = 0;
    for (let i = 0; i < 256; i++) {
      if (histogram[i] > threshold) usedRange++;
    }
    
    return usedRange / 256;
  }

  private static estimateSmoothnessCapability(): number {
    // グラデーション部分でのスムーズネス推定
    // TODO: Implement actual smoothness analysis based on gradient detection
    return 0.7; // 簡易実装
  }

  private static estimateCompressionArtifacts(imageData: ImageData): number {
    return this.detectJpegBlocks(imageData) + this.detectCompressionNoise(imageData);
  }

  private static getInitialSuggestions(isJpeg: boolean, compression: 'high' | 'medium' | 'low'): string[] {
    const suggestions = [];
    
    if (isJpeg) {
      suggestions.push('JPEG形式（8bit）での処理です');
      
      switch (compression) {
        case 'low':
          suggestions.push('圧縮率が高めです。より控えめな効果を推奨');
          break;
        case 'medium':
          suggestions.push('標準的な圧縮品質です');
          break;
        case 'high':
          suggestions.push('高品質な圧縮です。良好な結果が期待できます');
          break;
      }
    } else {
      suggestions.push('PNG形式です。JPEGより高品質な処理が期待できます');
    }
    
    suggestions.push('プラグイン版ならRAW→16bit処理で更に高品質に');
    
    return suggestions;
  }
}