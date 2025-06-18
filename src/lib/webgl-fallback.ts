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

// WebGL context creation order (most compatible first)
const WEBGL2_CONTEXTS = ['webgl2', 'experimental-webgl2'];
const WEBGL1_CONTEXTS = ['webgl', 'experimental-webgl', 'moz-webgl', 'webkit-3d'];

function tryCreateWebGLContext(canvas: HTMLCanvasElement, contextTypes: string[]): WebGLRenderingContext | WebGL2RenderingContext | null {
  for (const contextType of contextTypes) {
    try {
      // Enhanced WebGL context options for better compatibility
      const contextOptions = {
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true, // Keep buffer for reading back data
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'high-performance' as WebGLPowerPreference,
        desynchronized: false
      };
      
      const context = canvas.getContext(contextType, contextOptions);
      
      if (context && 'getParameter' in context && typeof (context as WebGLRenderingContext).getParameter === 'function') {
        // Test basic WebGL functionality
        const gl = context as WebGLRenderingContext | WebGL2RenderingContext;
        const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        
        console.log(`[WebGL] Successfully created ${contextType} context:`, {
          maxTextureSize: maxTexSize,
          canvasSize: `${canvas.width}x${canvas.height}`,
          vendor: gl.getParameter(gl.VENDOR),
          renderer: gl.getParameter(gl.RENDERER)
        });
        
        return gl;
      }
    } catch (e) {
      console.warn(`[WebGL] Failed to create context ${contextType}:`, e);
    }
  }
  return null;
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

  // Test WebGL2 first
  console.log('[WebGL] Testing WebGL2 support...');
  const webgl2Context = tryCreateWebGLContext(testCanvas, WEBGL2_CONTEXTS);
  
  if (webgl2Context && webgl2Context instanceof WebGL2RenderingContext) {
    capabilities.hasWebGL2 = true;
    capabilities.maxTextureSize = webgl2Context.getParameter(webgl2Context.MAX_TEXTURE_SIZE);
    
    // Check float texture support
    try {
      const floatExt = webgl2Context.getExtension('EXT_color_buffer_float');
      capabilities.hasFloatTextures = !!floatExt;
    } catch {
      capabilities.hasFloatTextures = false;
    }
    
    console.log('[WebGL] WebGL2 capabilities detected:', capabilities);
    return capabilities;
  }

  // Fallback to WebGL1
  console.log('[WebGL] WebGL2 not available, testing WebGL1...');
  const webgl1Context = tryCreateWebGLContext(testCanvas, WEBGL1_CONTEXTS);
  
  if (webgl1Context) {
    capabilities.hasWebGL1 = true;
    capabilities.maxTextureSize = webgl1Context.getParameter(webgl1Context.MAX_TEXTURE_SIZE);
    
    console.log('[WebGL] WebGL1 capabilities detected:', capabilities);
    return capabilities;
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

  console.log('[WebGL] Getting optimal WebGL context for canvas:', canvas.width, 'x', canvas.height);
  
  // Try WebGL2 first
  const webgl2Context = tryCreateWebGLContext(canvas, WEBGL2_CONTEXTS);
  if (webgl2Context && webgl2Context instanceof WebGL2RenderingContext) {
    const capabilities = {
      hasWebGL2: true,
      hasWebGL1: false,
      maxTextureSize: webgl2Context.getParameter(webgl2Context.MAX_TEXTURE_SIZE),
      hasFloatTextures: !!webgl2Context.getExtension('EXT_color_buffer_float')
    };
    
    console.log('[WebGL] WebGL2 context created successfully');
    return { gl: webgl2Context, isWebGL2: true, capabilities };
  }
  
  // Fallback to WebGL1
  const webgl1Context = tryCreateWebGLContext(canvas, WEBGL1_CONTEXTS);
  if (webgl1Context) {
    const capabilities = {
      hasWebGL2: false,
      hasWebGL1: true,
      maxTextureSize: webgl1Context.getParameter(webgl1Context.MAX_TEXTURE_SIZE),
      hasFloatTextures: false
    };
    
    console.log('[WebGL] WebGL1 context created successfully');
    return { gl: webgl1Context, isWebGL2: false, capabilities };
  }
  
  // No WebGL support
  console.error('[WebGL] Failed to create any WebGL context');
  return {
    gl: null,
    isWebGL2: false,
    capabilities: {
      hasWebGL2: false,
      hasWebGL1: false,
      maxTextureSize: 0,
      hasFloatTextures: false,
      error: 'No WebGL support available'
    }
  };
}