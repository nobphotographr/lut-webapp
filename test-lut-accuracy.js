/**
 * LUT精度テスト用スクリプト（ブラウザコンソールで実行）
 */

// グローバル関数として定義
window.testLUTAccuracy = async function() {
  console.log('🔍 LUT精度テスト開始');
  
  // 動的インポート
  const { LUTAccuracyTester } = await import('/src/lib/lut-debug-tools.ts');
  const { LUT_PRESETS } = await import('/src/lib/constants.ts');
  
  // 各LUTをテスト
  for (const preset of LUT_PRESETS) {
    if (!preset.file) continue;
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎨 ${preset.name} テスト開始`);
    console.log(`${'='.repeat(50)}`);
    
    // オレンジ色でのテスト（問題色として）
    await LUTAccuracyTester.testColorAccuracy(preset.name, preset.file, [1, 0.5, 0]);
    
    // バッチテスト
    await LUTAccuracyTester.runBatchColorTest(preset.name, preset.file);
    
    // アイデンティティとの比較
    await LUTAccuracyTester.compareWithIdentity(preset.name, preset.file);
  }
  
  console.log('\n✅ 全LUTテスト完了');
};

// WebGL座標計算テスト
window.testWebGLCoordinates = function() {
  console.log('🖥️ WebGL座標計算テスト');
  
  import('/src/lib/lut-debug-tools.ts').then(({ WebGLCoordinateValidator }) => {
    // 64サイズLUTでのテスト
    WebGLCoordinateValidator.simulateShaderCoordinates(64, [1, 0.5, 0]);
    WebGLCoordinateValidator.testBoundaryConditions(64);
    
    // 17サイズLUTでの比較
    console.log('\n' + '='.repeat(30));
    WebGLCoordinateValidator.simulateShaderCoordinates(17, [1, 0.5, 0]);
  });
};

// 特定色での詳細テスト
window.testSpecificColor = async function(r, g, b, lutName = 'Anderson') {
  console.log(`🎯 特定色テスト: rgb(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}) with ${lutName}`);
  
  const { LUTAccuracyTester } = await import('/src/lib/lut-debug-tools.ts');
  const { LUT_PRESETS } = await import('/src/lib/constants.ts');
  
  const preset = LUT_PRESETS.find(p => p.name === lutName);
  if (!preset || !preset.file) {
    console.error(`LUT ${lutName} が見つかりません`);
    return;
  }
  
  await LUTAccuracyTester.testColorAccuracy(lutName, preset.file, [r, g, b]);
};

console.log(`
🛠️ LUT精度テストツールが読み込まれました。

使用方法:
- testLUTAccuracy()      : 全LUTの精度テスト
- testWebGLCoordinates() : WebGL座標計算テスト  
- testSpecificColor(r,g,b,lutName) : 特定色テスト

例:
testSpecificColor(1, 0.5, 0, 'Anderson') // オレンジ色をAndersonで変換
testSpecificColor(0.9, 0.8, 0.7, 'Blue sierra') // 肌色をBlue sierraで変換
`);