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

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Ensure canvas has minimum dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = 512;
      canvas.height = 512;
    }
    
    console.log('[LUTProcessor] Initializing with canvas:', canvas.width, 'x', canvas.height);
    
    // Try WebGL first with improved detection
    const { gl, isWebGL2, capabilities } = getOptimalWebGLContext(canvas);
    
    if (gl) {
      console.log('[LUTProcessor] WebGL context created successfully');
      this.gl = gl as WebGL2RenderingContext;
      this.isWebGL2 = isWebGL2;
      this.useWebGL = true;
      
      const maxTexSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
      console.log('[LUTProcessor] WebGL context:', {
        version: this.isWebGL2 ? 'WebGL2' : 'WebGL1',
        maxTextureSize: maxTexSize,
        hasFloatTextures: capabilities.hasFloatTextures || false
      });
    } else {
      // Fallback to Canvas2D
      console.warn('[LUTProcessor] WebGL not available, falling back to Canvas2D');
      console.warn('[LUTProcessor] WebGL error:', capabilities.error || 'Unknown error');
      
      try {
        this.canvas2d = new Canvas2DProcessor(canvas);
        this.useWebGL = false;
        console.log('[LUTProcessor] Canvas2D fallback initialized successfully');
      } catch (error) {
        console.error('[LUTProcessor] Canvas2D fallback failed:', error);
        throw new Error(`Neither WebGL nor Canvas2D is supported: ${error}`);
      }
    }
    
    this.resources = {
      program: null,
      vertexBuffer: null,
      texCoordBuffer: null,
      imageTexture: null,
      lutTextures: [],
      watermarkTexture: null
    };
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (this.useWebGL && this.gl) {
        await this.initWebGL();
        await this.loadLUTPresets();
      }
      // Canvas2D doesn't need LUT loading - it uses simple effects
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
  }

  private async createWatermarkTexture(): Promise<void> {
    if (this.resources.watermarkTexture) return;

    const gl = this.gl;
    if (!gl) throw new Error('WebGL context not available');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
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
      await this.canvas2d.processImage(image, layers);
      return;
    }

    const gl = this.gl;
    const resources = this.resources;
    if (!gl) throw new Error('WebGL context not available');
    
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
      gl.activeTexture(gl.TEXTURE0 + layerNum);
      gl.bindTexture(gl.TEXTURE_2D, lutTexture);
      gl.uniform1i(gl.getUniformLocation(resources.program!, `u_lut${layerNum}`), layerNum);
      
      // Set opacity and size uniforms
      const effectiveOpacity = layer.enabled ? layer.opacity : 0;
      gl.uniform1f(gl.getUniformLocation(resources.program!, `u_opacity${layerNum}`), effectiveOpacity);
      gl.uniform1f(gl.getUniformLocation(resources.program!, `u_lutSize${layerNum}`), lutSize);
      
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

    this.lutCache.clear();
    this.initialized = false;
  }
}