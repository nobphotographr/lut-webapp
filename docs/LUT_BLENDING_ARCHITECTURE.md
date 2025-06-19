# LUT Blending Architecture Documentation

## Overview
This document describes the implementation of Photoshop-compatible sequential cascade LUT blending in the GLAZE Web Application.

## Core Problem
Traditional linear blending applies multiple LUTs to the original image simultaneously, which differs from Photoshop's behavior where LUTs are applied sequentially as layers.

### Linear Blending (Previous Implementation)
```glsl
// Both LUTs operate on original image
vec3 lutColor1 = applyLUT(u_lut1, originalColor, u_lutSize1);
vec3 lutColor2 = applyLUT(u_lut2, originalColor, u_lutSize2);

// Results are blended together
vec3 result = mix(mix(originalColor, lutColor1, opacity1), lutColor2, opacity2);
```

**Problems:**
- Color intensity weaker than Photoshop
- Different visual results from professional workflow
- Non-standard blending behavior

## Sequential Cascade Implementation

### Architecture Overview
```
Original Image → LUT Layer 1 → LUT Layer 2 → LUT Layer 3 → Final Output
     │               │              │              │
     └─────────────→ │              │              │
                     └─────────────→ │              │
                                    └─────────────→ │
```

### Shader Implementation
```glsl
void main() {
  vec3 originalColor = texture2D(u_image, v_texCoord).rgb;
  vec3 color = originalColor;
  
  // Apply first LUT layer - transforms original image
  if (u_opacity1 > 0.0 && u_lutSize1 > 1.0) {
    vec3 lutColor1 = applyLUT(u_lut1, color, u_lutSize1);
    color = mix(color, lutColor1, u_opacity1);
  }
  
  // Apply second LUT layer - operates on output of first LUT
  if (u_opacity2 > 0.0 && u_lutSize2 > 1.0) {
    vec3 lutColor2 = applyLUT(u_lut2, color, u_lutSize2);  // Uses current color
    color = mix(color, lutColor2, u_opacity2);
  }
  
  // Apply third LUT layer - continues the cascade
  if (u_opacity3 > 0.0 && u_lutSize3 > 1.0) {
    vec3 lutColor3 = applyLUT(u_lut3, color, u_lutSize3);  // Uses current color
    color = mix(color, lutColor3, u_opacity3);
  }
  
  gl_FragColor = vec4(color, 1.0);
}
```

## Key Implementation Details

### 1. Color Variable Progression
- `color` variable accumulates transformations
- Each LUT operates on the current state, not the original
- Maintains Photoshop's "Normal" blend mode behavior

### 2. Opacity Handling
- Default opacity: 100% (1.0) for immediate full effect
- User can adjust from 0-100% per layer
- Simplified controls without preset buttons

### 3. Layer Processing Order
1. **Layer 1**: `originalColor` → `LUT1(originalColor)` → `mix(originalColor, LUT1Result, opacity1)`
2. **Layer 2**: `Layer1Result` → `LUT2(Layer1Result)` → `mix(Layer1Result, LUT2Result, opacity2)`
3. **Layer 3**: `Layer2Result` → `LUT3(Layer2Result)` → `mix(Layer2Result, LUT3Result, opacity3)`

## Benefits

### Visual Quality
- ✅ Matches Photoshop's color intensity
- ✅ Professional-grade color grading results
- ✅ Predictable layer interaction behavior

### User Experience
- ✅ Familiar workflow for Photoshop users
- ✅ Intuitive stacking behavior
- ✅ Immediate visual feedback with 100% default opacity

### Technical Advantages
- ✅ GPU-efficient single-pass rendering
- ✅ Minimal performance impact
- ✅ Scalable to additional layers

## File Structure

### Core Implementation
- `src/lib/webgl-utils.ts`: Fragment shader with sequential cascade logic
- `src/lib/lutProcessor.ts`: WebGL processing pipeline
- `src/lib/canvas2d-processor.ts`: Canvas2D fallback with matching behavior

### UI Components
- `src/components/ui/LUTController.tsx`: Layer controls with 100% default opacity
- `src/components/ui/PreviewCanvas.tsx`: Real-time preview rendering

## Testing & Validation

### Manual Testing
1. Apply single LUT at 100% opacity → Verify color accuracy
2. Apply two LUTs sequentially → Compare with Photoshop results
3. Adjust opacity levels → Verify smooth blending behavior

### Visual Validation
- Compare side-by-side with Photoshop reference images
- Verify color intensity matches professional workflow
- Test with various LUT combinations and opacity levels

## Performance Considerations

### GPU Efficiency
- Single-pass rendering maintains 60fps on modern hardware
- Minimal texture memory usage with shared LUT textures
- Optimized uniform updates for real-time interaction

### Memory Management
- LUT textures cached and reused across renders
- Automatic cleanup of WebGL resources
- Canvas2D fallback for resource-constrained environments

## Future Enhancements

### Additional Blend Modes
- Multiply, Screen, Overlay for advanced compositing
- Color space conversion options (sRGB, Rec.709)
- HDR support for 16-bit processing

### Layer Features
- Layer masks for selective application
- Adjustment curves integration
- Export presets for workflow sharing

## Compatibility Notes

### Photoshop Equivalence
- "Normal" blend mode at 100% opacity matches exactly
- Sequential application order preserved
- Color space handling consistent with Adobe standards

### Browser Support
- WebGL 2.0: Chrome 56+, Firefox 51+, Safari 15+
- WebGL 1.0 fallback: Universal browser support
- Canvas2D fallback: Complete compatibility