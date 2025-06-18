/**
 * WebGL Fallback Detection and Error Handling
 * WebGL2/WebGL1 compatibility layer with graceful degradation
 */

export interface WebGLCapabilities {
  hasWebGL2: boolean;
  hasWebGL1: boolean;
  maxTextureSize: number;
  hasFloatTextures: boolean;
  error?: string;
}

export function detectWebGLCapabilities(canvas?: HTMLCanvasElement): WebGLCapabilities {
  // SSR protection - return default capabilities on server
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      hasWebGL2: false,
      hasWebGL1: false,
      maxTextureSize: 2048,
      hasFloatTextures: false,
      error: 'SSR environment - WebGL not available'
    };
  }

  const testCanvas = canvas || document.createElement('canvas');
  testCanvas.width = 1;
  testCanvas.height = 1;
  
  const capabilities: WebGLCapabilities = {
    hasWebGL2: false,
    hasWebGL1: false,
    maxTextureSize: 0,
    hasFloatTextures: false
  };

  // Test WebGL2
  try {
    const gl2 = testCanvas.getContext('webgl2', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    });
    
    if (gl2) {
      capabilities.hasWebGL2 = true;
      capabilities.maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE);
      
      // Check float texture support
      const floatExt = gl2.getExtension('EXT_color_buffer_float');
      capabilities.hasFloatTextures = !!floatExt;
      
      console.log('[WebGL] WebGL2 capabilities detected:', capabilities);
      return capabilities;
    }
  } catch (e) {
    console.warn('[WebGL] WebGL2 detection failed:', e);
    capabilities.error = `WebGL2 error: ${e}`;
  }

  // Test WebGL1
  try {
    const gl1 = testCanvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false
    }) || testCanvas.getContext('experimental-webgl');
    
    if (gl1 && 'getParameter' in gl1) {
      const webgl1 = gl1 as WebGLRenderingContext;
      capabilities.hasWebGL1 = true;
      capabilities.maxTextureSize = webgl1.getParameter(webgl1.MAX_TEXTURE_SIZE);
      
      console.log('[WebGL] WebGL1 capabilities detected:', capabilities);
      return capabilities;
    }
  } catch (e) {
    console.warn('[WebGL] WebGL1 detection failed:', e);
    capabilities.error = `WebGL1 error: ${e}`;
  }

  console.error('[WebGL] No WebGL support detected');
  capabilities.error = 'No WebGL support available';
  return capabilities;
}

export function getOptimalWebGLContext(canvas: HTMLCanvasElement): {
  gl: WebGL2RenderingContext | WebGLRenderingContext | null;
  isWebGL2: boolean;
  capabilities: WebGLCapabilities;
} {
  // SSR protection
  if (typeof window === 'undefined') {
    return {
      gl: null,
      isWebGL2: false,
      capabilities: {
        hasWebGL2: false,
        hasWebGL1: false,
        maxTextureSize: 2048,
        hasFloatTextures: false,
        error: 'SSR environment - WebGL not available'
      }
    };
  }

  const capabilities = detectWebGLCapabilities(canvas);
  
  if (capabilities.hasWebGL2) {
    const gl = canvas.getContext('webgl2');
    if (gl) {
      return { gl, isWebGL2: true, capabilities };
    }
  }
  
  if (capabilities.hasWebGL1) {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl && 'getParameter' in gl) {
      return { gl: gl as WebGLRenderingContext, isWebGL2: false, capabilities };
    }
  }
  
  return { gl: null, isWebGL2: false, capabilities };
}