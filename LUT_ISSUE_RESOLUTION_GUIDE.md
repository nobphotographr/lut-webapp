# LUT WebGL Processing Issue Resolution Guide

## Problem Summary
The LUT (Look-Up Table) system was applying identical color effects across all different LUT files, causing a universal green color cast instead of each LUT's unique color transformation.

## Root Cause Analysis
1. **3D to 2D Texture Coordinate Mapping Mismatch**: The texture creation algorithm didn't match the shader's coordinate expectations
2. **Index Ordering Confusion**: Misalignment between .cube file format (red-first ordering) and texture layout
3. **Shader Coordinate System**: Fragment shader expected `X = red + blue * size, Y = green` but texture was created differently

## Solution Implementation

### Key Fix: Texture Layout Alignment
**File**: `src/lib/webgl-utils.ts`

**Before (Broken)**:
```typescript
const texIndex = (g * size * size + r * size + b) * 4;
```

**After (Fixed)**:
```typescript
// Standard .cube format: red varies fastest, then green, then blue
const lutIndex = r + g * size + b * size * size; // Standard red-first order
// 2D texture layout: X = red + blue * size, Y = green (matches shader expectations)
const texIndex = ((r + b * size) + g * size * size) * 4;
```

### Supporting Fixes

1. **Diagnostic System Correction**:
   ```typescript
   // Fixed midpoint calculation for proper 3D coordinates
   const midR = Math.floor(size / 2);
   const midG = Math.floor(size / 2);
   const midB = Math.floor(size / 2);
   const midIndex = (midR + midG * size + midB * size * size) * 3;
   ```

2. **Enhanced Debug Logging**:
   - Added comprehensive texture creation logs
   - Verified unique data fingerprints for each LUT
   - Confirmed independent memory buffers

## Verification of Success

### Technical Indicators
- ✅ Each LUT shows unique checksum values:
  - Anderson: `12.796093`
  - Blue Sierra: `12.254907`
  - F-PRO400H: `11.203922`
  - K-Ektar: `14.761700`
  - Pastel Light: `20.333560`

- ✅ Proper texture binding logs:
  - `✅ Bound valid LUT texture to TEXTURE1`
  - `presetName: 'Anderson'` vs `presetName: 'Blue Sierra'`
  - Different `lutIndex` values (1, 2, etc.)

- ✅ Successful WebGL processing:
  - `🏁 create3DLUTTexture returned: SUCCESS`
  - `Draw call completed`
  - `WebGL rendering finished`

### Visual Confirmation
Each LUT now applies its unique color transformation instead of the universal green cast.

## Troubleshooting Guide

### If Green Cast Returns
1. **Check Texture Coordinate Mapping**:
   - Verify `texIndex = ((r + b * size) + g * size * size) * 4` in `webgl-utils.ts`
   - Ensure shader expects `X = red + blue * size, Y = green`

2. **Verify LUT Data Independence**:
   - Look for unique checksum values in console logs
   - Confirm different `Data fingerprint` for each LUT

3. **Debug Texture Binding**:
   - Check for `✅ Bound valid LUT texture` messages
   - Verify correct `presetName` in debug logs
   - Ensure `lutIndex` values differ between LUT selections

### If No LUT Effect Applied
1. **Check Opacity Settings**: Ensure `opacity > 0` in uniform logs
2. **Verify Texture Size**: Confirm `lutSize > 0` (typically 64 or 65)
3. **WebGL Context**: Look for `WebGL rendering finished` success messages

### Critical Log Patterns for Success
```
[LUTProcessor] 🔍 LUT Index Mapping Debug: {layerLutIndex: X, presetName: 'LUT_NAME'}
[LUTProcessor] ✅ Bound valid LUT texture to TEXTURE1
[LUTProcessor] Layer 1 uniforms: {opacity: 0.75, size: 64}
[LUTProcessor] WebGL rendering finished
```

## Sequential Cascade Blending Implementation

### Problem: Linear Blending vs Photoshop Compatibility
The original implementation used linear blending where both LUTs were applied to the original image:
```glsl
vec3 lutColor1 = applyLUT(u_lut1, originalColor, u_lutSize1);
vec3 lutColor2 = applyLUT(u_lut2, originalColor, u_lutSize2);
```

### Solution: Sequential Cascade Transformation
Updated to match Photoshop's "Normal" blend mode behavior:
```glsl
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
```

**Process Flow**: `画像 → LUT1変換 → LUT2変換 → LUT3変換 → 最終`

### Benefits
- ✅ Matches Photoshop's sequential transformation behavior
- ✅ Stronger color intensity as expected by users
- ✅ Professional-grade color grading results

## Watermark Enhancement

### Implementation
Enhanced watermark visibility with dual placement:
- **Bottom-right corner**: Professional discrete watermark
- **Center overlay**: Additional protection for larger images (800x600+)

### Features
- Bold font with shadow effects
- Consistent 0.4 opacity across all watermarks
- Automatic size scaling based on image dimensions
- Applied to both WebGL and Canvas2D processing paths

## Key Files Modified
- `src/lib/webgl-utils.ts`: Core texture coordinate mapping fix + sequential cascade blending
- `src/lib/lut-diagnostic.ts`: Diagnostic system improvements
- `src/lib/lutProcessor.ts`: Enhanced watermark implementation
- `src/lib/canvas2d-processor.ts`: Canvas2D watermark enhancement
- `src/components/ui/LUTController.tsx`: UI improvements (100% default opacity, simplified controls)
- `src/lib/lutProcessor.ts`: Enhanced debug logging

## Prevention
- Always verify texture layout matches shader coordinate expectations
- Maintain comprehensive logging for texture creation and binding
- Test with multiple different LUTs to ensure unique color transformations

This solution ensures each LUT applies its intended unique color transformation without interference from coordinate mapping issues.

## Resolution History
- **Issue Identified**: All LUTs showing identical green cast effect
- **Root Cause**: 3D→2D texture coordinate mapping mismatch
- **Solution Applied**: Aligned texture creation with shader coordinate expectations
- **Status**: ✅ RESOLVED - Each LUT now applies unique color transformations
- **Date**: 2025-01-19