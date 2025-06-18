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
    const gl2Context = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl2-experimental');
    
    if (gl2Context && 'getParameter' in gl2Context) {
      const gl2 = gl2Context as WebGL2RenderingContext;
      capabilities.hasWebGL2 = true;
      capabilities.maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE);
      
      // Check float texture support
      try {
        const floatExt = gl2.getExtension('EXT_color_buffer_float');
        capabilities.hasFloatTextures = !!floatExt;
      } catch {
        capabilities.hasFloatTextures = false;
      }
      
      console.log('[WebGL] WebGL2 capabilities detected:', capabilities);
      return capabilities;
    }
  } catch (e) {
    console.warn('[WebGL] WebGL2 detection failed:', e);
    capabilities.error = `WebGL2 error: ${e}`;
  }

  // Test WebGL1
  try {
    const gl1Context = testCanvas.getContext('webgl') || 
                       testCanvas.getContext('experimental-webgl') ||
                       testCanvas.getContext('moz-webgl') ||
                       testCanvas.getContext('webkit-3d');
    
    if (gl1Context && 'getParameter' in gl1Context) {
      const gl1 = gl1Context as WebGLRenderingContext;
      capabilities.hasWebGL1 = true;
      capabilities.maxTextureSize = gl1.getParameter(gl1.MAX_TEXTURE_SIZE);
      
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
    const glContext = canvas.getContext('webgl2') || canvas.getContext('webgl2-experimental');
    if (glContext && 'getParameter' in glContext) {
      return { gl: glContext as WebGL2RenderingContext, isWebGL2: true, capabilities };
    }
  }
  
  if (capabilities.hasWebGL1) {
    const glContext = canvas.getContext('webgl') || 
                      canvas.getContext('experimental-webgl') ||
                      canvas.getContext('moz-webgl') ||
                      canvas.getContext('webkit-3d');
    if (glContext && 'getParameter' in glContext) {
      return { gl: glContext as WebGLRenderingContext, isWebGL2: false, capabilities };
    }
  }
  
  return { gl: null, isWebGL2: false, capabilities };
}