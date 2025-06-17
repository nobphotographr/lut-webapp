export interface LUTLayer {
  lutIndex: number;
  opacity: number;
  enabled: boolean;
}

export interface LUTPreset {
  id: string;
  name: string;
  file: string | null;
}

export interface ProcessedImage {
  canvas: HTMLCanvasElement;
  imageData: ImageData;
  hasWatermark: boolean;
}

export interface LUTData {
  size: number;
  data: Float32Array;
}

export interface ImageUploadState {
  file: File | null;
  preview: string | null;
  isProcessing: boolean;
  error: string | null;
}

export interface LUTProcessorConfig {
  maxTextureSize: number;
  lutSize: number;
  enableWatermark: boolean;
  watermarkOpacity: number;
}

export interface WebGLResources {
  program: WebGLProgram | null;
  vertexBuffer: WebGLBuffer | null;
  texCoordBuffer: WebGLBuffer | null;
  imageTexture: WebGLTexture | null;
  lutTextures: (WebGLTexture | null)[];
  watermarkTexture: WebGLTexture | null;
}