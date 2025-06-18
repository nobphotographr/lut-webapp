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

export class LUTProcessor {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null = null;
  private canvas2d: Canvas2DProcessor | null = null;
  private resources: WebGLResources;
  private lutCache: Map<string, LUTData> = new Map();
  private lutSizes: number[] = [];
  private initialized = false;
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

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (this.useWebGL && this.gl) {
        await this.initWebGL();
        await this.loadLUTPresets();
      }
      // Canvas2D doesn't need LUT loading - it uses enhanced effects
      this.initialized = true;
      console.log('[LUTProcessor] Initialization completed, using:', this.useWebGL ? 'WebGL' : 'Canvas2D');
    } catch (error) {
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
        let lutData = this.lutCache.get(preset.file);
        if (!lutData) {
          lutData = await LUTParser.loadLUTFromURL(preset.file);
          this.lutCache.set(preset.file, lutData);
        }

        // Debug all LUTs to identify potential issues
        const debugInfo = analyzeLUTData(lutData, preset.name);
        console.log(`[LUT Debug] ${preset.name} analysis:`);
        console.log(generateLUTReport(debugInfo));
        
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

        // Store for comparison
        loadedLUTs.push({ name: preset.name, data: lutData });

        const texture = create3DLUTTexture(gl, lutData.data, lutData.size);
        this.resources.lutTextures.push(texture);
        this.lutSizes.push(lutData.size);
        
        console.log(`LUT loaded: ${preset.name} - Size: ${lutData.size}x${lutData.size}x${lutData.size}`);
      } catch (error) {
        console.warn(`Failed to load LUT ${preset.name}:`, error);
        this.resources.lutTextures.push(null);
        this.lutSizes.push(0);
      }
    }
    
    // Compare all loaded LUTs to detect if any are identical
    console.log('\n[LUT Debug] === LUT COMPARISON ANALYSIS ===');
    for (let i = 0; i < loadedLUTs.length; i++) {
      for (let j = i + 1; j < loadedLUTs.length; j++) {
        const lut1 = loadedLUTs[i];
        const lut2 = loadedLUTs[j];
        const comparison = compareLUTs(lut1.data, lut2.data, lut1.name, lut2.name);
        
        if (comparison.areIdentical) {
          console.warn(`🚨 [LUT Debug] IDENTICAL LUTs DETECTED!`);
          console.warn(comparison.comparison);
        } else if (comparison.maxDifference < 0.05) {
          console.warn(`⚠️ [LUT Debug] Very similar LUTs:`);
          console.warn(comparison.comparison);
        } else {
          console.log(`[LUT Debug] ${lut1.name} vs ${lut2.name}: Max diff ${comparison.maxDifference.toFixed(3)}, Avg diff ${comparison.averageDifference.toFixed(3)}`);
        }
      }
    }
    console.log('[LUT Debug] === END COMPARISON ===\n');
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

    // Process up to 3 LUT layers
    const maxLayers = Math.min(3, layers.length);
    const enabledLayers = [];
    
    for (let i = 0; i < maxLayers; i++) {
      const layer = layers[i] || { enabled: false, opacity: 0, lutIndex: 0 };
      const layerNum = i + 1;
      
      // Get LUT texture and size
      const lutTexture = layer.enabled && layer.lutIndex > 0 
        ? resources.lutTextures[layer.lutIndex] 
        : null;
      
      const lutSize = layer.enabled && layer.lutIndex > 0 && layer.lutIndex < this.lutSizes.length
        ? this.lutSizes[layer.lutIndex]
        : 0;
      
      // Bind LUT texture to appropriate texture unit
      console.log(`[LUTProcessor] Layer ${layerNum} binding:`, {
        textureUnit: `TEXTURE${layerNum}`,
        lutIndex: layer.lutIndex,
        lutSize,
        enabled: layer.enabled,
        opacity: layer.opacity,
        lutTexture: lutTexture ? 'valid' : 'null'
      });
      
      gl.activeTexture(gl.TEXTURE0 + layerNum);
      gl.bindTexture(gl.TEXTURE_2D, lutTexture);
      gl.uniform1i(gl.getUniformLocation(resources.program!, `u_lut${layerNum}`), layerNum);
      
      // Set opacity and size uniforms
      const effectiveOpacity = layer.enabled ? layer.opacity : 0;
      gl.uniform1f(gl.getUniformLocation(resources.program!, `u_opacity${layerNum}`), effectiveOpacity);
      gl.uniform1f(gl.getUniformLocation(resources.program!, `u_lutSize${layerNum}`), lutSize);
      
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

    this.lutCache.clear();
    this.initialized = false;
    console.log('[LUTProcessor] Disposed successfully');
  }
}