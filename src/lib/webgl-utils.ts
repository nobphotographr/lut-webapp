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

  console.log(`Created ${size}x${size}x${size} LUT texture (${lutTexData.length / 4} pixels)`);
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
  const commonLUTFunction = `
    // Enhanced LUT application with trilinear interpolation and gamma correction
    vec3 sRGBToLinear(vec3 srgb) {
      return pow(srgb, vec3(2.2));
    }
    
    vec3 linearToSRGB(vec3 linear) {
      return pow(linear, vec3(1.0 / 2.2));
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
      vec3 c000 = texture2D(lut, slice0Coord).rgb;
      vec3 c100 = texture2D(lut, slice0CoordX).rgb;
      vec3 c010 = texture2D(lut, slice0CoordY).rgb;
      vec3 c110 = texture2D(lut, slice0CoordXY).rgb;
      vec3 c001 = texture2D(lut, slice1Coord).rgb;
      vec3 c101 = texture2D(lut, slice1CoordX).rgb;
      vec3 c011 = texture2D(lut, slice1CoordY).rgb;
      vec3 c111 = texture2D(lut, slice1CoordXY).rgb;
      
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
      vec3 color = texture2D(u_image, v_texCoord).rgb;
      
      // Apply first LUT if enabled (simple version for compatibility)
      if (u_opacity1 > 0.0 && u_lutSize1 > 1.0) {
        vec3 lutColor = applyLUT(u_lut1, color, u_lutSize1);
        color = mix(color, lutColor, u_opacity1);
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
      
      ${commonLUTFunction.replace('texture2D', 'texture')}
      
      ${commonMain.replace('gl_FragColor', 'fragColor').replace('texture2D', 'texture')}
    `;
  } else {
    return `
      precision highp float;
      
      uniform sampler2D u_image;
      uniform sampler2D u_lut1;
      uniform float u_opacity1;
      uniform float u_lutSize1;
      
      varying vec2 v_texCoord;
      
      ${commonLUTFunction}
      
      ${commonMain}
    `;
  }
}

// Legacy exports for compatibility
export const VERTEX_SHADER_SOURCE = getVertexShaderSource(true);
export const FRAGMENT_SHADER_SOURCE = getFragmentShaderSource(true);