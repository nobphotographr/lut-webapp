import { LUTLayer, LUTData, WebGLResources } from './types';
import { LUT_PRESETS, MARKETING_CONFIG } from './constants';
import { LUTParser } from './lut-parser';
import {
  createShader,
  createProgram,
  create3DLUTTexture,
  loadImageToTexture,
  getVertexShaderSource,
  getFragmentShaderSource
} from './webgl-utils';
import { getOptimalWebGLContext } from './webgl-fallback';
import { Canvas2DProcessor } from './canvas2d-processor';
import { analyzeLUTData, generateLUTReport, generateTestColorSamples, compareLUTs } from './lut-debug';
import { diagnoseLUTData, generateDiagnosticReport } from './lut-diagnostic';

export class LUTProcessor {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private canvas2d: Canvas2DProcessor | null = null;
  private resources: WebGLResources;
  private lutCache: Map<string, LUTData> = new Map();
  private readonly maxRetries = 3;
  private failedLUTs = new Set<string>(); // Track failed LUTs to prevent infinite retries
  private lutDataMap: Map<string, LUTData> = new Map(); // Individual LUT data storage
  private lutTextureMap: Map<string, WebGLTexture | null> = new Map(); // Individual texture storage
  private lutSizeMap: Map<string, number> = new Map(); // Individual size storage
  private lutSizes: number[] = []; // Keep for backward compatibility
  private initialized = false;
  private isInitializing = false;
  private isWebGL2 = false;
  private useWebGL = false;
  private maxTextureSize = 2048; // Safe default
  private processingCanvas: HTMLCanvasElement | null = null; // Dedicated processing canvas

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    console.log('[LUTProcessor] Created with canvas:', canvas.width, 'x', canvas.height);
    
    // Try immediate WebGL initialization with a test canvas
    this.initializeWebGLWithTestCanvas();
    
    this.resources = {
      program: null,
      vertexBuffer: null,
      texCoordBuffer: null,
      imageTexture: null,
      lutTextures: [],
      watermarkTexture: null
    };
  }
  
  private initializeWebGLWithTestCanvas(): void {
    // Create a small test canvas for WebGL capability detection
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 512;
    testCanvas.height = 512;
    
    console.log('[LUTProcessor] Testing WebGL capability with 512x512 canvas...');
    
    const { gl, isWebGL2, capabilities } = getOptimalWebGLContext(testCanvas);
    
    if (gl) {
      // WebGL is available, check if we can handle large canvases
      this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      console.log('[LUTProcessor] ✅ WebGL is available, max texture size:', this.maxTextureSize);
      
      // Create dedicated processing canvas with appropriate size
      this.createProcessingCanvas();
      
      // Try to create WebGL context on the processing canvas
      const processingGL = this.tryCreateWebGLOnProcessingCanvas();
      
      if (processingGL) {
        this.gl = processingGL as WebGL2RenderingContext;
        this.isWebGL2 = isWebGL2;
        this.useWebGL = true;
        
        console.log('[LUTProcessor] ✅ WebGL context created successfully on processing canvas');
        console.log('[LUTProcessor] WebGL details:', {
          version: this.isWebGL2 ? 'WebGL2' : 'WebGL1',
          maxTextureSize: this.maxTextureSize,
          hasFloatTextures: capabilities.hasFloatTextures || false,
          renderer: this.gl.getParameter((this.gl as WebGLRenderingContext).RENDERER),
          vendor: this.gl.getParameter((this.gl as WebGLRenderingContext).VENDOR)
        });
      } else {
        this.fallbackToCanvas2D('WebGL context creation failed on processing canvas');
      }
    } else {
      this.fallbackToCanvas2D(capabilities.error || 'WebGL not supported');
    }
  }
  
  private createProcessingCanvas(): void {
    this.processingCanvas = document.createElement('canvas');
    // Start with a reasonable size, will be adjusted during processing
    this.processingCanvas.width = Math.min(2048, this.maxTextureSize);
    this.processingCanvas.height = Math.min(2048, this.maxTextureSize);
    console.log('[LUTProcessor] Created processing canvas:', this.processingCanvas.width, 'x', this.processingCanvas.height);
  }
  
  private tryCreateWebGLOnProcessingCanvas(): WebGLRenderingContext | WebGL2RenderingContext | null {
    if (!this.processingCanvas) return null;
    
    try {
      const { gl } = getOptimalWebGLContext(this.processingCanvas);
      return gl;
    } catch (error) {
      console.warn('[LUTProcessor] Failed to create WebGL on processing canvas:', error);
      return null;
    }
  }
  
  private fallbackToCanvas2D(reason: string): void {
    console.error('[LUTProcessor] ❌ WebGL initialization failed:', reason);
    
    try {
      this.canvas2d = new Canvas2DProcessor(this.canvas);
      this.useWebGL = false;
      console.warn('[LUTProcessor] ⚠️ Using Canvas2D fallback (limited LUT accuracy)');
    } catch (error) {
      console.error('[LUTProcessor] Canvas2D fallback failed:', error);
      throw new Error(`Neither WebGL nor Canvas2D is supported: ${error}`);
    }
  }
  
  private calculateProcessingSize(imageWidth: number, imageHeight: number): { 
    processWidth: number; 
    processHeight: number; 
    needsScaling: boolean; 
  } {
    const maxSize = Math.min(this.maxTextureSize, 4096); // Cap at 4K even if GPU supports more
    
    if (imageWidth <= maxSize && imageHeight <= maxSize) {
      return {
        processWidth: imageWidth,
        processHeight: imageHeight,
        needsScaling: false
      };
    }
    
    // Scale down maintaining aspect ratio
    const scale = Math.min(maxSize / imageWidth, maxSize / imageHeight);
    return {
      processWidth: Math.floor(imageWidth * scale),
      processHeight: Math.floor(imageHeight * scale),
      needsScaling: true
    };
  }
  
  private transferProcessingResult(): void {
    if (!this.processingCanvas || !this.gl) return;
    
    // Get the processed result from WebGL canvas
    const outputCtx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!outputCtx) return;
    
    // Transfer the result to the output canvas
    if (this.processingCanvas.width === this.canvas.width && 
        this.processingCanvas.height === this.canvas.height) {
      // Direct copy
      outputCtx.drawImage(this.processingCanvas, 0, 0);
    } else {
      // Scale to output size
      outputCtx.drawImage(
        this.processingCanvas, 
        0, 0, this.processingCanvas.width, this.processingCanvas.height,
        0, 0, this.canvas.width, this.canvas.height
      );
    }
    
    console.log('[LUTProcessor] WebGL result transferred to output canvas');
  }
  
  private addWatermarkToCanvas(): void {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    const watermarkText = MARKETING_CONFIG.WATERMARK_TEXT;
    const fontSize = Math.max(24, Math.min(this.canvas.width, this.canvas.height) * 0.04);
    
    // Enhanced watermark styling for better visibility
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    
    // Add shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Position watermark in bottom-right corner with padding
    const x = this.canvas.width - 20;
    const y = this.canvas.height - 20;
    
    // Draw watermark with stroke and fill for maximum visibility
    ctx.strokeText(watermarkText, x, y);
    ctx.fillText(watermarkText, x, y);
    
    // Add additional watermark in center for larger images
    if (this.canvas.width > 800 || this.canvas.height > 600) {
      const centerFontSize = Math.max(32, Math.min(this.canvas.width, this.canvas.height) * 0.06);
      ctx.font = `bold ${centerFontSize}px Arial`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.lineWidth = 2;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 3;
      
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      
      ctx.strokeText(watermarkText, centerX, centerY);
      ctx.fillText(watermarkText, centerX, centerY);
    }
    
    // Reset shadow settings
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    console.log('[LUTProcessor] Watermark added to canvas');
  }

  async initialize(): Promise<void> {
    if (this.initialized || this.isInitializing) {
      console.log('[LUTProcessor] Already initialized or initializing, skipping...');
      return;
    }
    
    this.isInitializing = true;

    try {
      if (this.useWebGL && this.gl) {
        await this.initWebGL();
        await this.loadLUTPresets();
      }
      // Canvas2D doesn't need LUT loading - it uses enhanced effects
      this.initialized = true;
      this.isInitializing = false;
      console.log('[LUTProcessor] Initialization completed, using:', this.useWebGL ? 'WebGL' : 'Canvas2D');
    } catch (error) {
      this.isInitializing = false;
      console.error('Failed to initialize LUT processor:', error);
      throw error;
    }
  }

  private async initWebGL(): Promise<void> {
    const gl = this.gl;
    if (!gl) throw new Error('WebGL context not available');

    const vertexShaderSource = getVertexShaderSource(this.isWebGL2);
    const fragmentShaderSource = getFragmentShaderSource(this.isWebGL2);
    
    console.log('[LUTProcessor] Using WebGL version:', this.isWebGL2 ? 'WebGL2' : 'WebGL1');

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to create shaders');
    }

    this.resources.program = createProgram(gl, vertexShader, fragmentShader);
    if (!this.resources.program) {
      throw new Error('Failed to create shader program');
    }

    this.setupBuffers();
  }

  private setupBuffers(): void {
    const gl = this.gl;
    if (!gl) throw new Error('WebGL context not available');

    const vertices = new Float32Array([
      -1, -1,  1, -1,  -1, 1,
       1, -1,  1,  1,  -1, 1
    ]);

    const texCoords = new Float32Array([
      0, 1,  1, 1,  0, 0,
      1, 1,  1, 0,  0, 0
    ]);

    this.resources.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.resources.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.resources.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
  }

  private async loadLUTPresets(): Promise<void> {
    const gl = this.gl;
    if (!gl) throw new Error('WebGL context not available');

    this.resources.lutTextures = [];
    this.lutSizes = [];
    
    // Store loaded LUTs for comparison
    const loadedLUTs: Array<{ name: string; data: LUTData }> = [];

    for (const preset of LUT_PRESETS) {
      if (!preset.file) {
        this.resources.lutTextures.push(null);
        this.lutSizes.push(0);
        continue;
      }

      try {
        console.log(`[LUTProcessor] 🔄 Processing LUT ${preset.name} (${preset.id})`);
        
        let lutData = this.lutCache.get(preset.file);
        if (!lutData) {
          console.log(`[LUTProcessor] 📁 Loading ${preset.name} from ${preset.file}`);
          const loadedData = await this.loadLUTWithRetry(preset.file, preset.name);
          
          if (!loadedData) {
            console.warn(`[LUTProcessor] ⚠️ Failed to load ${preset.name}, skipping this LUT`);
            // Skip this LUT entirely instead of using identity fallback
            this.resources.lutTextures.push(null);
            this.lutSizes.push(0);
            continue;
          }
          
          lutData = loadedData;
          
          // Create a completely independent deep copy for caching
          const lutDataCopy: LUTData = {
            size: lutData.size,
            data: new Float32Array(lutData.data) // Force new Float32Array creation
          };
          
          this.lutCache.set(preset.file, lutDataCopy);
          console.log(`[LUTProcessor] 💾 Cached ${preset.name} with independent data copy`);
        } else {
          console.log(`[LUTProcessor] 📋 Using cached ${preset.name}`);
          // キャッシュされたLUTでも診断ログを出力
          console.log(`[LUTProcessor] 🔧 Cache Debug - About to create texture for cached ${preset.name}`);
        }
        
        // Create another independent copy for this specific LUT instance
        const independentLutData: LUTData = {
          size: lutData.size,
          data: new Float32Array(lutData.data) // Create completely new array
        };
        
        // Store in individual maps with preset ID as key
        this.lutDataMap.set(preset.id, independentLutData);
        this.lutSizeMap.set(preset.id, independentLutData.size);
        
        // Enhanced verification with checksum
        const first5Values = Array.from(independentLutData.data.slice(0, 15)).map(v => v.toFixed(6));
        const dataChecksum = Array.from(independentLutData.data.slice(0, 100)).reduce((sum, val) => sum + val, 0);
        
        console.log(`[LUTProcessor] 🎨 ${preset.name} (${preset.id}) - First 5 RGB values:`, first5Values.join(', '));
        console.log(`[LUTProcessor] 🔢 ${preset.name} checksum (first 100 values):`, dataChecksum.toFixed(6));
        console.log(`[LUTProcessor] 📊 ${preset.name} data info:`, {
          lutId: preset.id,
          size: independentLutData.size,
          totalValues: independentLutData.data.length,
          arrayType: independentLutData.data.constructor.name,
          memoryAddress: independentLutData.data.buffer
        });

        // Debug all LUTs to identify potential issues
        const debugInfo = analyzeLUTData(lutData, preset.name);
        console.log(`[LUT Debug] ${preset.name} analysis:`);
        console.log(generateLUTReport(debugInfo));
        
        // 🚨 CRITICAL: Root cause diagnostic
        const diagnostic = diagnoseLUTData(independentLutData.data, independentLutData.size);
        console.log(`[🚨 ROOT CAUSE DIAGNOSTIC] ${preset.name}:`);
        console.log(generateDiagnosticReport(diagnostic));
        
        if (!diagnostic.dataIntegrity) {
          console.error(`[🚨 CRITICAL] ${preset.name} has fundamental data issues:`, diagnostic.suspectedIssues);
        }
        
        // Generate test samples for critical comparison points
        const testSamples = generateTestColorSamples(lutData);
        console.log(`[LUT Debug] ${preset.name} test samples:`);
        testSamples.slice(0, 3).forEach(sample => {
          console.log(`  ${sample.description}: [${sample.input.map(v => v.toFixed(3)).join(', ')}] → [${sample.output.map(v => v.toFixed(3)).join(', ')}]`);
        });
        
        // Check if this is actually an identity LUT (no effect)
        const identityTest = testSamples.slice(0, 5);
        const isIdentityLUT = identityTest.every(sample => 
          Math.abs(sample.input[0] - sample.output[0]) < 0.01 &&
          Math.abs(sample.input[1] - sample.output[1]) < 0.01 &&
          Math.abs(sample.input[2] - sample.output[2]) < 0.01
        );
        
        if (isIdentityLUT) {
          console.warn(`[LUT Debug] ⚠️ ${preset.name} appears to be an identity LUT (no color change)!`);
        } else {
          console.log(`[LUT Debug] ✓ ${preset.name} has visible color transformations`);
        }

        // Store for comparison (using the independent data)
        loadedLUTs.push({ name: preset.name, data: independentLutData });

        // Create individual texture for this specific LUT with enhanced verification
        console.log(`[LUTProcessor] 🎯 Creating texture for ${preset.name} (${preset.id})`);
        console.log(`[LUTProcessor] 📋 About to create texture with data fingerprint:`, 
          Array.from(independentLutData.data.slice(0, 10)).reduce((sum, val, idx) => sum + val * (idx + 1), 0).toFixed(6)
        );
        
        console.log(`[LUTProcessor] 🔧 Calling create3DLUTTexture with:`, {
          dataLength: independentLutData.data.length,
          size: independentLutData.size,
          expectedLength: independentLutData.size * independentLutData.size * independentLutData.size * 3
        });
        
        const texture = create3DLUTTexture(gl, independentLutData.data, independentLutData.size);
        
        console.log(`[LUTProcessor] 🏁 create3DLUTTexture returned:`, texture ? 'SUCCESS' : 'NULL');
        
        if (!texture) {
          console.error(`[LUTProcessor] ❌ Failed to create texture for ${preset.name}`);
          this.resources.lutTextures.push(null);
          this.lutSizes.push(0);
          continue;
        }
        
        // Store texture with preset ID as key
        this.lutTextureMap.set(preset.id, texture);
        this.resources.lutTextures.push(texture); // Keep for backward compatibility
        this.lutSizes.push(independentLutData.size); // Keep for backward compatibility
        
        // Enhanced texture verification with GPU state check
        console.log(`[LUTProcessor] 🖼️ Texture successfully created for ${preset.name}:`, {
          lutId: preset.id,
          textureObject: texture,
          textureValid: texture !== null,
          textureIndex: this.resources.lutTextures.length - 1,
          size: `${independentLutData.size}³`,
          dataLength: independentLutData.data.length,
          expectedLength: independentLutData.size * independentLutData.size * independentLutData.size * 3,
          isUniqueObject: !this.resources.lutTextures.slice(0, -1).includes(texture)
        });
        
        // Verify texture was bound correctly
        const currentBoundTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
        console.log(`[LUTProcessor] 🔗 Current bound texture after creation:`, currentBoundTexture);
        console.log(`[LUTProcessor] 📊 Total textures now loaded:`, this.resources.lutTextures.length);
      } catch (error) {
        console.error(`[LUTProcessor] ❌ Critical error processing LUT ${preset.name}:`, error);
        
        // Add failed LUT to tracking
        this.failedLUTs.add(preset.file || '');
        
        // Skip this LUT (don't add identity fallback)
        this.resources.lutTextures.push(null);
        this.lutSizes.push(0);
        
        console.warn(`[LUTProcessor] ⚠️ Skipped ${preset.name} due to critical error`);
      }
    }
    
    // Enhanced LUT comparison with additional verification
    console.log('\n[LUT Debug] 🔍 === COMPREHENSIVE LUT COMPARISON ANALYSIS ===');
    
    // First, verify all LUTs in our maps are unique
    const lutIds = Array.from(this.lutDataMap.keys());
    console.log(`[LUT Debug] 📋 Loaded LUT IDs:`, lutIds);
    
    for (let i = 0; i < lutIds.length; i++) {
      for (let j = i + 1; j < lutIds.length; j++) {
        const lutId1 = lutIds[i];
        const lutId2 = lutIds[j];
        const lutData1 = this.lutDataMap.get(lutId1);
        const lutData2 = this.lutDataMap.get(lutId2);
        
        if (lutData1 && lutData2) {
          const comparison = compareLUTs(lutData1, lutData2, lutId1, lutId2);
          
          if (comparison.areIdentical) {
            console.error(`🚨 [LUT Debug] CRITICAL: IDENTICAL LUTs DETECTED!`);
            console.error(`${lutId1} vs ${lutId2}:`, comparison.comparison);
          } else if (comparison.maxDifference < 0.05) {
            console.warn(`⚠️ [LUT Debug] Very similar LUTs:`);
            console.warn(`${lutId1} vs ${lutId2}:`, comparison.comparison);
          } else {
            console.log(`[LUT Debug] ✅ ${lutId1} vs ${lutId2}: Max diff ${comparison.maxDifference.toFixed(3)}, Avg diff ${comparison.averageDifference.toFixed(3)}`);
          }
          
          // Additional memory address verification
          const sameBuffer = lutData1.data.buffer === lutData2.data.buffer;
          console.log(`[LUT Debug] 🧠 Memory check ${lutId1} vs ${lutId2}: Same buffer = ${sameBuffer}`);
        }
      }
    }
    
    // Summary
    console.log(`[LUT Debug] 📊 Summary: ${this.lutDataMap.size} individual LUTs loaded`);
    console.log(`[LUT Debug] 🎯 Texture map size: ${this.lutTextureMap.size}`);
    console.log(`[LUT Debug] 📏 Size map entries: ${this.lutSizeMap.size}`);
    console.log('[LUT Debug] === END COMPREHENSIVE ANALYSIS ===\n');
  }

  private async createWatermarkTexture(): Promise<void> {
    if (this.resources.watermarkTexture) return;

    const gl = this.gl;
    if (!gl) throw new Error('WebGL context not available');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = 256;
    canvas.height = 64;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(MARKETING_CONFIG.WATERMARK_TEXT, canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    this.resources.watermarkTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.resources.watermarkTexture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      canvas.width, canvas.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, imageData.data
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  async processImage(image: HTMLImageElement, layers: LUTLayer[]): Promise<void> {
    console.log('[LUTProcessor] Starting processImage with:', image.width, 'x', image.height, 'layers:', layers.length);
    
    if (!this.initialized) {
      console.log('[LUTProcessor] Not initialized, initializing...');
      await this.initialize();
    }

    // Use Canvas2D fallback if WebGL is not available
    if (!this.useWebGL && this.canvas2d) {
      console.log('[LUTProcessor] Using Canvas2D fallback for processing');
      // Set output canvas dimensions
      this.canvas.width = image.width;
      this.canvas.height = image.height;
      await this.canvas2d.processImage(image, layers);
      return;
    }

    // WebGL processing path
    const gl = this.gl;
    const resources = this.resources;
    if (!gl || !this.processingCanvas) throw new Error('WebGL context not available');

    // Determine appropriate processing size
    const { processWidth, processHeight, needsScaling } = this.calculateProcessingSize(image.width, image.height);
    
    // Set processing canvas size
    this.processingCanvas.width = processWidth;
    this.processingCanvas.height = processHeight;
    gl.viewport(0, 0, processWidth, processHeight);
    
    console.log('[LUTProcessor] Processing at:', processWidth, 'x', processHeight, needsScaling ? '(scaled)' : '(native)');
    
    // Set output canvas dimensions
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    
    // WebGLの最大テクスチャサイズを考慮したキャンバスサイズ設定
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    console.log('[LUTProcessor] Max texture size:', maxTextureSize);
    
    let canvasWidth = image.width;
    let canvasHeight = image.height;
    
    if (canvasWidth > maxTextureSize || canvasHeight > maxTextureSize) {
      const scale = Math.min(maxTextureSize / canvasWidth, maxTextureSize / canvasHeight);
      canvasWidth = Math.floor(canvasWidth * scale);
      canvasHeight = Math.floor(canvasHeight * scale);
      console.log('[LUTProcessor] Scaling image to:', canvasWidth, 'x', canvasHeight);
    }
    
    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    gl.viewport(0, 0, canvasWidth, canvasHeight);
    console.log('[LUTProcessor] Canvas and viewport set to:', canvasWidth, 'x', canvasHeight);

    resources.imageTexture = loadImageToTexture(gl, image);
    if (!resources.imageTexture) {
      console.error('[LUTProcessor] Failed to create image texture');
      throw new Error('Failed to create image texture');
    }
    console.log('[LUTProcessor] Image texture created successfully');

    await this.createWatermarkTexture();
    console.log('[LUTProcessor] Watermark texture created');

    gl.useProgram(resources.program);
    console.log('[LUTProcessor] Shader program activated');

    this.bindBuffers();
    console.log('[LUTProcessor] Buffers bound');
    
    this.setUniforms(layers);
    console.log('[LUTProcessor] Uniforms set');
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    console.log('[LUTProcessor] Draw call completed');
    
    // Force rendering completion
    gl.finish();
    console.log('[LUTProcessor] WebGL rendering finished');
    
    // Transfer result to output canvas
    this.transferProcessingResult();
    
    // Add watermark to final output
    this.addWatermarkToCanvas();
  }

  private bindBuffers(): void {
    const gl = this.gl;
    const resources = this.resources;
    if (!gl) throw new Error('WebGL context not available');
    
    const positionLocation = gl.getAttribLocation(resources.program!, 'a_position');
    const texCoordLocation = gl.getAttribLocation(resources.program!, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, resources.vertexBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, resources.texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
  }

  private setUniforms(layers: LUTLayer[]): void {
    const gl = this.gl;
    const resources = this.resources;
    if (!gl) throw new Error('WebGL context not available');

    // Bind image texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, resources.imageTexture);
    gl.uniform1i(gl.getUniformLocation(resources.program!, 'u_image'), 0);

    // Process up to 3 LUT layers with proper texture unit management
    const maxLayers = Math.min(3, layers.length);
    const enabledLayers = [];
    
    // Get uniform locations once for better performance
    const uniformLocations = {
      u_lut1: gl.getUniformLocation(resources.program!, 'u_lut1'),
      u_lut2: gl.getUniformLocation(resources.program!, 'u_lut2'),
      u_lut3: gl.getUniformLocation(resources.program!, 'u_lut3'),
      u_opacity1: gl.getUniformLocation(resources.program!, 'u_opacity1'),
      u_opacity2: gl.getUniformLocation(resources.program!, 'u_opacity2'),
      u_opacity3: gl.getUniformLocation(resources.program!, 'u_opacity3'),
      u_lutSize1: gl.getUniformLocation(resources.program!, 'u_lutSize1'),
      u_lutSize2: gl.getUniformLocation(resources.program!, 'u_lutSize2'),
      u_lutSize3: gl.getUniformLocation(resources.program!, 'u_lutSize3')
    };
    
    console.log('[LUTProcessor] 🎯 Uniform locations:', uniformLocations);
    
    // Debug: Log all loaded textures for verification
    console.log(`[LUTProcessor] 🗂️ All LUT Textures Status:`, {
      totalTextures: resources.lutTextures.length,
      textureDetails: resources.lutTextures.map((texture, index) => ({
        index,
        presetName: index < LUT_PRESETS.length ? LUT_PRESETS[index].name : 'Unknown',
        textureExists: !!texture,
        textureId: texture?.toString() || 'null',
        lutSize: index < this.lutSizes.length ? this.lutSizes[index] : 0
      }))
    });
    
    for (let i = 0; i < maxLayers; i++) {
      const layer = layers[i] || { enabled: false, opacity: 0, lutIndex: 0 };
      const layerNum = i + 1;
      const textureUnit = layerNum; // TEXTURE1, TEXTURE2, TEXTURE3
      
      // Get LUT texture and size with better error checking
      let lutTexture = null;
      let lutSize = 0;
      
      if (layer.enabled && layer.lutIndex > 0 && layer.lutIndex < resources.lutTextures.length) {
        // Map lutIndex to actual texture array index
        // lutIndex from UI corresponds directly to LUT_PRESETS array index
        // lutIndex 0='None', 1='Anderson', 2='Blue Sierra', etc.
        const presetName = layer.lutIndex < LUT_PRESETS.length ? LUT_PRESETS[layer.lutIndex].name : 'Unknown';
        
        lutTexture = resources.lutTextures[layer.lutIndex];
        lutSize = layer.lutIndex < this.lutSizes.length ? this.lutSizes[layer.lutIndex] : 0;
        
        console.log(`[LUTProcessor] 🔍 LUT Index Mapping Debug:`, {
          layerLutIndex: layer.lutIndex,
          arrayIndex: layer.lutIndex,
          presetName: presetName,
          totalTextures: resources.lutTextures.length,
          textureExists: !!lutTexture,
          lutSize: lutSize,
          textureId: lutTexture?.toString() || 'null'
        });
        
        // Additional validation
        if (!lutTexture) {
          console.warn(`[LUTProcessor] ⚠️ LUT texture at index ${layer.lutIndex} is null`);
        }
      }
      
      // Enhanced logging for debugging
      console.log(`[LUTProcessor] 🔧 Layer ${layerNum} setup:`, {
        textureUnit: `TEXTURE${textureUnit}`,
        lutIndex: layer.lutIndex,
        lutSize,
        enabled: layer.enabled,
        opacity: layer.opacity,
        textureValid: !!lutTexture,
        textureId: lutTexture,
        totalLUTs: resources.lutTextures.length,
        availableSizes: this.lutSizes.length
      });
      
      // Always bind a texture (use identity/fallback if needed)
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      if (lutTexture) {
        gl.bindTexture(gl.TEXTURE_2D, lutTexture);
        console.log(`[LUTProcessor] ✅ Bound valid LUT texture to TEXTURE${textureUnit}`);
      } else {
        // Create a minimal 1x1 identity texture as fallback
        const fallbackTexture = this.createFallbackTexture(gl);
        gl.bindTexture(gl.TEXTURE_2D, fallbackTexture);
        console.log(`[LUTProcessor] ⚠️ Bound fallback texture to TEXTURE${textureUnit}`);
      }
      
      // Set uniform to point to correct texture unit
      const lutUniformLocation = uniformLocations[`u_lut${layerNum}` as keyof typeof uniformLocations];
      if (lutUniformLocation) {
        gl.uniform1i(lutUniformLocation, textureUnit);
        console.log(`[LUTProcessor] 🎯 Set u_lut${layerNum} = ${textureUnit}`);
      } else {
        console.error(`[LUTProcessor] ❌ Failed to get uniform location for u_lut${layerNum}`);
      }
      
      // Set opacity and size uniforms
      const effectiveOpacity = layer.enabled && lutTexture ? layer.opacity : 0;
      const opacityLocation = uniformLocations[`u_opacity${layerNum}` as keyof typeof uniformLocations];
      const sizeLocation = uniformLocations[`u_lutSize${layerNum}` as keyof typeof uniformLocations];
      
      if (opacityLocation) {
        gl.uniform1f(opacityLocation, effectiveOpacity);
      }
      if (sizeLocation) {
        gl.uniform1f(sizeLocation, lutSize);
      }
      
      console.log(`[LUTProcessor] Layer ${layerNum} uniforms:`, {
        uniform_lut: `u_lut${layerNum} = ${layerNum}`,
        uniform_opacity: `u_opacity${layerNum} = ${effectiveOpacity}`,
        uniform_size: `u_lutSize${layerNum} = ${lutSize}`
      });
      
      if (layer.enabled && lutSize > 0) {
        enabledLayers.push({
          layer: layerNum,
          lutIndex: layer.lutIndex,
          size: lutSize,
          opacity: layer.opacity
        });
      }
    }
    
    if (enabledLayers.length > 0) {
      console.log('[LUTProcessor] Active layers:', enabledLayers);
      if (enabledLayers.length > 1) {
        console.log('[LUTProcessor] Multiple LUT layers will be blended sequentially');
      }
    }
  }

  dispose(): void {
    const gl = this.gl;
    const resources = this.resources;
    
    if (gl) {
      if (resources.program) gl.deleteProgram(resources.program);
      if (resources.vertexBuffer) gl.deleteBuffer(resources.vertexBuffer);
      if (resources.texCoordBuffer) gl.deleteBuffer(resources.texCoordBuffer);
      if (resources.imageTexture) gl.deleteTexture(resources.imageTexture);
      if (resources.watermarkTexture) gl.deleteTexture(resources.watermarkTexture);
      
      resources.lutTextures.forEach(texture => {
        if (texture) gl.deleteTexture(texture);
      });
    }
    
    if (this.canvas2d) {
      this.canvas2d.dispose();
    }
    
    // Clean up processing canvas
    if (this.processingCanvas) {
      this.processingCanvas.width = 1;
      this.processingCanvas.height = 1;
      this.processingCanvas = null;
    }

    // Clear all LUT management maps
    this.lutCache.clear();
    this.lutDataMap.clear();
    this.lutTextureMap.clear();
    this.lutSizeMap.clear();
    this.failedLUTs.clear();
    
    this.initialized = false;
    this.isInitializing = false;
    console.log('[LUTProcessor] Disposed successfully - all LUT data cleared');
  }

  private createFallbackTexture(gl: WebGL2RenderingContext): WebGLTexture | null {
    const texture = gl.createTexture();
    if (!texture) return null;
    
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Create a simple 1x1 identity texture (returns input color unchanged)
    const identityData = new Uint8Array([128, 128, 128, 255]); // Mid-gray
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      1, 1, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, identityData
    );
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    console.log('[LUTProcessor] 🔧 Created fallback texture');
    return texture;
  }

  private async loadLUTWithRetry(file: string, name: string): Promise<LUTData | null> {
    // Check if this LUT has already failed permanently
    if (this.failedLUTs.has(file)) {
      console.warn(`[LUTProcessor] ⚠️ ${name} previously failed, skipping`);
      return null; // Return null instead of identity LUT
    }
    
    try {
      console.log(`[LUTProcessor] 🔄 Loading ${name} from ${file}`);
      
      // Call LUTParser directly (it has its own retry logic now)
      const lutData = await LUTParser.loadLUTFromURL(file);
      
      // Validate the loaded data
      if (LUTParser.validateLUTData(lutData)) {
        console.log(`[LUTProcessor] ✅ Successfully loaded and validated ${name}`);
        // Remove from failed set if it was there
        this.failedLUTs.delete(file);
        return lutData;
      } else {
        throw new Error(`LUT validation failed for ${name}`);
      }
      
    } catch (error) {
      console.error(`[LUTProcessor] ❌ Failed to load ${name}:`, error);
      
      // Mark as failed to prevent future attempts
      this.failedLUTs.add(file);
      
      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes('stack') || error.message.includes('Maximum call stack')) {
          console.error(`[LUTProcessor] 🚨 Stack overflow detected for ${name}`);
        }
      }
      
      // Return null instead of identity LUT to maintain LUT uniqueness
      return null;
    }
  }
}