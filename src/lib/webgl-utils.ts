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
  console.log(`[WebGL] 🎯 Creating 3D LUT texture - Size: ${size}, Data length: ${lutData.length}`);
  
  // Debug: Log first 10 values to verify data integrity
  const first10Values = Array.from(lutData.slice(0, 10)).map(v => v.toFixed(6));
  console.log(`[WebGL] 📊 Input data first 10 values:`, first10Values.join(', '));
  
  // Calculate unique data fingerprint for verification
  const dataFingerprint = Array.from(lutData.slice(0, 50)).reduce((sum, val, idx) => sum + val * (idx + 1), 0);
  console.log(`[WebGL] 🔍 Data fingerprint:`, dataFingerprint.toFixed(6));
  
  const texture = gl.createTexture();
  if (!texture) {
    console.error('[WebGL] ❌ Failed to create texture');
    return null;
  }

  console.log(`[WebGL] ✅ New texture created with unique ID:`, texture);
  console.log(`[WebGL] 🆔 Texture object properties:`, {
    constructor: texture.constructor.name,
    toString: texture.toString(),
    isUnique: texture !== null
  });
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
  
  // INVESTIGATION: The issue is not channel swapping but INDEX ORDERING
  // F-PRO400H shows blue saturation (1.0) at midpoint - indicates wrong INDEX calculation
  const lutTexData = new Uint8Array(size * size * size * 4);
  
  // CORRECTED: .cube files use standard red-first ordering: r + g*size + b*size*size
  // The issue was in coordinate mapping, not index ordering
  
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        // Standard .cube format: red varies fastest, then green, then blue
        const lutIndex = r + g * size + b * size * size; // Standard red-first order
        // 2D texture layout: X = red + blue * size, Y = green (matches shader expectations)
        const texIndex = ((r + b * size) + g * size * size) * 4;
        
        if (lutIndex < lutData.length / 3 && texIndex < lutTexData.length - 3) {
          const rValue = Math.max(0, Math.min(1, lutData[lutIndex * 3]));
          const gValue = Math.max(0, Math.min(1, lutData[lutIndex * 3 + 1]));
          const bValue = Math.max(0, Math.min(1, lutData[lutIndex * 3 + 2]));
          
          lutTexData[texIndex] = Math.round(rValue * 255);     // R
          lutTexData[texIndex + 1] = Math.round(gValue * 255); // G
          lutTexData[texIndex + 2] = Math.round(bValue * 255); // B
          lutTexData[texIndex + 3] = 255; // A
        }
      }
    }
  }

  // Debug: Log texture data before upload
  const first12TexValues = Array.from(lutTexData.slice(0, 12));
  console.log(`[WebGL] 🎨 LUT Texture Creation - First 12 RGBA values:`, first12TexValues.join(', '));
  
  // Calculate checksum for verification
  const textureChecksum = Array.from(lutTexData.slice(0, 100)).reduce((sum, val) => sum + val, 0);
  console.log(`[WebGL] 🔢 LUT Texture Creation - Checksum (first 100 values):`, textureChecksum);
  
  // Log some key sample points to verify data structure
  console.log(`[WebGL] 📊 LUT Texture Samples:`, {
    black: `(${lutTexData[0]}, ${lutTexData[1]}, ${lutTexData[2]})`,
    sample1: `(${lutTexData[256]}, ${lutTexData[257]}, ${lutTexData[258]})`,
    sample2: `(${lutTexData[512]}, ${lutTexData[513]}, ${lutTexData[514]})`
  });

  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, size * size, size, 0, format, type, lutTexData);
  
  // Verify texture upload
  const error = gl.getError();
  if (error !== gl.NO_ERROR) {
    console.error(`[WebGL] ❌ Error uploading texture data: ${error}`);
  } else {
    console.log(`[WebGL] ✅ Texture data uploaded successfully`);
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  console.log(`[WebGL] ✅ Created ${size}x${size}x${size} LUT texture (${lutTexData.length / 4} pixels)`);
  console.log(`[WebGL] Texture dimensions: ${size * size}x${size} (2D representation)`);
  console.log(`[WebGL] Texture format:`, { internalFormat, format, type: type === gl.UNSIGNED_BYTE ? 'UNSIGNED_BYTE' : 'OTHER' });
  
  // Enhanced debugging for texture data
  const first12Values = Array.from(lutTexData.slice(0, 12));
  const last12Values = Array.from(lutTexData.slice(-12));
  
  console.log(`[WebGL] Texture data verification:`, {
    totalBytes: lutTexData.length,
    expectedBytes: size * size * size * 4,
    first12Values,
    last12Values,
    dataType: lutTexData.constructor.name
  });
  
  // Convert first few values back to normalized range for comparison
  const first3Pixels = [];
  for (let i = 0; i < Math.min(12, lutTexData.length); i += 4) {
    first3Pixels.push([
      (lutTexData[i] / 255).toFixed(6),
      (lutTexData[i + 1] / 255).toFixed(6),
      (lutTexData[i + 2] / 255).toFixed(6)
    ]);
  }
  console.log(`[WebGL] First 3 pixels (normalized):`, first3Pixels);
  
  // Sample some specific coordinates for verification
  const sampleCoords = [
    { x: 0, y: 0, expected: 'black point' },
    { x: size * size - 1, y: size - 1, expected: 'white point' },
    { x: Math.floor(size * size / 2), y: Math.floor(size / 2), expected: 'midpoint' }
  ];
  
  sampleCoords.forEach(({ x, y, expected }) => {
    if (x < size * size && y < size) {
      // Use same coordinate mapping as texture creation
      const index = (x + y * size * size) * 4;
      if (index + 3 < lutTexData.length) {
        console.log(`[WebGL] Sample ${expected} (${x},${y}):`, [
          (lutTexData[index] / 255).toFixed(6),
          (lutTexData[index + 1] / 255).toFixed(6),
          (lutTexData[index + 2] / 255).toFixed(6)
        ]);
      }
    }
  });
  
  return texture;
}

export function loadImageToTexture(
  gl: WebGL2RenderingContext,
  image: HTMLImageElement
): WebGLTexture | null {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
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
    // Photoshop-compatible LUT application with proper sRGB handling
    vec3 sRGBToLinear(vec3 srgb) {
      // More accurate sRGB to linear conversion (closer to Photoshop)
      return mix(
        srgb / 12.92,
        pow((srgb + 0.055) / 1.055, vec3(2.4)),
        step(0.04045, srgb)
      );
    }
    
    vec3 linearToSRGB(vec3 linear) {
      // More accurate linear to sRGB conversion (closer to Photoshop)
      return mix(
        linear * 12.92,
        1.055 * pow(linear, vec3(1.0 / 2.4)) - 0.055,
        step(0.0031308, linear)
      );
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
      
      // FIXED: Corrected 3D LUT coordinate mapping
      // The original had BGR/RGB confusion in the coordinate calculation
      
      // Scale color to LUT grid coordinates [0, lutSize-1]
      vec3 scaledColor = color * (lutSize - 1.0);
      vec3 lutIndex = floor(scaledColor);
      vec3 lutFract = scaledColor - lutIndex;
      
      // Ensure indices are within bounds
      lutIndex = min(lutIndex, vec3(lutSize - 1.0));
      
      // CORRECTED: 3D to 2D texture mapping
      // In a flattened 3D LUT texture arranged as size*size x size:
      // - X axis: red channel (0 to lutSize-1)
      // - Y axis: green channel (0 to lutSize-1) 
      // - Z axis: blue channel, mapped to X offset in 2D texture
      
      // Sample 8 neighboring points for trilinear interpolation
      float z0 = lutIndex.z;
      float z1 = min(z0 + 1.0, lutSize - 1.0);
      
      // Calculate 2D texture coordinates for each 3D point
      // Format: X = red + blue * lutSize, Y = green
      vec2 coord000 = vec2(
        (lutIndex.x + z0 * lutSize + 0.5) / (lutSize * lutSize),
        (lutIndex.y + 0.5) / lutSize
      );
      
      vec2 coord100 = vec2(
        (min(lutIndex.x + 1.0, lutSize - 1.0) + z0 * lutSize + 0.5) / (lutSize * lutSize),
        (lutIndex.y + 0.5) / lutSize
      );
      
      vec2 coord010 = vec2(
        (lutIndex.x + z0 * lutSize + 0.5) / (lutSize * lutSize),
        (min(lutIndex.y + 1.0, lutSize - 1.0) + 0.5) / lutSize
      );
      
      vec2 coord110 = vec2(
        (min(lutIndex.x + 1.0, lutSize - 1.0) + z0 * lutSize + 0.5) / (lutSize * lutSize),
        (min(lutIndex.y + 1.0, lutSize - 1.0) + 0.5) / lutSize
      );
      
      vec2 coord001 = vec2(
        (lutIndex.x + z1 * lutSize + 0.5) / (lutSize * lutSize),
        (lutIndex.y + 0.5) / lutSize
      );
      
      vec2 coord101 = vec2(
        (min(lutIndex.x + 1.0, lutSize - 1.0) + z1 * lutSize + 0.5) / (lutSize * lutSize),
        (lutIndex.y + 0.5) / lutSize
      );
      
      vec2 coord011 = vec2(
        (lutIndex.x + z1 * lutSize + 0.5) / (lutSize * lutSize),
        (min(lutIndex.y + 1.0, lutSize - 1.0) + 0.5) / lutSize
      );
      
      vec2 coord111 = vec2(
        (min(lutIndex.x + 1.0, lutSize - 1.0) + z1 * lutSize + 0.5) / (lutSize * lutSize),
        (min(lutIndex.y + 1.0, lutSize - 1.0) + 0.5) / lutSize
      );
      
      // Sample all 8 corner points of the cube
      vec3 c000 = ${textureFunc}(lut, coord000).rgb;
      vec3 c100 = ${textureFunc}(lut, coord100).rgb;
      vec3 c010 = ${textureFunc}(lut, coord010).rgb;
      vec3 c110 = ${textureFunc}(lut, coord110).rgb;
      vec3 c001 = ${textureFunc}(lut, coord001).rgb;
      vec3 c101 = ${textureFunc}(lut, coord101).rgb;
      vec3 c011 = ${textureFunc}(lut, coord011).rgb;
      vec3 c111 = ${textureFunc}(lut, coord111).rgb;
      
      // Trilinear interpolation
      // First interpolate along X (red) axis
      vec3 c00 = mix(c000, c100, lutFract.x);
      vec3 c01 = mix(c001, c101, lutFract.x);
      vec3 c10 = mix(c010, c110, lutFract.x);
      vec3 c11 = mix(c011, c111, lutFract.x);
      
      // Then interpolate along Y (green) axis
      vec3 c0 = mix(c00, c10, lutFract.y);
      vec3 c1 = mix(c01, c11, lutFract.y);
      
      // Finally interpolate along Z (blue) axis
      vec3 result = mix(c0, c1, lutFract.z);
      
      // REMOVED: Global color correction (this was masking the real issue)
      // The coordinate fix should eliminate the green cast
      
      return result;
    }
  `;

  const commonMain = `
    void main() {
      vec3 originalColor = ${textureFunc}(u_image, v_texCoord).rgb;
      vec3 color = originalColor;
      
      // Debug: Confirmed individual LUTs work correctly - now use proper blending
      
      // Apply multiple LUT layers with sequential cascade transformation (Photoshop-compatible)
      // Sequential cascade: 画像 → LUT1変換 → LUT2変換 → 最終
      
      // Apply first LUT layer - transforms original image
      if (u_opacity1 > 0.0 && u_lutSize1 > 1.0) {
        vec3 lutColor1 = applyLUT(u_lut1, color, u_lutSize1);
        color = mix(color, lutColor1, u_opacity1);
      }
      
      // Apply second LUT layer - operates on output of first LUT (sequential cascade)
      if (u_opacity2 > 0.0 && u_lutSize2 > 1.0) {
        vec3 lutColor2 = applyLUT(u_lut2, color, u_lutSize2);  // Use current color, not original
        color = mix(color, lutColor2, u_opacity2);
      }
      
      // Apply third LUT layer - continues sequential cascade transformation
      if (u_opacity3 > 0.0 && u_lutSize3 > 1.0) {
        vec3 lutColor3 = applyLUT(u_lut3, color, u_lutSize3);  // Use current color, not original
        color = mix(color, lutColor3, u_opacity3);
      }
      
      fragColor = vec4(color, 1.0);
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