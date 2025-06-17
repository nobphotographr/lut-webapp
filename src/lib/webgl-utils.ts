export function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

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

  // Convert 3D LUT to 2D texture representation with higher precision
  const lutTexData = new Uint8Array(size * size * size * 4);
  for (let i = 0; i < size * size * size; i++) {
    // Use Math.round instead of Math.floor for better precision
    lutTexData[i * 4] = Math.round(Math.min(255, Math.max(0, lutData[i * 3] * 255)));     // R
    lutTexData[i * 4 + 1] = Math.round(Math.min(255, Math.max(0, lutData[i * 3 + 1] * 255))); // G
    lutTexData[i * 4 + 2] = Math.round(Math.min(255, Math.max(0, lutData[i * 3 + 2] * 255))); // B
    lutTexData[i * 4 + 3] = 255; // A
  }

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size * size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, lutTexData);
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

  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return createTexture(gl, imageData);
}

export function resizeCanvas(canvas: HTMLCanvasElement, width: number, height: number): void {
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

export const VERTEX_SHADER_SOURCE = `#version 300 es
  in vec2 a_position;
  in vec2 a_texCoord;
  out vec2 v_texCoord;
  
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

export const FRAGMENT_SHADER_SOURCE = `#version 300 es
  precision highp float;
  
  uniform sampler2D u_image;
  uniform sampler2D u_lut1;
  uniform sampler2D u_lut2;
  uniform sampler2D u_lut3;
  uniform sampler2D u_watermark;
  uniform float u_opacity1;
  uniform float u_opacity2;
  uniform float u_opacity3;
  uniform bool u_enabled1;
  uniform bool u_enabled2;
  uniform bool u_enabled3;
  uniform float u_lutSize1;
  uniform float u_lutSize2;
  uniform float u_lutSize3;
  uniform vec2 u_watermarkPos;
  uniform vec2 u_watermarkSize;
  uniform float u_watermarkOpacity;
  
  in vec2 v_texCoord;
  out vec4 fragColor;
  
  // ガンマ補正関数
  vec3 sRGBToLinear(vec3 color) {
    return pow(color, vec3(2.2));
  }
  
  vec3 linearToSRGB(vec3 color) {
    return pow(color, vec3(1.0/2.2));
  }
  
  // 高精度3D LUT適用関数
  vec3 applyLUT(sampler2D lut, vec3 color, float lutSize) {
    if (lutSize <= 1.0) return color;
    
    // sRGB色空間での処理（Photoshop互換）
    color = clamp(color, 0.0, 1.0);
    
    // 3D座標計算
    vec3 lutCoord = color * (lutSize - 1.0);
    vec3 lutIndex = floor(lutCoord);
    vec3 lutFraction = lutCoord - lutIndex;
    
    // 2Dテクスチャでの正確なマッピング
    float sliceSize = lutSize;
    float zSlice = lutIndex.z;
    
    // 隣接する2つのスライス座標計算
    vec2 slice1Coord = vec2(
      (lutIndex.x + zSlice * sliceSize) / (sliceSize * sliceSize),
      lutIndex.y / sliceSize
    );
    
    vec2 slice2Coord = vec2(
      (lutIndex.x + min(zSlice + 1.0, lutSize - 1.0) * sliceSize) / (sliceSize * sliceSize),
      lutIndex.y / sliceSize
    );
    
    // テクスチャサンプリング用の微調整
    vec2 texelSize = vec2(1.0 / (sliceSize * sliceSize), 1.0 / sliceSize);
    slice1Coord += texelSize * 0.5;
    slice2Coord += texelSize * 0.5;
    
    // 4点バイリニア補間のための座標
    vec2 slice1Coord2 = slice1Coord + vec2(texelSize.x, 0.0);
    vec2 slice1Coord3 = slice1Coord + vec2(0.0, texelSize.y);
    vec2 slice1Coord4 = slice1Coord + texelSize;
    
    vec2 slice2Coord2 = slice2Coord + vec2(texelSize.x, 0.0);
    vec2 slice2Coord3 = slice2Coord + vec2(0.0, texelSize.y);
    vec2 slice2Coord4 = slice2Coord + texelSize;
    
    // スライス1の4点サンプリング
    vec3 c000 = texture(lut, slice1Coord).rgb;
    vec3 c100 = texture(lut, slice1Coord2).rgb;
    vec3 c010 = texture(lut, slice1Coord3).rgb;
    vec3 c110 = texture(lut, slice1Coord4).rgb;
    
    // スライス2の4点サンプリング
    vec3 c001 = texture(lut, slice2Coord).rgb;
    vec3 c101 = texture(lut, slice2Coord2).rgb;
    vec3 c011 = texture(lut, slice2Coord3).rgb;
    vec3 c111 = texture(lut, slice2Coord4).rgb;
    
    // 3線形補間
    vec3 c00 = mix(c000, c100, lutFraction.x);
    vec3 c10 = mix(c010, c110, lutFraction.x);
    vec3 c01 = mix(c001, c101, lutFraction.x);
    vec3 c11 = mix(c011, c111, lutFraction.x);
    
    vec3 c0 = mix(c00, c10, lutFraction.y);
    vec3 c1 = mix(c01, c11, lutFraction.y);
    
    return mix(c0, c1, lutFraction.z);
  }
  
  // Photoshop互換のブレンド
  vec3 photoshopBlend(vec3 base, vec3 overlay, float opacity) {
    // 適度なガンマ補正でより自然な結果
    base = pow(base, vec3(1.8));
    overlay = pow(overlay, vec3(1.8));
    
    vec3 result = mix(base, overlay, opacity * 0.7); // 不透明度を70%に調整
    result = clamp(result, 0.0, 1.0);
    
    return pow(result, vec3(1.0/1.8));
  }
  
  void main() {
    vec3 color = texture(u_image, v_texCoord).rgb;
    
    if (u_enabled1 && u_opacity1 > 0.0 && u_lutSize1 > 1.0) {
      vec3 lut1Color = applyLUT(u_lut1, color, u_lutSize1);
      color = photoshopBlend(color, lut1Color, u_opacity1);
    }
    
    if (u_enabled2 && u_opacity2 > 0.0 && u_lutSize2 > 1.0) {
      vec3 lut2Color = applyLUT(u_lut2, color, u_lutSize2);
      color = photoshopBlend(color, lut2Color, u_opacity2);
    }
    
    if (u_enabled3 && u_opacity3 > 0.0 && u_lutSize3 > 1.0) {
      vec3 lut3Color = applyLUT(u_lut3, color, u_lutSize3);
      color = photoshopBlend(color, lut3Color, u_opacity3);
    }
    
    // Apply watermark
    vec2 watermarkCoord = (v_texCoord - u_watermarkPos) / u_watermarkSize;
    if (watermarkCoord.x >= 0.0 && watermarkCoord.x <= 1.0 && 
        watermarkCoord.y >= 0.0 && watermarkCoord.y <= 1.0) {
      vec4 watermarkColor = texture(u_watermark, watermarkCoord);
      color = mix(color, watermarkColor.rgb, watermarkColor.a * u_watermarkOpacity);
    }
    
    fragColor = vec4(color, 1.0);
  }
`;