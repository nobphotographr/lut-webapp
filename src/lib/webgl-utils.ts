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

  // Convert 3D LUT to 2D texture representation
  const lutTexData = new Uint8Array(size * size * size * 4);
  for (let i = 0; i < size * size * size; i++) {
    lutTexData[i * 4] = Math.floor(lutData[i * 3] * 255);     // R
    lutTexData[i * 4 + 1] = Math.floor(lutData[i * 3 + 1] * 255); // G
    lutTexData[i * 4 + 2] = Math.floor(lutData[i * 3 + 2] * 255); // B
    lutTexData[i * 4 + 3] = 255; // A
  }

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size * size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, lutTexData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

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
  precision mediump float;
  
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
  uniform vec2 u_watermarkPos;
  uniform vec2 u_watermarkSize;
  uniform float u_watermarkOpacity;
  
  in vec2 v_texCoord;
  out vec4 fragColor;
  
  vec3 applyLUT(sampler2D lut, vec3 color) {
    float lutSize = 17.0;
    float scale = (lutSize - 1.0) / lutSize;
    float offset = 1.0 / (2.0 * lutSize);
    
    color = clamp(color, 0.0, 1.0);
    
    float blue = color.b * scale + offset;
    float yOffset = floor(blue * lutSize) / lutSize;
    float xOffset = blue - yOffset * lutSize;
    
    vec2 lutPos1 = vec2(xOffset + color.r * scale / lutSize, yOffset + color.g * scale);
    vec2 lutPos2 = vec2(xOffset + color.r * scale / lutSize, yOffset + 1.0/lutSize + color.g * scale);
    
    vec3 color1 = texture(lut, lutPos1).rgb;
    vec3 color2 = texture(lut, lutPos2).rgb;
    
    float mixAmount = fract(blue * lutSize);
    return mix(color1, color2, mixAmount);
  }
  
  void main() {
    vec3 color = texture(u_image, v_texCoord).rgb;
    
    if (u_enabled1 && u_opacity1 > 0.0) {
      vec3 lut1Color = applyLUT(u_lut1, color);
      color = mix(color, lut1Color, u_opacity1);
    }
    
    if (u_enabled2 && u_opacity2 > 0.0) {
      vec3 lut2Color = applyLUT(u_lut2, color);
      color = mix(color, lut2Color, u_opacity2);
    }
    
    if (u_enabled3 && u_opacity3 > 0.0) {
      vec3 lut3Color = applyLUT(u_lut3, color);
      color = mix(color, lut3Color, u_opacity3);
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