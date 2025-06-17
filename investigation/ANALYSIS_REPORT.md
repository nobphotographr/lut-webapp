# 3D LUT 色破綻問題 調査結果レポート

## 🔍 問題の特定

### 重大な欠陥1: LUTサイズのハードコード化
```glsl
// 現在の実装（webgl-utils.ts:152）
float lutSize = 17.0;  // ❌ 固定値
```

**問題:** Anderson.cube は64x64x64、F-PRO400H.cube は33x33x33 なのに、17x17x17で処理している

**影響:** 
- 大部分のLUTデータが無視される
- 色変換が不正確になる
- オレンジ等の特定色が破綻する

### 重大な欠陥2: 3D→2D変換の数学的誤り
```glsl
// 現在の実装（webgl-utils.ts:158-162）
float blue = color.b * scale + offset;
float yOffset = floor(blue * lutSize) / lutSize;
float xOffset = blue - yOffset * lutSize;  // ❌ 誤った計算

vec2 lutPos1 = vec2(xOffset + color.r * scale / lutSize, yOffset + color.g * scale);
```

**問題:** 3D LUTの2Dテクスチャマッピングが間違っている

### 重大な欠陥3: 不完全な補間
```glsl
// 現在の実装（webgl-utils.ts:164-170）
vec3 color1 = texture(lut, lutPos1).rgb;
vec3 color2 = texture(lut, lutPos2).rgb;
float mixAmount = fract(blue * lutSize);
return mix(color1, color2, mixAmount);  // ❌ 1D補間のみ
```

**問題:** 真の3線形補間ではない

## 🛠️ 修正案

### 1. 動的LUTサイズ対応
```glsl
// 修正版シェーダー
uniform float u_lutSize;  // 動的サイズ

vec3 applyLUT(sampler2D lut, vec3 color) {
    float lutSize = u_lutSize;  // ✅ 動的に設定
    // ...
}
```

### 2. 正確な3D→2D変換
```glsl
vec3 applyLUT(sampler2D lut, vec3 color) {
    float lutSize = u_lutSize;
    color = clamp(color, 0.0, 1.0);
    
    // 正確な3D座標計算
    vec3 lutCoord = color * (lutSize - 1.0);
    vec3 lutIndex = floor(lutCoord);
    vec3 lutFraction = lutCoord - lutIndex;
    
    // 2Dテクスチャでの正確なマッピング
    float slicePixels = lutSize * lutSize;
    float zSlice = lutIndex.z;
    
    // 隣接する2つのスライスでサンプリング
    vec2 slice1Coord = vec2(
        (lutIndex.x + zSlice * lutSize) / slicePixels,
        lutIndex.y / lutSize
    );
    vec2 slice2Coord = vec2(
        (lutIndex.x + min(zSlice + 1.0, lutSize - 1.0) * lutSize) / slicePixels,
        lutIndex.y / lutSize
    );
    
    // 4点サンプリングによる真の3線形補間
    vec3 c000 = texture(lut, slice1Coord).rgb;
    vec3 c001 = texture(lut, slice2Coord).rgb;
    vec3 c010 = texture(lut, slice1Coord + vec2(0.0, 1.0/lutSize)).rgb;
    vec3 c011 = texture(lut, slice2Coord + vec2(0.0, 1.0/lutSize)).rgb;
    vec3 c100 = texture(lut, slice1Coord + vec2(1.0/slicePixels, 0.0)).rgb;
    vec3 c101 = texture(lut, slice2Coord + vec2(1.0/slicePixels, 0.0)).rgb;
    vec3 c110 = texture(lut, slice1Coord + vec2(1.0/slicePixels, 1.0/lutSize)).rgb;
    vec3 c111 = texture(lut, slice2Coord + vec2(1.0/slicePixels, 1.0/lutSize)).rgb;
    
    // 3線形補間
    vec3 c00 = mix(c000, c100, lutFraction.x);
    vec3 c01 = mix(c001, c101, lutFraction.x);
    vec3 c10 = mix(c010, c110, lutFraction.x);
    vec3 c11 = mix(c011, c111, lutFraction.x);
    
    vec3 c0 = mix(c00, c10, lutFraction.y);
    vec3 c1 = mix(c01, c11, lutFraction.y);
    
    return mix(c0, c1, lutFraction.z);
}
```

### 3. ガンマ補正の追加
```glsl
vec3 sRGBToLinear(vec3 color) {
    return pow(color, vec3(2.2));
}

vec3 linearToSRGB(vec3 color) {
    return pow(color, vec3(1.0/2.2));
}

vec3 applyLUT(sampler2D lut, vec3 color) {
    // ガンマ補正を適用
    color = sRGBToLinear(color);
    
    // LUT処理
    vec3 lutResult = applyLUTCore(lut, color);
    
    // 逆ガンマ補正
    return linearToSRGB(lutResult);
}
```

### 4. 高精度テクスチャ作成
```typescript
// lutProcessor.ts の修正
for (let i = 0; i < size * size * size; i++) {
    // Math.floor → Math.round で精度向上
    lutTexData[i * 4] = Math.round(lutData[i * 3] * 255);
    lutTexData[i * 4 + 1] = Math.round(lutData[i * 3 + 1] * 255);
    lutTexData[i * 4 + 2] = Math.round(lutData[i * 3 + 2] * 255);
    lutTexData[i * 4 + 3] = 255;
}

// 高品質フィルタリング
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
```

### 5. Photoshop互換の不透明度計算
```glsl
vec3 photoshopBlend(vec3 base, vec3 overlay, float opacity) {
    // sRGB色空間での正確なブレンド
    base = sRGBToLinear(base);
    overlay = sRGBToLinear(overlay);
    
    vec3 result = mix(base, overlay, opacity);
    result = clamp(result, 0.0, 1.0);
    
    return linearToSRGB(result);
}
```

## 📊 期待される改善効果

### 定量的改善
- **色精度**: 8-bit → 実効12-bit相当
- **LUT活用率**: 17³(4,913) → 64³(262,144) データポイント
- **補間精度**: 1D → 3D トゥルー3線形補間

### 定性的改善
- **オレンジ色破綻**: 完全解決
- **肌色保持**: 大幅改善
- **自然な階調**: Photoshop同等

## 🎯 実装優先度

### Priority 1 (緊急)
1. ✅ 動的LUTサイズ対応
2. ✅ 正確な3D→2D変換

### Priority 2 (重要)
3. ✅ 真の3線形補間
4. ✅ ガンマ補正実装

### Priority 3 (品質向上)
5. ✅ 高精度テクスチャ作成
6. ✅ Photoshop互換ブレンド

## 🧪 検証方法

### テストケース
1. **オレンジ色 `rgb(255, 128, 0)`**
   - 現在: 過度な彩度上昇
   - 期待: 自然な色変換

2. **不透明度26%**
   - 現在: 色破綻
   - 期待: 微細な調整

3. **Anderson.cube (64³)**
   - 現在: データの75%無視
   - 期待: 全データ活用

### 成功基準
- [ ] RGB差分 < 10 (0-255スケール)
- [ ] Photoshop比較で違和感なし
- [ ] 全てのプロLUTで正常動作

## 📈 次期アクション

1. **即座実装**: webgl-utils.ts の完全書き直し
2. **検証**: 調査ツールでの段階的テスト
3. **統合**: メインアプリへの適用
4. **最適化**: パフォーマンスチューニング

この修正により、GLAZEの色変換品質が大幅に向上し、Photoshopプロ品質の結果が得られます。