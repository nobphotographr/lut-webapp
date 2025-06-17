import { LUTLayer, LUTData, WebGLResources } from './types';
import { LUT_PRESETS, WEBGL_CONFIG } from './constants';
import { LUTParser } from './lut-parser';
import {
  createShader,
  createProgram,
  create3DLUTTexture,
  loadImageToTexture,
  VERTEX_SHADER_SOURCE,
  FRAGMENT_SHADER_SOURCE
} from './webgl-utils';

export class LUTProcessor {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private resources: WebGLResources;
  private lutCache: Map<string, LUTData> = new Map();
  private initialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;
    
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

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

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

    for (const preset of LUT_PRESETS) {
      if (!preset.file) {
        this.resources.lutTextures.push(null);
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
      } catch (error) {
        console.warn(`Failed to load LUT ${preset.name}:`, error);
        this.resources.lutTextures.push(null);
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
    ctx.fillText('DEMO VERSION', canvas.width / 2, canvas.height / 2);

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
    if (!this.initialized) {
      await this.initialize();
    }

    const { gl, resources } = this;
    
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    gl.viewport(0, 0, image.width, image.height);

    resources.imageTexture = loadImageToTexture(gl, image);
    if (!resources.imageTexture) {
      throw new Error('Failed to create image texture');
    }

    await this.createWatermarkTexture();

    gl.useProgram(resources.program);

    this.bindBuffers();
    this.setUniforms(layers);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
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

    layers.forEach((layer, index) => {
      const textureUnit = index + 1;
      const lutTexture = layer.enabled && layer.lutIndex > 0 
        ? resources.lutTextures[layer.lutIndex] 
        : null;

      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, lutTexture);
      gl.uniform1i(gl.getUniformLocation(resources.program!, `u_lut${index + 1}`), textureUnit);
      gl.uniform1f(gl.getUniformLocation(resources.program!, `u_opacity${index + 1}`), 
        layer.enabled ? layer.opacity : 0);
      gl.uniform1i(gl.getUniformLocation(resources.program!, `u_enabled${index + 1}`), 
        layer.enabled ? 1 : 0);
    });

    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, resources.watermarkTexture);
    gl.uniform1i(gl.getUniformLocation(resources.program!, 'u_watermark'), 4);
    
    const watermarkSize = Math.min(this.canvas.width, this.canvas.height) * WEBGL_CONFIG.WATERMARK_SIZE_RATIO;
    const watermarkX = (this.canvas.width - watermarkSize) / this.canvas.width;
    const watermarkY = (this.canvas.height - watermarkSize * 0.25) / this.canvas.height;
    
    gl.uniform2f(gl.getUniformLocation(resources.program!, 'u_watermarkPos'), watermarkX, watermarkY);
    gl.uniform2f(gl.getUniformLocation(resources.program!, 'u_watermarkSize'), 
      watermarkSize / this.canvas.width, watermarkSize * 0.25 / this.canvas.height);
    gl.uniform1f(gl.getUniformLocation(resources.program!, 'u_watermarkOpacity'), 
      WEBGL_CONFIG.WATERMARK_OPACITY);
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