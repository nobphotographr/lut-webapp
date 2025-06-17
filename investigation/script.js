// 3D LUT 色破綻問題 調査ツール
class LUTInvestigator {
    constructor() {
        this.gl = null;
        this.program = null;
        this.lutTexture = null;
        this.imageTexture = null;
        this.currentImage = null;
        this.currentLUT = null;
        this.debugLog = [];
        
        this.initWebGL();
        this.setupEventListeners();
        
        this.log("=== 3D LUT 調査ツール 初期化完了 ===");
    }
    
    initWebGL() {
        const canvas = document.getElementById('processedCanvas');
        this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (!this.gl) {
            this.log("❌ WebGL2/WebGL not supported");
            return;
        }
        
        this.log("✅ WebGL 初期化完了");
        this.createShaderProgram();
    }
    
    createShaderProgram() {
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;
        
        // 複数バージョンのフラグメントシェーダーを用意
        this.fragmentShaderBasic = `
            precision mediump float;
            uniform sampler2D u_image;
            uniform sampler2D u_lut;
            uniform float u_opacity;
            uniform float u_opacityScale;
            uniform bool u_gammaCorrection;
            uniform bool u_highPrecision;
            varying vec2 v_texCoord;
            
            vec3 sRGBToLinear(vec3 color) {
                return pow(color, vec3(2.2));
            }
            
            vec3 linearToSRGB(vec3 color) {
                return pow(color, vec3(1.0/2.2));
            }
            
            vec3 applyLUT(sampler2D lut, vec3 color) {
                float lutSize = 17.0;
                float scale = (lutSize - 1.0) / lutSize;
                float offset = 1.0 / (2.0 * lutSize);
                
                // ガンマ補正の適用
                if (u_gammaCorrection) {
                    color = sRGBToLinear(color);
                }
                
                color = clamp(color, 0.0, 1.0);
                
                float blue = color.b * scale + offset;
                float yOffset = floor(blue * lutSize) / lutSize;
                float xOffset = blue - yOffset * lutSize;
                
                vec2 lutPos1 = vec2(xOffset + color.r * scale / lutSize, yOffset + color.g * scale);
                vec2 lutPos2 = vec2(xOffset + color.r * scale / lutSize, yOffset + 1.0/lutSize + color.g * scale);
                
                vec3 color1 = texture2D(lut, lutPos1).rgb;
                vec3 color2 = texture2D(lut, lutPos2).rgb;
                
                float mixAmount = fract(blue * lutSize);
                vec3 lutResult = mix(color1, color2, mixAmount);
                
                if (u_gammaCorrection) {
                    lutResult = linearToSRGB(lutResult);
                }
                
                return lutResult;
            }
            
            void main() {
                vec3 originalColor = texture2D(u_image, v_texCoord).rgb;
                vec3 lutColor = applyLUT(u_lut, originalColor);
                
                // スケーリング係数を適用した不透明度
                float scaledOpacity = u_opacity * u_opacityScale;
                
                vec3 finalColor = mix(originalColor, lutColor, scaledOpacity);
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `;
        
        this.program = this.createProgram(vertexShaderSource, this.fragmentShaderBasic);
        
        if (this.program) {
            this.log("✅ シェーダープログラム作成完了");
            this.setupGeometry();
        }
    }
    
    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            this.log("❌ シェーダーコンパイルエラー: " + this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createProgram(vertexSource, fragmentSource) {
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        
        if (!vertexShader || !fragmentShader) return null;
        
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            this.log("❌ プログラムリンクエラー: " + this.gl.getProgramInfoLog(program));
            return null;
        }
        
        return program;
    }
    
    setupGeometry() {
        const vertices = new Float32Array([
            -1, -1,  0, 1,
             1, -1,  1, 1,
            -1,  1,  0, 0,
             1,  1,  1, 0
        ]);
        
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        
        this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
        this.texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
        
        this.gl.enableVertexAttribArray(this.positionLocation);
        this.gl.enableVertexAttribArray(this.texCoordLocation);
        
        this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 16, 0);
        this.gl.vertexAttribPointer(this.texCoordLocation, 2, this.gl.FLOAT, false, 16, 8);
    }
    
    loadTestImage() {
        // テスト用グラデーション画像を生成
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        
        // カラフルなテストパターンを作成
        const imageData = ctx.createImageData(400, 300);
        const data = imageData.data;
        
        for (let y = 0; y < 300; y++) {
            for (let x = 0; x < 400; x++) {
                const i = (y * 400 + x) * 4;
                
                // グラデーションパターン
                const r = Math.floor((x / 400) * 255);
                const g = Math.floor((y / 300) * 255);
                const b = Math.floor(((x + y) / 700) * 255);
                
                data[i] = r;     // Red
                data[i + 1] = g; // Green
                data[i + 2] = b; // Blue
                data[i + 3] = 255; // Alpha
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.updateOriginalCanvas();
            this.log("✅ テスト画像生成完了: " + img.width + "x" + img.height);
        };
        img.src = canvas.toDataURL();
    }
    
    loadTestLUT() {
        // 簡単なオレンジ強調LUTを生成
        const lutSize = 17;
        const lutData = new Float32Array(lutSize * lutSize * lutSize * 3);
        
        let index = 0;
        for (let b = 0; b < lutSize; b++) {
            for (let g = 0; g < lutSize; g++) {
                for (let r = 0; r < lutSize; r++) {
                    const rNorm = r / (lutSize - 1);
                    const gNorm = g / (lutSize - 1);
                    const bNorm = b / (lutSize - 1);
                    
                    // オレンジを強調するLUT
                    let rOut = rNorm;
                    let gOut = gNorm;
                    let bOut = bNorm;
                    
                    // オレンジ領域（R=1, G=0.5, B=0付近）を強調
                    if (rNorm > 0.7 && gNorm > 0.3 && gNorm < 0.7 && bNorm < 0.3) {
                        rOut = Math.min(1.0, rNorm * 1.3);
                        gOut = Math.min(1.0, gNorm * 1.2);
                        bOut = bNorm * 0.8;
                    }
                    
                    lutData[index++] = rOut;
                    lutData[index++] = gOut;
                    lutData[index++] = bOut;
                }
            }
        }
        
        this.currentLUT = { size: lutSize, data: lutData };
        this.createLUTTexture();
        this.log("✅ テストLUT生成完了: オレンジ強調LUT (" + lutSize + "x" + lutSize + "x" + lutSize + ")");
    }
    
    createLUTTexture() {
        if (!this.currentLUT) return;
        
        const { size, data } = this.currentLUT;
        
        // 3D LUTを2Dテクスチャとして格納
        const lutTexData = new Uint8Array(size * size * size * 4);
        for (let i = 0; i < size * size * size; i++) {
            lutTexData[i * 4] = Math.floor(data[i * 3] * 255);     // R
            lutTexData[i * 4 + 1] = Math.floor(data[i * 3 + 1] * 255); // G
            lutTexData[i * 4 + 2] = Math.floor(data[i * 3 + 2] * 255); // B
            lutTexData[i * 4 + 3] = 255; // A
        }
        
        this.lutTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.lutTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, size * size, size, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, lutTexData);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    }
    
    updateOriginalCanvas() {
        if (!this.currentImage) return;
        
        const canvas = document.getElementById('originalCanvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.currentImage.width;
        canvas.height = this.currentImage.height;
        
        ctx.drawImage(this.currentImage, 0, 0);
    }
    
    processImage() {
        if (!this.currentImage || !this.currentLUT || !this.program) return;
        
        this.gl.useProgram(this.program);
        
        // 画像テクスチャを作成
        if (!this.imageTexture) {
            this.imageTexture = this.gl.createTexture();
        }
        
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.imageTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.currentImage);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        
        // パラメータを設定
        const opacity = parseFloat(document.getElementById('opacity').value) / 100;
        const opacityScale = parseFloat(document.getElementById('opacityScale').value);
        const gammaCorrection = document.getElementById('gammaCorrection').checked;
        const highPrecision = document.getElementById('highPrecision').checked;
        
        // ユニフォーム設定
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.imageTexture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'u_image'), 0);
        
        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.lutTexture);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'u_lut'), 1);
        
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'u_opacity'), opacity);
        this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'u_opacityScale'), opacityScale);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'u_gammaCorrection'), gammaCorrection);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'u_highPrecision'), highPrecision);
        
        // キャンバスサイズ設定
        const canvas = document.getElementById('processedCanvas');
        canvas.width = this.currentImage.width;
        canvas.height = this.currentImage.height;
        this.gl.viewport(0, 0, canvas.width, canvas.height);
        
        // 描画
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        
        // デバッグログ
        this.log(`🎨 画像処理実行:
  不透明度: ${opacity * 100}%
  スケーリング係数: ${opacityScale}
  実効不透明度: ${(opacity * opacityScale * 100).toFixed(1)}%
  ガンマ補正: ${gammaCorrection ? '有効' : '無効'}
  高精度補間: ${highPrecision ? '有効' : '無効'}`);
    }
    
    testColor(rgb) {
        const [r, g, b] = rgb;
        
        // CPU側でLUT変換をシミュレーション
        const lutResult = this.simulateLUTTransform(r, g, b);
        const opacity = parseFloat(document.getElementById('opacity').value) / 100;
        const opacityScale = parseFloat(document.getElementById('opacityScale').value);
        const effectiveOpacity = opacity * opacityScale;
        
        const finalR = r + (lutResult.r - r) * effectiveOpacity;
        const finalG = g + (lutResult.g - g) * effectiveOpacity;
        const finalB = b + (lutResult.b - b) * effectiveOpacity;
        
        const result = `
🎨 色変換テスト結果:
  入力 RGB: (${r.toFixed(3)}, ${g.toFixed(3)}, ${b.toFixed(3)})
  LUT結果: (${lutResult.r.toFixed(3)}, ${lutResult.g.toFixed(3)}, ${lutResult.b.toFixed(3)})
  最終結果: (${finalR.toFixed(3)}, ${finalG.toFixed(3)}, ${finalB.toFixed(3)})
  
  色差: R=${((finalR - r) * 255).toFixed(0)}, G=${((finalG - g) * 255).toFixed(0)}, B=${((finalB - b) * 255).toFixed(0)}
  実効不透明度: ${(effectiveOpacity * 100).toFixed(1)}%`;
        
        document.getElementById('colorTestResult').textContent = result;
        this.log(result);
    }
    
    simulateLUTTransform(r, g, b) {
        if (!this.currentLUT) return { r, g, b };
        
        const lutSize = this.currentLUT.size;
        const scale = (lutSize - 1) / lutSize;
        const offset = 1 / (2 * lutSize);
        
        // LUT座標計算
        const lutR = Math.min(lutSize - 1, Math.floor(r * scale * lutSize));
        const lutG = Math.min(lutSize - 1, Math.floor(g * scale * lutSize));
        const lutB = Math.min(lutSize - 1, Math.floor(b * scale * lutSize));
        
        const index = (lutB * lutSize * lutSize + lutG * lutSize + lutR) * 3;
        
        return {
            r: this.currentLUT.data[index],
            g: this.currentLUT.data[index + 1],
            b: this.currentLUT.data[index + 2]
        };
    }
    
    log(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;
        this.debugLog.push(logEntry);
        
        const debugOutput = document.getElementById('debugOutput');
        debugOutput.textContent = this.debugLog.slice(-50).join('\n');
        debugOutput.scrollTop = debugOutput.scrollHeight;
    }
    
    setupEventListeners() {
        document.getElementById('imageFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        this.currentImage = img;
                        this.updateOriginalCanvas();
                        this.processImage();
                        this.log("✅ 画像読み込み完了: " + file.name);
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
        
        document.getElementById('lutFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.parseCubeFile(e.target.result);
                    this.log("✅ LUT読み込み完了: " + file.name);
                };
                reader.readAsText(file);
            }
        });
    }
    
    parseCubeFile(cubeData) {
        this.log("=== CUBE ファイル解析開始 ===");
        
        const lines = cubeData.split('\n');
        let lutSize = 17;
        const lutData = [];
        
        lines.forEach((line, index) => {
            line = line.trim();
            if (line.startsWith('LUT_3D_SIZE')) {
                lutSize = parseInt(line.split(/\s+/)[1]);
                this.log(`LUT Size: ${lutSize}`);
            } else if (!line.startsWith('#') && line && !line.startsWith('TITLE') && !line.startsWith('DOMAIN_')) {
                const values = line.split(/\s+/).map(parseFloat);
                if (values.length === 3 && values.every(v => !isNaN(v))) {
                    lutData.push(...values);
                    if (index < 10) {
                        this.log(`Line ${index}: [${values.join(', ')}]`);
                    }
                }
            }
        });
        
        this.log(`Total data points: ${lutData.length}`);
        this.log(`Expected points: ${lutSize * lutSize * lutSize * 3}`);
        
        if (lutData.length === lutSize * lutSize * lutSize * 3) {
            this.currentLUT = { size: lutSize, data: new Float32Array(lutData) };
            this.createLUTTexture();
            this.processImage();
            this.log("✅ CUBE ファイル解析完了");
        } else {
            this.log("❌ CUBE ファイルデータが不正です");
        }
    }
}

// グローバル関数
let investigator;

window.onload = () => {
    investigator = new LUTInvestigator();
};

function updateOpacity() {
    const value = document.getElementById('opacity').value;
    document.getElementById('opacityValue').textContent = value + '%';
    if (investigator) investigator.processImage();
}

function updateOpacityScale() {
    const value = document.getElementById('opacityScale').value;
    document.getElementById('opacityScaleValue').textContent = value;
    if (investigator) investigator.processImage();
}

function toggleGammaCorrection() {
    if (investigator) investigator.processImage();
}

function toggleHighPrecision() {
    if (investigator) investigator.processImage();
}

function loadTestImage() {
    if (investigator) investigator.loadTestImage();
}

function loadTestLUT() {
    if (investigator) investigator.loadTestLUT();
}

function testColor(rgb) {
    if (investigator) investigator.testColor(rgb);
}

function testGammaCorrection() {
    investigator.log("=== ガンマ補正テスト開始 ===");
    
    const testColors = [
        [1.0, 0.5, 0.0], // オレンジ
        [0.5, 0.5, 0.5], // グレー
        [0.8, 0.2, 0.2]  // 暗い赤
    ];
    
    testColors.forEach(color => {
        investigator.testColor(color);
    });
    
    document.getElementById('gammaTestResult').innerHTML = "ガンマ補正テスト完了。デバッグログを確認してください。";
}

function testInterpolation() {
    investigator.log("=== 補間精度テスト開始 ===");
    // 高精度チェックボックスのON/OFFで比較
    const highPrecision = document.getElementById('highPrecision');
    
    highPrecision.checked = false;
    investigator.processImage();
    investigator.log("標準精度で処理完了");
    
    setTimeout(() => {
        highPrecision.checked = true;
        investigator.processImage();
        investigator.log("高精度で処理完了");
    }, 1000);
    
    document.getElementById('interpolationTestResult').innerHTML = "補間精度テスト完了。結果を比較してください。";
}

function testOpacityScaling() {
    investigator.log("=== 不透明度スケーリングテスト開始 ===");
    
    const scales = [0.1, 0.3, 0.5, 1.0, 1.5];
    const originalScale = document.getElementById('opacityScale').value;
    
    scales.forEach((scale, index) => {
        setTimeout(() => {
            document.getElementById('opacityScale').value = scale;
            document.getElementById('opacityScaleValue').textContent = scale;
            investigator.processImage();
            investigator.log(`スケーリング係数 ${scale} でテスト完了`);
            
            if (index === scales.length - 1) {
                setTimeout(() => {
                    document.getElementById('opacityScale').value = originalScale;
                    document.getElementById('opacityScaleValue').textContent = originalScale;
                    investigator.processImage();
                }, 1000);
            }
        }, index * 1500);
    });
    
    document.getElementById('scalingTestResult').innerHTML = "スケーリングテスト実行中...";
}

function clearDebugLog() {
    investigator.debugLog = [];
    document.getElementById('debugOutput').textContent = '';
}

function exportResults() {
    const results = {
        timestamp: new Date().toISOString(),
        opacity: document.getElementById('opacity').value,
        opacityScale: document.getElementById('opacityScale').value,
        gammaCorrection: document.getElementById('gammaCorrection').checked,
        highPrecision: document.getElementById('highPrecision').checked,
        debugLog: investigator.debugLog
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lut_investigation_${Date.now()}.json`;
    a.click();
    
    investigator.log("📊 結果をエクスポートしました");
}