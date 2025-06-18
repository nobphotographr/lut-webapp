/**
 * LUT適用の正確性を詳細に検証するためのツール
 */

import { LUTData } from './types';
import { LUTParser } from './lut-parser';
import { LUTDataValidator } from './lut-validator';

export class LUTAccuracyTester {
  /**
   * 特定の色でのLUT変換結果を詳細に分析
   */
  static async testColorAccuracy(lutName: string, lutFile: string, testColor: [number, number, number]): Promise<void> {
    console.log(`\n🔍 LUT変換精度テスト: ${lutName}`);
    console.log(`テスト色: rgb(${testColor.map(v => Math.round(v * 255)).join(', ')})`);
    
    try {
      // LUTデータを読み込み
      const lutData = await LUTParser.loadLUTFromURL(lutFile);
      console.log(`✅ LUT読み込み成功: ${lutData.size}³ (${lutData.data.length / 3} points)`);
      
      // JavaScript実装での変換結果
      const jsResult = LUTDataValidator.getLUTValue(lutData, testColor);
      console.log(`JS実装結果: rgb(${jsResult.map(v => Math.round(v * 255)).join(', ')})`);
      
      // 座標計算の詳細検証
      this.detailCoordinateCalculation(lutData, testColor);
      
      // 周辺8点のサンプリング検証
      this.verify8PointSampling(lutData, testColor);
      
      // 期待値との比較
      this.compareWithExpected(lutName, testColor, jsResult as [number, number, number]);
      
    } catch (error) {
      console.error(`❌ テストエラー: ${error}`);
    }
  }

  /**
   * 座標計算の詳細検証
   */
  private static detailCoordinateCalculation(lutData: LUTData, color: [number, number, number]): void {
    const size = lutData.size;
    const [r, g, b] = color;
    
    console.log(`\n📐 座標計算詳細:`);
    console.log(`LUTサイズ: ${size}`);
    console.log(`入力色: [${r}, ${g}, ${b}]`);
    
    // ステップ1: LUT座標計算
    const lutCoord = [r * (size - 1), g * (size - 1), b * (size - 1)];
    console.log(`LUT座標: [${lutCoord.map(v => v.toFixed(3)).join(', ')}]`);
    
    // ステップ2: インデックスと小数部分
    const lutIndex = lutCoord.map(v => Math.floor(v));
    const lutFraction = lutCoord.map((v, i) => v - lutIndex[i]);
    console.log(`インデックス: [${lutIndex.join(', ')}]`);
    console.log(`小数部分: [${lutFraction.map(v => v.toFixed(3)).join(', ')}]`);
    
    // ステップ3: 2Dテクスチャ座標
    const textureWidth = size * size;
    const textureHeight = size;
    
    const slice0 = lutIndex[2];
    const slice1 = Math.min(slice0 + 1, size - 1);
    
    console.log(`Zスライス: ${slice0}, ${slice1}`);
    
    // スライス0の座標
    const slice0X = (lutIndex[0] + slice0 * size) / textureWidth;
    const slice0Y = lutIndex[1] / textureHeight;
    console.log(`スライス0座標: (${slice0X.toFixed(4)}, ${slice0Y.toFixed(4)})`);
    
    // スライス1の座標
    const slice1X = (lutIndex[0] + slice1 * size) / textureWidth;
    const slice1Y = lutIndex[1] / textureHeight;
    console.log(`スライス1座標: (${slice1X.toFixed(4)}, ${slice1Y.toFixed(4)})`);
  }

  /**
   * 8点サンプリングの検証
   */
  private static verify8PointSampling(lutData: LUTData, color: [number, number, number]): void {
    const size = lutData.size;
    const [r, g, b] = color;
    
    console.log(`\n🎯 8点サンプリング検証:`);
    
    const lutCoord = [r * (size - 1), g * (size - 1), b * (size - 1)];
    const lutIndex = lutCoord.map(v => Math.floor(v));
    const lutFraction = lutCoord.map((v, i) => v - lutIndex[i]);
    
    // 8点の座標とその値を取得
    const points = [];
    for (let z = 0; z <= 1; z++) {
      for (let y = 0; y <= 1; y++) {
        for (let x = 0; x <= 1; x++) {
          const idx = [
            Math.min(lutIndex[0] + x, size - 1),
            Math.min(lutIndex[1] + y, size - 1),
            Math.min(lutIndex[2] + z, size - 1)
          ];
          
          const linearIndex = (idx[2] * size * size + idx[1] * size + idx[0]) * 3;
          const weight = 
            (x ? lutFraction[0] : 1 - lutFraction[0]) *
            (y ? lutFraction[1] : 1 - lutFraction[1]) *
            (z ? lutFraction[2] : 1 - lutFraction[2]);
          
          const rgb = [
            lutData.data[linearIndex] || 0,
            lutData.data[linearIndex + 1] || 0,
            lutData.data[linearIndex + 2] || 0
          ];
          
          points.push({
            coord: `[${idx.join(',')}]`,
            weight: weight.toFixed(4),
            rgb: rgb.map(v => v.toFixed(4)).join(','),
            linearIndex
          });
        }
      }
    }
    
    points.forEach((point, i) => {
      console.log(`点${i}: ${point.coord} 重み:${point.weight} RGB:[${point.rgb}] idx:${point.linearIndex}`);
    });
    
    // 重み付き平均の計算
    const result = [0, 0, 0];
    let totalWeight = 0;
    points.forEach(point => {
      const weight = parseFloat(point.weight);
      const rgb = point.rgb.split(',').map(v => parseFloat(v));
      result[0] += rgb[0] * weight;
      result[1] += rgb[1] * weight;
      result[2] += rgb[2] * weight;
      totalWeight += weight;
    });
    
    console.log(`重み合計: ${totalWeight.toFixed(6)} (理想値: 1.000000)`);
    console.log(`最終結果: rgb(${result.map(v => Math.round(v * 255)).join(', ')})`);
  }

  /**
   * 期待値との比較（各LUTの特性に基づく）
   */
  private static compareWithExpected(lutName: string, input: [number, number, number], output: [number, number, number]): void {
    console.log(`\n📊 期待値比較:`);
    
    const inputRGB = input.map(v => Math.round(v * 255));
    const outputRGB = output.map(v => Math.round(v * 255));
    const diff = output.map((v, i) => v - input[i]);
    
    console.log(`入力: rgb(${inputRGB.join(', ')})`);
    console.log(`出力: rgb(${outputRGB.join(', ')})`);
    console.log(`差分: [${diff.map(v => v.toFixed(4)).join(', ')}]`);
    
    // LUT特性の分析
    this.analyzeLUTCharacteristics(lutName, input, output);
  }

  /**
   * LUT特性の分析
   */
  private static analyzeLUTCharacteristics(lutName: string, input: [number, number, number], output: [number, number, number]): void {
    const [rIn, gIn, bIn] = input;
    const [rOut, gOut, bOut] = output;
    
    // 明度変化の分析
    const luminanceIn = 0.299 * rIn + 0.587 * gIn + 0.114 * bIn;
    const luminanceOut = 0.299 * rOut + 0.587 * gOut + 0.114 * bOut;
    const luminanceChange = luminanceOut - luminanceIn;
    
    // 彩度変化の分析
    const saturationIn = Math.max(rIn, gIn, bIn) - Math.min(rIn, gIn, bIn);
    const saturationOut = Math.max(rOut, gOut, bOut) - Math.min(rOut, gOut, bOut);
    const saturationChange = saturationOut - saturationIn;
    
    console.log(`\n🎨 ${lutName}の特性分析:`);
    console.log(`明度変化: ${(luminanceChange * 100).toFixed(1)}% (${luminanceIn.toFixed(3)} → ${luminanceOut.toFixed(3)})`);
    console.log(`彩度変化: ${(saturationChange * 100).toFixed(1)}% (${saturationIn.toFixed(3)} → ${saturationOut.toFixed(3)})`);
    
    // 色相シフトの分析
    this.analyzeColorShift(input, output);
  }

  /**
   * 色相シフトの分析
   */
  private static analyzeColorShift(input: [number, number, number], output: [number, number, number]): void {
    const [rIn, gIn, bIn] = input;
    const [rOut, gOut, bOut] = output;
    
    // RGB各チャンネルの変化率
    const rChange = rIn > 0 ? (rOut - rIn) / rIn : 0;
    const gChange = gIn > 0 ? (gOut - gIn) / gIn : 0;
    const bChange = bIn > 0 ? (bOut - bIn) / bIn : 0;
    
    console.log(`チャンネル別変化率:`);
    console.log(`  R: ${(rChange * 100).toFixed(1)}%`);
    console.log(`  G: ${(gChange * 100).toFixed(1)}%`);
    console.log(`  B: ${(bChange * 100).toFixed(1)}%`);
    
    // 温度感の変化（赤-青バランス）
    const warmthIn = rIn - bIn;
    const warmthOut = rOut - bOut;
    const warmthChange = warmthOut - warmthIn;
    
    console.log(`温度感変化: ${(warmthChange * 100).toFixed(1)}% (${warmthChange > 0 ? '暖色寄り' : '寒色寄り'})`);
  }

  /**
   * 複数の代表色でのバッチテスト
   */
  static async runBatchColorTest(lutName: string, lutFile: string): Promise<void> {
    console.log(`\n🧪 ${lutName} バッチカラーテスト開始`);
    
    const testColors: Array<{name: string, rgb: [number, number, number]}> = [
      { name: '純黒', rgb: [0, 0, 0] },
      { name: '純白', rgb: [1, 1, 1] },
      { name: '中間グレー', rgb: [0.5, 0.5, 0.5] },
      { name: '純赤', rgb: [1, 0, 0] },
      { name: '純緑', rgb: [0, 1, 0] },
      { name: '純青', rgb: [0, 0, 1] },
      { name: 'オレンジ', rgb: [1, 0.5, 0] },
      { name: '肌色', rgb: [0.92, 0.78, 0.67] },
      { name: '空色', rgb: [0.53, 0.81, 0.98] },
      { name: '芝生色', rgb: [0.13, 0.55, 0.13] }
    ];
    
    try {
      const lutData = await LUTParser.loadLUTFromURL(lutFile);
      
      console.log(`\n📋 ${lutName} 変換結果一覧:`);
      console.log('色名\t\t入力RGB\t\t\t出力RGB\t\t\t差分');
      console.log('─'.repeat(70));
      
      for (const testColor of testColors) {
        const result = LUTDataValidator.getLUTValue(lutData, testColor.rgb);
        const inputRGB = testColor.rgb.map(v => Math.round(v * 255));
        const outputRGB = result.map(v => Math.round(v * 255));
        const diff = result.map((v, i) => ((v - testColor.rgb[i]) * 255).toFixed(0));
        
        console.log(`${testColor.name.padEnd(8)}\t(${inputRGB.join(',').padEnd(9)})\t\t(${outputRGB.join(',').padEnd(9)})\t\t(${diff.join(',').padEnd(9)})`);
      }
      
    } catch (error) {
      console.error(`❌ バッチテストエラー: ${error}`);
    }
  }

  /**
   * アイデンティティLUTとの比較
   */
  static async compareWithIdentity(lutName: string, lutFile: string): Promise<void> {
    console.log(`\n🔍 ${lutName} vs アイデンティティLUT比較`);
    
    try {
      const lutData = await LUTParser.loadLUTFromURL(lutFile);
      const identityLUT = LUTParser.createIdentityLUT(lutData.size);
      
      const testColor: [number, number, number] = [0.5, 0.5, 0.5]; // 中間グレー
      
      const lutResult = LUTDataValidator.getLUTValue(lutData, testColor);
      const identityResult = LUTDataValidator.getLUTValue(identityLUT, testColor);
      
      console.log(`テスト色: rgb(${testColor.map(v => Math.round(v * 255)).join(', ')})`);
      console.log(`${lutName}結果: rgb(${lutResult.map(v => Math.round(v * 255)).join(', ')})`);
      console.log(`アイデンティティ: rgb(${identityResult.map(v => Math.round(v * 255)).join(', ')})`);
      
      const difference = lutResult.map((v, i) => v - identityResult[i]);
      console.log(`差分: [${difference.map(v => (v * 255).toFixed(1)).join(', ')}]`);
      
      if (difference.every(d => Math.abs(d) < 0.01)) {
        console.log(`⚠️  警告: ${lutName}がアイデンティティLUTとほぼ同じです`);
      } else {
        console.log(`✅ ${lutName}は正常に色変換を行っています`);
      }
      
    } catch (error) {
      console.error(`❌ 比較エラー: ${error}`);
    }
  }
}

/**
 * WebGL座標計算の検証
 */
export class WebGLCoordinateValidator {
  /**
   * シェーダー内座標計算をJavaScriptで再現
   */
  static simulateShaderCoordinates(lutSize: number, inputColor: [number, number, number]): void {
    console.log(`\n🖥️  WebGL座標計算シミュレーション`);
    console.log(`LUTサイズ: ${lutSize}, 入力色: [${inputColor.join(', ')}]`);
    
    const [r, g, b] = inputColor;
    
    // Step 1: WebGLシェーダーと同じ計算
    const lutCoord = [r * (lutSize - 1), g * (lutSize - 1), b * (lutSize - 1)];
    const lutIndex = lutCoord.map(v => Math.floor(v));
    const lutFraction = lutCoord.map((v, i) => v - lutIndex[i]);
    
    console.log(`lutCoord: [${lutCoord.map(v => v.toFixed(6)).join(', ')}]`);
    console.log(`lutIndex: [${lutIndex.join(', ')}]`);
    console.log(`lutFraction: [${lutFraction.map(v => v.toFixed(6)).join(', ')}]`);
    
    // Step 2: 2Dテクスチャマッピング
    const sliceSize = lutSize;
    const zSlice = lutIndex[2];
    
    const slice1Coord = [
      (lutIndex[0] + zSlice * sliceSize) / (sliceSize * sliceSize),
      lutIndex[1] / sliceSize
    ];
    
    const slice2Coord = [
      (lutIndex[0] + Math.min(zSlice + 1, lutSize - 1) * sliceSize) / (sliceSize * sliceSize),
      lutIndex[1] / sliceSize
    ];
    
    console.log(`slice1Coord: [${slice1Coord.map(v => v.toFixed(6)).join(', ')}]`);
    console.log(`slice2Coord: [${slice2Coord.map(v => v.toFixed(6)).join(', ')}]`);
    
    // Step 3: テクセルサイズとオフセット
    const texelSize = [1.0 / (sliceSize * sliceSize), 1.0 / sliceSize];
    console.log(`texelSize: [${texelSize.map(v => v.toFixed(6)).join(', ')}]`);
    
    // Step 4: 隣接点の座標
    const coordinates = {
      slice1: slice1Coord.map(v => v + texelSize[0] * 0.5),
      slice1_x: [slice1Coord[0] + texelSize[0] + texelSize[0] * 0.5, slice1Coord[1] + texelSize[1] * 0.5],
      slice1_y: [slice1Coord[0] + texelSize[0] * 0.5, slice1Coord[1] + texelSize[1] + texelSize[1] * 0.5],
      slice1_xy: [slice1Coord[0] + texelSize[0] + texelSize[0] * 0.5, slice1Coord[1] + texelSize[1] + texelSize[1] * 0.5]
    };
    
    console.log(`\n📍 サンプリング座標:`);
    Object.entries(coordinates).forEach(([name, coord]) => {
      console.log(`${name}: [${coord.map(v => v.toFixed(6)).join(', ')}]`);
    });
  }

  /**
   * 境界条件のテスト
   */
  static testBoundaryConditions(lutSize: number): void {
    console.log(`\n🔬 境界条件テスト (LUTサイズ: ${lutSize})`);
    
    const boundaryColors: Array<{name: string, rgb: [number, number, number]}> = [
      { name: '最小値', rgb: [0, 0, 0] },
      { name: '最大値', rgb: [1, 1, 1] },
      { name: '境界近傍1', rgb: [0.001, 0.001, 0.001] },
      { name: '境界近傍2', rgb: [0.999, 0.999, 0.999] },
      { name: 'ステップ境界', rgb: [1/(lutSize-1), 1/(lutSize-1), 1/(lutSize-1)] }
    ];
    
    boundaryColors.forEach(test => {
      console.log(`\n${test.name}: [${test.rgb.join(', ')}]`);
      this.simulateShaderCoordinates(lutSize, test.rgb);
    });
  }
}