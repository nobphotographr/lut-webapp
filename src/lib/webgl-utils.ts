export function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  console.log('[WebGL] Creating shader type:', type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT');
  const shader = gl.createShader(type);
  if (!shader) {
    console.error('[WebGL] Failed to create shader');
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[WebGL] Shader compilation error:', gl.getShaderInfoLog(shader));
    console.error('[WebGL] Shader source:', source);
    gl.deleteShader(shader);
    return null;
  }

  console.log('[WebGL] Shader compiled successfully');
  return shader;
}

export function createProgram(
  gl: WebGL2RenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program linking error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export function createTexture(
  gl: WebGL2RenderingContext,
  image: HTMLImageElement | ImageData | null = null
): WebGLTexture | null {
  const texture = gl.createTexture();
  if (!texture) return null;

  gl.bindTexture(gl.TEXTURE_2D, texture);

  if (image instanceof HTMLImageElement) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  } else if (image instanceof ImageData) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image.data);
  } else {
    // Empty texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  }

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return texture;
}

export function create3DLUTTexture(
  gl: WebGL2RenderingContext,
  lutData: Float32Array,
  size: number
): WebGLTexture | null {
  const texture = gl.createTexture();
  if (!texture) return null;

  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  // Check texture size limits
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  const requiredWidth = size * size;
  const requiredHeight = size;
  
  console.log(`[WebGL] LUT texture requirements: ${requiredWidth}x${requiredHeight}, Max texture size: ${maxTextureSize}`);
  
  if (requiredWidth > maxTextureSize || requiredHeight > maxTextureSize) {
    console.warn(`[WebGL] LUT texture too large (${requiredWidth}x${requiredHeight}), max supported: ${maxTextureSize}`);
    // For now, continue with the large texture and let WebGL handle it
    // In the future, we could implement downsampling here
  }

  // Enhanced 8-bit precision with better rounding and gamma adjustment
  console.log('[LUT] Using enhanced 8-bit texture with improved interpolation');
  
  // Use enhanced processing instead of problematic float textures
  const internalFormat = gl.RGBA;
  const format = gl.RGBA;
  const type = gl.UNSIGNED_BYTE;
  
  // Enhanced 8-bit precision with better rounding and gamma adjustment for stronger LUT effects
  const lutTexData = new Uint8Array(size * size * size * 4);
  for (let i = 0; i < size * size * size; i++) {
    // Apply contrast enhancement to make LUT effects more pronounced
    const contrastBoost = 1.15; // 15% contrast increase
    const gammaAdjust = 1.05;   // Slight gamma adjustment
    
    let r = Math.max(0, Math.min(1, lutData[i * 3]));
    let g = Math.max(0, Math.min(1, lutData[i * 3 + 1]));
    let b = Math.max(0, Math.min(1, lutData[i * 3 + 2]));
    
    // Apply contrast boost: (color - 0.5) * contrast + 0.5
    r = Math.max(0, Math.min(1, (r - 0.5) * contrastBoost + 0.5));
    g = Math.max(0, Math.min(1, (g - 0.5) * contrastBoost + 0.5));
    b = Math.max(0, Math.min(1, (b - 0.5) * contrastBoost + 0.5));
    
    // Apply gamma adjustment for enhanced vibrancy
    r = Math.pow(r, 1.0 / gammaAdjust);
    g = Math.pow(g, 1.0 / gammaAdjust);
    b = Math.pow(b, 1.0 / gammaAdjust);
    
    lutTexData[i * 4] = Math.round(r * 255);     // R
    lutTexData[i * 4 + 1] = Math.round(g * 255); // G
    lutTexData[i * 4 + 2] = Math.round(b * 255); // B
    lutTexData[i * 4 + 3] = 255; // A
  }

  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, size * size, size, 0, format, type, lutTexData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  console.log(`[WebGL] Created ${size}x${size}x${size} LUT texture (${lutTexData.length / 4} pixels)`);
  console.log(`[WebGL] Texture dimensions: ${size * size}x${size} (2D representation)`);
  
  // Debug Blue Sierra specifically
  if (lutTexData instanceof Uint8Array && size === 64) {
    console.log(`[WebGL] Blue Sierra texture sample (first 12 values):`, Array.from(lutTexData.slice(0, 12)));
  }
  
  return texture;
}

export function loadImageToTexture(
  gl: WebGL2RenderingContext,
  image: HTMLImageElement
): WebGLTexture | null {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // WebGLの最大テクスチャサイズを取得
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  
  // 必要に応じて画像をリサイズ
  let targetWidth = image.width;
  let targetHeight = image.height;
  
  if (targetWidth > maxTextureSize || targetHeight > maxTextureSize) {
    const scale = Math.min(maxTextureSize / targetWidth, maxTextureSize / targetHeight);
    targetWidth = Math.floor(targetWidth * scale);
    targetHeight = Math.floor(targetHeight * scale);
    console.log(`Resizing image from ${image.width}×${image.height} to ${targetWidth}×${targetHeight} for WebGL compatibility`);
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  
  // 高品質なリサイズ設定
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return createTexture(gl, imageData);
}

export function resizeCanvas(canvas: HTMLCanvasElement, width: number, height: number): void {
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

// WebGL shader sources with version detection
export function getVertexShaderSource(isWebGL2: boolean): string {
  if (isWebGL2) {
    return `#version 300 es
      in vec2 a_position;
      in vec2 a_texCoord;
      out vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;
  } else {
    return `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;
  }
}

export function getFragmentShaderSource(isWebGL2: boolean): string {
  // WebGL2 uses 'texture', WebGL1 uses 'texture2D'
  const textureFunc = isWebGL2 ? 'texture' : 'texture2D';
  
  const commonLUTFunction = `
    // Enhanced LUT application with trilinear interpolation and gamma correction
    vec3 sRGBToLinear(vec3 srgb) {
      return pow(srgb, vec3(2.2));
    }
    
    vec3 linearToSRGB(vec3 linear) {
      return pow(linear, vec3(1.0 / 2.2));
    }
    
    // Blend mode functions for advanced layer mixing
    vec3 blendMultiply(vec3 base, vec3 blend) {
      return base * blend;
    }
    
    vec3 blendScreen(vec3 base, vec3 blend) {
      return 1.0 - (1.0 - base) * (1.0 - blend);
    }
    
    vec3 blendOverlay(vec3 base, vec3 blend) {
      return mix(
        2.0 * base * blend,
        1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
        step(0.5, base)
      );
    }
    
    vec3 blendSoftLight(vec3 base, vec3 blend) {
      return mix(
        2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
        sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
        step(0.5, blend)
      );
    }
    
    vec3 blendHardLight(vec3 base, vec3 blend) {
      return blendOverlay(blend, base);
    }
    
    vec3 blendColorDodge(vec3 base, vec3 blend) {
      return mix(base / (1.0 - blend), vec3(1.0), step(0.999, blend));
    }
    
    vec3 blendColorBurn(vec3 base, vec3 blend) {
      return mix(1.0 - (1.0 - base) / blend, vec3(0.0), step(0.001, blend));
    }
    
    // Apply blend mode based on mode parameter
    vec3 applyBlendMode(vec3 base, vec3 blend, float mode) {
      if (mode < 0.5) return blend; // Normal
      else if (mode < 1.5) return blendMultiply(base, blend);
      else if (mode < 2.5) return blendScreen(base, blend);
      else if (mode < 3.5) return blendOverlay(base, blend);
      else if (mode < 4.5) return blendSoftLight(base, blend);
      else if (mode < 5.5) return blendHardLight(base, blend);
      else if (mode < 6.5) return blendColorDodge(base, blend);
      else return blendColorBurn(base, blend);
    }
    
    vec3 applyLUT(sampler2D lut, vec3 color, float lutSize) {
      if (lutSize <= 1.0) return color;
      
      // Ensure input is in valid range
      color = clamp(color, 0.0, 1.0);
      
      // Convert to linear space for more accurate interpolation
      vec3 linearColor = sRGBToLinear(color);
      
      // Scale color to LUT coordinates
      vec3 lutCoord = linearColor * (lutSize - 1.0);
      vec3 lutIndex = floor(lutCoord);
      vec3 lutFract = lutCoord - lutIndex;
      
      float sliceSize = lutSize;
      
      // Sample 8 neighboring points for trilinear interpolation
      float z0 = lutIndex.z;
      float z1 = min(z0 + 1.0, lutSize - 1.0);
      
      // Slice 0 coordinates
      vec2 slice0Coord = vec2(
        (lutIndex.x + z0 * sliceSize + 0.5) / (sliceSize * sliceSize),
        (lutIndex.y + 0.5) / sliceSize
      );
      
      vec2 slice0CoordX = vec2(
        (min(lutIndex.x + 1.0, lutSize - 1.0) + z0 * sliceSize + 0.5) / (sliceSize * sliceSize),
        (lutIndex.y + 0.5) / sliceSize
      );
      
      vec2 slice0CoordY = vec2(
        (lutIndex.x + z0 * sliceSize + 0.5) / (sliceSize * sliceSize),
        (min(lutIndex.y + 1.0, lutSize - 1.0) + 0.5) / sliceSize
      );
      
      vec2 slice0CoordXY = vec2(
        (min(lutIndex.x + 1.0, lutSize - 1.0) + z0 * sliceSize + 0.5) / (sliceSize * sliceSize),
        (min(lutIndex.y + 1.0, lutSize - 1.0) + 0.5) / sliceSize
      );
      
      // Slice 1 coordinates
      vec2 slice1Coord = vec2(
        (lutIndex.x + z1 * sliceSize + 0.5) / (sliceSize * sliceSize),
        (lutIndex.y + 0.5) / sliceSize
      );
      
      vec2 slice1CoordX = vec2(
        (min(lutIndex.x + 1.0, lutSize - 1.0) + z1 * sliceSize + 0.5) / (sliceSize * sliceSize),
        (lutIndex.y + 0.5) / sliceSize
      );
      
      vec2 slice1CoordY = vec2(
        (lutIndex.x + z1 * sliceSize + 0.5) / (sliceSize * sliceSize),
        (min(lutIndex.y + 1.0, lutSize - 1.0) + 0.5) / sliceSize
      );
      
      vec2 slice1CoordXY = vec2(
        (min(lutIndex.x + 1.0, lutSize - 1.0) + z1 * sliceSize + 0.5) / (sliceSize * sliceSize),
        (min(lutIndex.y + 1.0, lutSize - 1.0) + 0.5) / sliceSize
      );
      
      // Sample all 8 points
      vec3 c000 = ${textureFunc}(lut, slice0Coord).rgb;
      vec3 c100 = ${textureFunc}(lut, slice0CoordX).rgb;
      vec3 c010 = ${textureFunc}(lut, slice0CoordY).rgb;
      vec3 c110 = ${textureFunc}(lut, slice0CoordXY).rgb;
      vec3 c001 = ${textureFunc}(lut, slice1Coord).rgb;
      vec3 c101 = ${textureFunc}(lut, slice1CoordX).rgb;
      vec3 c011 = ${textureFunc}(lut, slice1CoordY).rgb;
      vec3 c111 = ${textureFunc}(lut, slice1CoordXY).rgb;
      
      // Trilinear interpolation
      vec3 c00 = mix(c000, c100, lutFract.x);
      vec3 c01 = mix(c001, c101, lutFract.x);
      vec3 c10 = mix(c010, c110, lutFract.x);
      vec3 c11 = mix(c011, c111, lutFract.x);
      
      vec3 c0 = mix(c00, c10, lutFract.y);
      vec3 c1 = mix(c01, c11, lutFract.y);
      
      vec3 result = mix(c0, c1, lutFract.z);
      
      // Convert back to sRGB space
      return linearToSRGB(result);
    }
  `;

  const commonMain = `
    void main() {
      vec3 originalColor = ${textureFunc}(u_image, v_texCoord).rgb;
      vec3 color = originalColor;
      
      // Apply multiple LUT layers sequentially with blend modes
      
      // Apply first LUT layer with normal blending (for now)
      if (u_opacity1 > 0.0 && u_lutSize1 > 1.0) {
        vec3 lutColor1 = applyLUT(u_lut1, originalColor, u_lutSize1);
        color = mix(color, lutColor1, u_opacity1);
      }
      
      // Apply second LUT layer with enhanced blending
      if (u_opacity2 > 0.0 && u_lutSize2 > 1.0) {
        vec3 lutColor2 = applyLUT(u_lut2, originalColor, u_lutSize2);
        // For now use normal blending, blend mode support can be added later
        color = mix(color, lutColor2, u_opacity2);
      }
      
      // Apply third LUT layer with enhanced blending
      if (u_opacity3 > 0.0 && u_lutSize3 > 1.0) {
        vec3 lutColor3 = applyLUT(u_lut3, originalColor, u_lutSize3);
        // For now use normal blending, blend mode support can be added later
        color = mix(color, lutColor3, u_opacity3);
      }
      
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  if (isWebGL2) {
    return `#version 300 es
      precision highp float;
      
      uniform sampler2D u_image;
      uniform sampler2D u_lut1;
      uniform sampler2D u_lut2;
      uniform sampler2D u_lut3;
      uniform sampler2D u_watermark;
      uniform float u_opacity1;
      uniform float u_opacity2;
      uniform float u_opacity3;
      uniform int u_enabled1;
      uniform int u_enabled2;
      uniform int u_enabled3;
      uniform float u_lutSize1;
      uniform float u_lutSize2;
      uniform float u_lutSize3;
      uniform vec2 u_watermarkPos;
      uniform vec2 u_watermarkSize;
      uniform float u_watermarkOpacity;
      
      in vec2 v_texCoord;
      out vec4 fragColor;
      
      ${commonLUTFunction}
      
      ${commonMain.replace('gl_FragColor', 'fragColor')}
    `;
  } else {
    return `
      precision highp float;
      
      uniform sampler2D u_image;
      uniform sampler2D u_lut1;
      uniform sampler2D u_lut2;
      uniform sampler2D u_lut3;
      uniform float u_opacity1;
      uniform float u_opacity2;
      uniform float u_opacity3;
      uniform float u_lutSize1;
      uniform float u_lutSize2;
      uniform float u_lutSize3;
      
      varying vec2 v_texCoord;
      
      ${commonLUTFunction}
      
      ${commonMain}
    `;
  }
}

// Legacy exports for compatibility
export const VERTEX_SHADER_SOURCE = getVertexShaderSource(true);
export const FRAGMENT_SHADER_SOURCE = getFragmentShaderSource(true);