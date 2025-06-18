# GLAZE LUT Web Application - User Guide

## 🌟 Welcome to GLAZE

GLAZE LUT Web Application is a professional color grading tool that brings the power of 3D LUT processing to your web browser. This guide will help you get the most out of the application.

## 🚀 Getting Started

### System Requirements
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, or Edge 90+
- **WebGL**: WebGL 2.0 support required
- **Memory**: 4GB+ RAM recommended for large images
- **Internet**: Stable connection for loading LUT files

### First Time Use
1. Open your web browser and navigate to the GLAZE application
2. The interface will load with two main sections:
   - **Left Panel**: Image upload and LUT controls
   - **Right Panel**: Preview canvas and quality analysis

## 📤 Uploading Images

### Supported Formats
- **JPEG**: Most common format, up to 10MB
- **PNG**: Higher quality, transparency support
- **Maximum Size**: 4096 × 4096 pixels

### Upload Methods

#### Drag & Drop (Recommended)
1. Locate the upload area on the left side
2. Drag your image file from your computer
3. Drop it onto the upload area
4. The image will be validated and loaded automatically

#### Click to Upload
1. Click on the upload area
2. Select your image file from the file browser
3. Click "Open" to confirm

### Upload Validation
The application automatically checks:
- ✅ File format compatibility
- ✅ File size limits
- ✅ Image dimensions
- ✅ File integrity

If validation fails, you'll see a clear error message explaining the issue.

## 🎨 Applying LUT Effects

### Understanding LUT Layers
GLAZE supports up to **3 simultaneous LUT layers**, allowing for complex color grading:

- **Layer 1**: Primary color correction
- **Layer 2**: Secondary adjustments or creative effects
- **Layer 3**: Final touches or film emulation

### Available LUT Files
The application includes 5 professional LUT presets:

1. **Anderson**: Warm, cinematic look with enhanced contrast
2. **Blue Sierra**: Cool, modern aesthetic with blue undertones
3. **F-PRO400H**: Film emulation inspired by Fuji Pro 400H
4. **K-Ektar**: Vibrant, saturated colors inspired by Kodak Ektar
5. **Pastel Light**: Soft, dreamy look with lifted shadows

### Applying a LUT

#### Step 1: Enable a Layer
1. Locate the "LUTレイヤー" section
2. Find "レイヤー 1" (Layer 1)
3. Check the "有効" (Enable) checkbox

#### Step 2: Select a LUT File
1. Click the "LUTファイル" dropdown
2. Choose from the available options:
   - **なし (Original)**: No effect applied
   - **Anderson**: Cinematic warm look
   - **Blue Sierra**: Cool modern aesthetic
   - **F-PRO400H**: Film emulation
   - **K-Ektar**: Vibrant colors
   - **Pastel Light**: Soft dreamy look

#### Step 3: Adjust Opacity
1. Use the opacity slider below the LUT selection
2. **0%**: No effect (original image)
3. **25%**: Subtle, natural enhancement
4. **75%**: Standard Photoshop intensity
5. **100%**: Maximum effect

### Quick Opacity Presets
- **自然 (25%)**: Natural look, recommended for portraits
- **PS標準 (75%)**: Standard Photoshop adjustment layer intensity

## 🔍 Quality Analysis

The application provides real-time quality feedback to help you achieve the best results.

### Quality Indicators

#### 📊 画像品質情報 (Image Quality Information)
- **形式**: Shows file format and bit depth
- **推奨不透明度**: Recommended opacity range for your image

#### 🎯 処理品質 (Processing Quality)
Real-time analysis of your color grading:

- **優秀 (Excellent)**: 85-100 points
- **良好 (Good)**: 65-84 points  
- **普通 (Fair)**: 45-64 points
- **要改善 (Needs Improvement)**: Below 45 points

#### Quality Metrics
- **階調範囲**: Color space coverage (higher is better)
- **滑らかさ**: Gradient smoothness (higher is better)
- **アーティファクト**: Visible distortions (lower is better)

### Understanding Recommendations

#### For JPEG Images
- **High Compression**: Use lower opacity (15-30%)
- **Standard Quality**: Use moderate opacity (25-50%)
- **High Quality**: Use normal opacity (50-75%)

#### For PNG Images
- Generally allows higher opacity settings
- Better gradient handling
- Less prone to artifacts

### 8-bit Constraint Information
The application includes educational content about web browser limitations:

- **8-bit Processing**: Browsers are limited to 8-bit color processing
- **Professional Comparison**: 16-bit RAW processing in professional software offers more precision
- **Plugin Advantage**: The GLAZE Photoshop plugin provides 16-bit processing

## 🖼️ Preview and Results

### Preview Canvas
The right panel shows your processed image in real-time:

- **Automatic Updates**: Changes are applied instantly
- **Zoom Support**: Click and drag to pan around large images
- **Quality Preview**: See exactly how your adjustments affect the image

### Demo Version Limitations
This web version includes certain limitations:

- **Watermark**: Processed images include a watermark overlay
- **Export Restrictions**: No download functionality in demo mode
- **LUT Library**: Limited to 5 built-in presets

### Upgrading to Full Version
For complete functionality, consider the GLAZE Photoshop plugin:

- ✅ **No Watermarks**: Clean, professional output
- ✅ **Full Export**: Save in any format and resolution
- ✅ **Extended LUT Library**: Hundreds of professional LUTs
- ✅ **16-bit Processing**: Professional-grade color depth
- ✅ **Batch Processing**: Process multiple images at once
- ✅ **Advanced Features**: Film effects, grain, and more

## 💡 Tips for Best Results

### Image Selection
- **Use RAW or High-Quality JPEG**: Better source material = better results
- **Avoid Over-Compressed Images**: Heavy JPEG compression limits editing flexibility
- **Proper Exposure**: Well-exposed images respond better to color grading

### LUT Application Strategy

#### Single Layer Approach (Recommended for Beginners)
1. Start with Layer 1 only
2. Choose a LUT that matches your desired mood
3. Adjust opacity between 25-50% for natural results

#### Multi-Layer Approach (Advanced)
1. **Layer 1**: Primary color correction (25-40% opacity)
2. **Layer 2**: Creative enhancement (15-30% opacity)
3. **Layer 3**: Final polish or film emulation (10-25% opacity)

### Opacity Guidelines

#### Portrait Photography
- **Skin Tones**: Use 15-35% to maintain natural skin colors
- **Eye Enhancement**: Slightly higher opacity (25-45%) for dramatic eyes
- **Overall Look**: Conservative adjustments preserve natural beauty

#### Landscape Photography
- **Sky Enhancement**: 30-60% opacity for dramatic skies
- **Foliage**: 20-40% opacity to enhance greens without oversaturation
- **Golden Hour**: 40-75% opacity to enhance warm light

#### Creative/Artistic Work
- **Film Emulation**: 50-85% opacity for authentic film looks
- **Stylized Looks**: 60-100% opacity for strong creative effects
- **Commercial Work**: Adjust based on brand guidelines

### Common Adjustments

#### Too Strong Effect
- **Solution**: Reduce opacity by 10-25%
- **Alternative**: Switch to a more subtle LUT

#### Too Weak Effect
- **Solution**: Increase opacity gradually
- **Alternative**: Layer multiple subtle effects

#### Unnatural Skin Tones
- **Solution**: Reduce opacity to 15-25%
- **Alternative**: Use Layer 2 for selective enhancement

#### Loss of Detail
- **Solution**: Reduce opacity below 50%
- **Check**: Quality analysis for artifact warnings

## 🔧 Troubleshooting

### Image Won't Load
**Possible Causes:**
- File format not supported (use JPEG or PNG)
- File size too large (maximum 10MB)
- Image dimensions exceed 4096×4096
- File corrupted or incomplete

**Solutions:**
1. Convert to JPEG or PNG format
2. Reduce file size using image compression
3. Resize image to smaller dimensions
4. Try a different image file

### Slow Performance
**Possible Causes:**
- Large image size
- Multiple layers enabled
- Older graphics hardware
- Other browser tabs using resources

**Solutions:**
1. Reduce image size before upload
2. Use fewer simultaneous layers
3. Close other browser tabs
4. Restart browser to free memory

### WebGL Errors
**Possible Causes:**
- WebGL 2.0 not supported
- Graphics drivers outdated
- Hardware acceleration disabled

**Solutions:**
1. Update your web browser
2. Update graphics drivers
3. Enable hardware acceleration in browser settings
4. Try a different browser

### Poor Quality Results
**Possible Causes:**
- Low-quality source image
- Excessive opacity settings
- Multiple conflicting layers

**Solutions:**
1. Use higher quality source images
2. Reduce opacity settings
3. Disable conflicting layers
4. Check quality analysis recommendations

### Color Accuracy Issues
**Understanding Web Limitations:**
- Web browsers use 8-bit color processing
- Monitor calibration affects appearance
- Lighting conditions impact perception

**Best Practices:**
1. View results on a calibrated monitor
2. Use consistent lighting conditions
3. Compare with original image
4. Consider professional plugin for critical work

## 📱 Mobile Usage

### Touch Controls
- **Tap**: Select options and adjust settings
- **Drag**: Use sliders and controls
- **Pinch**: Zoom in preview canvas (if supported)

### Mobile Optimization
- Interface adapts to smaller screens
- Touch targets sized for finger operation
- Simplified layout for mobile devices

### Performance Notes
- Mobile devices may have slower processing
- Reduce image size for better performance
- Consider using single layers on mobile

## 🆘 Support and Resources

### Getting Help
- **Quality Analysis**: Built-in guidance system
- **Tooltips**: Hover over controls for explanations
- **Error Messages**: Clear feedback on issues

### Professional Upgrade
For advanced features and professional workflows:
- **GLAZE Photoshop Plugin**: Complete color grading solution
- **Technical Support**: Professional user assistance
- **Training Resources**: Video tutorials and documentation

### Community
- Share your results and get feedback
- Learn from other users' techniques
- Stay updated on new features and LUTs

---

## 🎯 Quick Reference

### Essential Workflow
1. **Upload** high-quality image (JPEG/PNG)
2. **Enable** Layer 1
3. **Select** appropriate LUT file
4. **Adjust** opacity (start with 25-50%)
5. **Review** quality analysis
6. **Fine-tune** based on recommendations

### Recommended Settings by Genre

| Genre | LUT Choice | Opacity Range | Notes |
|-------|------------|---------------|-------|
| Portrait | Anderson, Pastel Light | 15-35% | Preserve skin tones |
| Landscape | Blue Sierra, K-Ektar | 30-60% | Enhance natural colors |
| Street | Anderson, F-PRO400H | 25-50% | Film-like aesthetic |
| Fashion | K-Ektar, Blue Sierra | 40-75% | Bold, stylized looks |
| Wedding | Pastel Light, Anderson | 20-40% | Soft, romantic feel |

### Quality Optimization
- **JPEG**: Lower opacity, watch for artifacts
- **PNG**: More flexibility, higher opacity OK
- **Large Files**: May process slower but better quality
- **Small Files**: Faster processing, potential quality limits

---

**Enjoy creating beautiful, professionally-graded images with GLAZE!**

*For advanced features and professional workflows, consider upgrading to the full GLAZE Photoshop plugin.*