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

export class LUTProcessor {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private resources: WebGLResources;
  private lutCache: Map<string, LUTData> = new Map();
  private lutSizes: number[] = [];
  private initialized = false;
  private isWebGL2 = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // Ensure canvas has minimum dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = 512;
      canvas.height = 512;
    }
    
    console.log('[LUTProcessor] Initializing with canvas:', canvas.width, 'x', canvas.height);
    
    // Use improved WebGL detection with fallback
    const { gl, isWebGL2, capabilities } = getOptimalWebGLContext(canvas);
    
    if (!gl) {
      // Try direct context creation as fallback
      console.warn('[LUTProcessor] getOptimalWebGLContext failed, trying direct approach');
      
      const directGL = canvas.getContext('webgl2') || 
                      canvas.getContext('webgl') || 
                      canvas.getContext('experimental-webgl');
      
      if (directGL && 'getParameter' in directGL && typeof (directGL as WebGLRenderingContext).getParameter === 'function') {
        console.log('[LUTProcessor] Direct WebGL context creation succeeded');
        this.gl = directGL as WebGL2RenderingContext;
        this.isWebGL2 = directGL instanceof WebGL2RenderingContext;
      } else {
        const errorMsg = `WebGL not supported: ${capabilities.error || 'Unknown error'}`;
        console.error('[LUTProcessor]', errorMsg);
        throw new Error(errorMsg);
      }
    } else {
      this.gl = gl as WebGL2RenderingContext;
      this.isWebGL2 = isWebGL2;
    }
    
    // Log successful context creation
    const maxTexSize = this.gl ? this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) : 'unknown';
    console.log('[LUTProcessor] WebGL context created:', {
      version: this.isWebGL2 ? 'WebGL2' : 'WebGL1',
      maxTextureSize: maxTexSize,
      hasFloatTextures: capabilities.hasFloatTextures || false
    });
    
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
      await this.initWebGL();
      await this.loadLUTPresets();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize LUT processor:', error);
      throw error;
    }
  }

  private async initWebGL(): Promise<void> {
    const { gl } = this;

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
    const { gl } = this;

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

        const texture = create3DLUTTexture(this.gl, lutData.data, lutData.size);
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
    
    this.resources.watermarkTexture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.resources.watermarkTexture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D, 0, this.gl.RGBA,
      canvas.width, canvas.height, 0,
      this.gl.RGBA, this.gl.UNSIGNED_BYTE, imageData.data
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
  }

  async processImage(image: HTMLImageElement, layers: LUTLayer[]): Promise<void> {
    console.log('[LUTProcessor] Starting processImage with:', image.width, 'x', image.height, 'layers:', layers.length);
    
    if (!this.initialized) {
      console.log('[LUTProcessor] Not initialized, initializing...');
      await this.initialize();
    }

    const { gl, resources } = this;
    
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
    const { gl, resources } = this;
    
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
    const { gl, resources } = this;

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, resources.imageTexture);
    gl.uniform1i(gl.getUniformLocation(resources.program!, 'u_image'), 0);

    // For now, only support the first layer for compatibility
    const layer = layers[0] || { enabled: false, opacity: 0, lutIndex: 0 };
    const lutTexture = layer.enabled && layer.lutIndex > 0 
      ? resources.lutTextures[layer.lutIndex] 
      : null;
    
    const lutSize = layer.enabled && layer.lutIndex > 0 && layer.lutIndex < this.lutSizes.length
      ? this.lutSizes[layer.lutIndex]
      : 0;

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, lutTexture);
    gl.uniform1i(gl.getUniformLocation(resources.program!, 'u_lut1'), 1);
    gl.uniform1f(gl.getUniformLocation(resources.program!, 'u_opacity1'), 
      layer.enabled ? layer.opacity : 0);
    gl.uniform1f(gl.getUniformLocation(resources.program!, 'u_lutSize1'), lutSize);
    
    if (lutSize > 0) {
      console.log(`Layer 1: LUT size ${lutSize}, opacity ${layer.opacity}, enabled ${layer.enabled}`);
    }
  }

  dispose(): void {
    const { gl, resources } = this;
    
    if (resources.program) gl.deleteProgram(resources.program);
    if (resources.vertexBuffer) gl.deleteBuffer(resources.vertexBuffer);
    if (resources.texCoordBuffer) gl.deleteBuffer(resources.texCoordBuffer);
    if (resources.imageTexture) gl.deleteTexture(resources.imageTexture);
    if (resources.watermarkTexture) gl.deleteTexture(resources.watermarkTexture);
    
    resources.lutTextures.forEach(texture => {
      if (texture) gl.deleteTexture(texture);
    });

    this.lutCache.clear();
    this.initialized = false;
  }
}