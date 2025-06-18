const fs = require('fs');
const path = require('path');

// LUTパーサー（簡易版）
function parseLUTFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let lutSize = 17;
  const lutData = [];
  
  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('//')) continue;
    
    if (line.startsWith('LUT_3D_SIZE')) {
      const sizeMatch = line.match(/LUT_3D_SIZE\s+(\d+)/);
      if (sizeMatch) {
        lutSize = parseInt(sizeMatch[1]);
      }
      continue;
    }
    
    if (line.includes('TITLE') || line.includes('DOMAIN_MIN') || line.includes('DOMAIN_MAX')) {
      continue;
    }
    
    const values = line.split(/\s+/).filter(val => val.length > 0);
    if (values.length === 3) {
      const r = parseFloat(values[0]);
      const g = parseFloat(values[1]);
      const b = parseFloat(values[2]);
      
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        lutData.push(r, g, b);
      }
    }
  }
  
  console.log(`LUT ${path.basename(filePath)}:`);
  console.log(`  サイズ: ${lutSize}³`);
  console.log(`  期待データ数: ${lutSize * lutSize * lutSize * 3}`);
  console.log(`  実データ数: ${lutData.length}`);
  console.log(`  カバレッジ: ${(lutData.length / (lutSize * lutSize * lutSize * 3) * 100).toFixed(2)}%`);
  
  return { size: lutSize, data: lutData };
}

// LUT値取得（JavaScript実装）
function getLUTValue(lutData, rgb) {
  const size = lutData.size;
  const data = lutData.data;
  const [r, g, b] = rgb.map(v => Math.max(0, Math.min(1, v)));
  
  // 座標計算
  const lutCoord = [r, g, b].map(v => v * (size - 1));
  const lutIndex = lutCoord.map(v => Math.floor(v));
  const lutFraction = lutCoord.map((v, i) => v - lutIndex[i]);
  
  console.log(`\n入力色: rgb(${rgb.map(v => Math.round(v * 255)).join(', ')})`);
  console.log(`LUT座標: [${lutCoord.map(v => v.toFixed(3)).join(', ')}]`);
  console.log(`インデックス: [${lutIndex.join(', ')}]`);
  console.log(`小数部分: [${lutFraction.map(v => v.toFixed(3)).join(', ')}]`);
  
  // 8点サンプリング
  const coords = [];
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
        
        if (linearIndex + 2 < data.length) {
          coords.push({
            weight,
            rgb: [data[linearIndex], data[linearIndex + 1], data[linearIndex + 2]],
            idx: `[${idx.join(',')}]`,
            linearIndex
          });
        }
      }
    }
  }
  
  // 重み付き平均
  const result = [0, 0, 0];
  let totalWeight = 0;
  coords.forEach(coord => {
    result[0] += coord.rgb[0] * coord.weight;
    result[1] += coord.rgb[1] * coord.weight;
    result[2] += coord.rgb[2] * coord.weight;
    totalWeight += coord.weight;
  });
  
  console.log(`\n8点サンプリング:`);
  coords.forEach((coord, i) => {
    console.log(`  点${i}: ${coord.idx} 重み:${coord.weight.toFixed(4)} RGB:[${coord.rgb.map(v => v.toFixed(4)).join(',')}] idx:${coord.linearIndex}`);
  });
  console.log(`重み合計: ${totalWeight.toFixed(6)}`);
  console.log(`最終結果: rgb(${result.map(v => Math.round(v * 255)).join(', ')})`);
  
  return result;
}

// テスト実行
console.log('🔍 LUT精度検証テスト開始\n');

const lutFiles = [
  'public/luts/Anderson.cube',
  'public/luts/Blue sierra.cube',
  'public/luts/F-PRO400H.cube'
];

for (const lutFile of lutFiles) {
  console.log('='.repeat(50));
  const lutData = parseLUTFile(lutFile);
  
  if (lutData.data.length > 0) {
    // オレンジ色でのテスト
    getLUTValue(lutData, [1, 0.5, 0]);
    
    // 中間グレーでのテスト
    getLUTValue(lutData, [0.5, 0.5, 0.5]);
    
    // アイデンティティチェック（黒）
    const blackResult = getLUTValue(lutData, [0, 0, 0]);
    console.log(`\n黒(0,0,0)の結果: rgb(${blackResult.map(v => Math.round(v * 255)).join(', ')})`);
    
    // アイデンティティチェック（白）
    const whiteResult = getLUTValue(lutData, [1, 1, 1]);
    console.log(`白(1,1,1)の結果: rgb(${whiteResult.map(v => Math.round(v * 255)).join(', ')})`);
  }
  
  console.log('\n');
}

console.log('✅ テスト完了');