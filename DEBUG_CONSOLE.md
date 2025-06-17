# GLAZE デバッグコンソール確認ガイド

## 🔍 修正が正しく動作しているかの確認方法

### 1. ブラウザのデベロッパーツールを開く

**Chrome/Edge**:
- `F12` または `Ctrl+Shift+I` (Windows)
- `Cmd+Option+I` (Mac)

**Firefox**:
- `F12` または `Ctrl+Shift+I` (Windows)
- `Cmd+Option+I` (Mac)

**Safari**:
- 開発メニューを有効化後 `Cmd+Option+I`

### 2. Consoleタブを選択

### 3. 期待されるログメッセージ

GLAZEで画像を処理する際、以下のログが表示されるはずです：

```javascript
// LUT読み込み時
LUT loaded: Anderson - Size: 64x64x64
Created 64x64x64 LUT texture (262144 pixels)

LUT loaded: Blue Sierra - Size: 64x64x64  
Created 64x64x64 LUT texture (262144 pixels)

LUT loaded: F-PRO400H - Size: 33x33x33
Created 33x33x33 LUT texture (35937 pixels)

LUT loaded: K-Ektar - Size: 64x64x64
Created 64x64x64 LUT texture (262144 pixels)

LUT loaded: Pastel Light - Size: 64x64x64
Created 64x64x64 LUT texture (262144 pixels)
```

```javascript
// LUT適用時（Anderson選択、不透明度26%の場合）
Layer 1: LUT size 64, opacity 0.26, enabled true
```

## ✅ 正常動作の確認ポイント

### 1. LUTサイズの確認
- **Anderson, Blue Sierra, K-Ektar, Pastel Light**: `64x64x64` と表示
- **F-PRO400H**: `33x33x33` と表示
- **❌ 異常**: すべて `17x17x17` と表示される場合は修正が反映されていない

### 2. テクスチャピクセル数の確認
- **64³ LUT**: `262144 pixels` (64×64×64 = 262,144)
- **33³ LUT**: `35937 pixels` (33×33×33 = 35,937)
- **❌ 異常**: `4913 pixels` (17×17×17 = 4,913) の場合は旧バージョン

### 3. 処理時のパラメータ確認
LUTレイヤーを有効にした際：
```javascript
Layer 1: LUT size 64, opacity 0.26, enabled true
```
- **LUT size**: 0以外の正しいサイズ
- **opacity**: 設定した不透明度
- **enabled**: true（有効時）

## 🚨 問題のあるログメッセージ

### 1. 古いバージョンが動作している場合
```javascript
// ❌ 問題のあるログ
LUT loaded: Anderson - Size: 17x17x17  // 間違ったサイズ
Created 17x17x17 LUT texture (4913 pixels)  // データ量が少ない
```

### 2. エラーメッセージ
```javascript
// WebGLエラー
❌ シェーダーコンパイルエラー: ...
❌ プログラムリンクエラー: ...

// LUT読み込みエラー  
⚠ Failed to load LUT Anderson: ...
```

## 🔧 トラブルシューティング

### 1. キャッシュクリア
ブラウザのキャッシュが古い場合：
- **Chrome**: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) / `Cmd+Shift+R` (Mac)
- **Safari**: `Cmd+Option+R`

### 2. ハードリフレッシュ
1. デベロッパーツールを開いた状態で
2. リロードボタンを右クリック
3. 「ハードリロード」または「キャッシュの消去とハードリロード」を選択

### 3. プライベートモード/シークレットモードでテスト
新しいプライベートウィンドウで https://lut-webapp-aalt.vercel.app/ にアクセス

## 📊 パフォーマンスモニタリング

### メモリ使用量の確認
デベロッパーツールの **Memory** タブまたは **Performance** タブで：
- **正常**: 64³ LUT × 5個 ≈ 5-10MB追加使用量
- **❌ 問題**: 100MB以上の急激な増加

### 処理時間の確認
コンソールで処理時間を測定：
```javascript
// 処理開始前
console.time('LUT Processing');

// 処理完了後
console.timeEnd('LUT Processing');
// 期待値: LUT Processing: 500-2000ms
```

## 🎯 テスト用JavaScriptコマンド

コンソールで以下のコマンドを実行してテスト：

```javascript
// 1. WebGL対応確認
console.log('WebGL2 Support:', !!document.createElement('canvas').getContext('webgl2'));

// 2. 現在のLUT状態確認（開発時のみ利用可能）
// GLAZEアプリのグローバル変数にアクセスする場合
if (window.lutProcessor) {
    console.log('LUT Processor Status:', window.lutProcessor);
}

// 3. パフォーマンステスト
performance.mark('start');
// LUT処理を実行
setTimeout(() => {
    performance.mark('end');
    performance.measure('LUT Processing', 'start', 'end');
    console.log(performance.getEntriesByType('measure'));
}, 2000);
```

## 📋 チェックリスト

テスト実行時の確認項目：

- [ ] ブラウザがWebGL2対応
- [ ] コンソールにエラーメッセージなし
- [ ] LUTサイズが正しく表示（64³, 33³）
- [ ] テクスチャピクセル数が正常
- [ ] 処理時間が2秒以内
- [ ] メモリ使用量が適正範囲
- [ ] 視覚的な色変換が自然

## 🆘 サポート

問題が解決しない場合：

1. **コンソールのログ全体をコピー**
2. **ブラウザとOSの情報を記録**
3. **具体的な操作手順を記録**
4. **スクリーンショットまたは画面録画**

これらの情報と共に開発チームに報告してください。