# GLAZE LUT Web Application

Professional color grading demo application featuring real-time 3D LUT processing with Photoshop-compatible sequential cascade blending, built with Next.js 15, WebGL 2.0/1.0 with Canvas2D fallback, and the GLAZE design system.

*Latest update: Sequential cascade blending for Photoshop compatibility + Enhanced watermark protection + LINE announcement banner*

## 🌟 Key Features

### 🎨 Professional Color Grading
- **3D LUT Processing**: GPU-accelerated WebGL 2.0 with 8-point trilinear interpolation
- **Sequential Cascade Blending**: Photoshop-compatible transformation pipeline (画像 → LUT1変換 → LUT2変換 → 最終)
- **Multi-Layer Support**: Up to 3 simultaneous LUT layers with independent opacity control (default 100%)
- **Built-in LUT Library**: 5 professional presets (Anderson, Blue Sierra, F-PRO400H, K-Ektar, Pastel Light)
- **Real-time Preview**: Instant visual feedback with optimized rendering pipeline

### 🛡️ Demo Version Protection
- **Dual Watermark System**: Bottom-right corner + center overlay for larger images
- **Professional Watermarking**: Bold font with shadow effects and consistent 0.4 opacity
- **WebGL + Canvas2D Coverage**: Watermarks applied across all processing paths

### 📱 Mobile-First Design
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Touch Optimization**: 44px minimum touch targets and gesture-friendly controls
- **GLAZE Design System**: Consistent branding with the professional Photoshop plugin
- **Progressive Enhancement**: Graceful degradation for older browsers

### 🚀 Performance & Compatibility
- **WebGL 2.0 Acceleration**: GPU parallel processing for real-time preview
- **Browser Compatibility**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Optimized Loading**: Next.js 15 with Turbopack for fast development
- **Error Handling**: Comprehensive fallbacks and user feedback

## 🛠️ Technology Stack

### Frontend Framework
- **Next.js 15**: App Router, React 18, TypeScript 5.0
- **Tailwind CSS**: Utility-first CSS with GLAZE design tokens
- **WebGL 2.0**: Custom shaders for 3D LUT processing

### Core Libraries
- **3D LUT Engine**: Custom WebGL implementation with trilinear interpolation
- **Image Processing**: Canvas API with quality analysis algorithms
- **File Handling**: Adobe .cube format parser with validation
- **UI Components**: React hooks with responsive design patterns

### Quality & Validation
- **LUT Accuracy Testing**: Mathematical verification system
- **Real-time Analysis**: Tonal range, smoothness, and artifact detection
- **Performance Monitoring**: Frame rate and processing time tracking

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 18.0+
npm 9.0+ or yarn 1.22+
```

### Installation
```bash
# Clone the repository
git clone https://github.com/nobphotographr/lut-webapp.git
cd lut-webapp

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

### Build for Production
```bash
# Create optimized build
npm run build

# Start production server
npm start

# Or deploy to Vercel
vercel --prod
```

## 📁 Project Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # GLAZE design system + global styles
│   ├── layout.tsx         # Root layout with metadata
│   └── page.tsx           # Main application page
├── components/ui/          # Core UI components
│   ├── Header.tsx         # Navigation with GLAZE branding
│   ├── ImageUploader.tsx  # Drag & drop with validation
│   ├── LUTController.tsx  # Multi-layer LUT controls
│   ├── PreviewCanvas.tsx  # WebGL canvas with processing
│   └── QualityIndicator.tsx # Real-time quality analysis
├── hooks/                 # Custom React hooks
│   └── useLUTProcessor.ts # WebGL LUT processing engine
├── lib/                   # Core business logic
│   ├── constants.ts       # Configuration and presets
│   ├── lut-parser.ts     # Adobe .cube file parser
│   ├── lut-validator.ts  # Quality analysis & validation
│   ├── lut-debug-tools.ts # Accuracy testing utilities
│   ├── lutProcessor.ts   # Main WebGL processing engine
│   ├── types.ts          # TypeScript definitions
│   └── webgl-utils.ts    # WebGL utilities & shaders
└── public/
    ├── Logo.png           # GLAZE official branding
    └── luts/             # Professional LUT library
        ├── Anderson.cube
        ├── Blue sierra.cube
        ├── F-PRO400H.cube
        ├── k-ektar.cube
        └── pastel-light.cube
```

## 🎨 GLAZE Design System

### Color Palette
```css
Primary Background: #3d3d3d
Secondary Background: #2d2d2d
Button Background: rgb(60, 60, 60)
Accent Color: #4a90e2
Border Color: rgb(82, 82, 82)
Text Primary: #ffffff
Text Secondary: #e0e0e0
```

### Typography
- **Font Family**: Hiragino Kaku Gothic Pro, Inter, system-ui
- **Base Size**: 15px (matching Photoshop plugin)
- **Line Height**: 1.5
- **Responsive Scaling**: Mobile-optimized with sm: breakpoints

### Component Standards
- **Border Radius**: 6px (rounded-md)
- **Touch Targets**: Minimum 44px for mobile accessibility
- **Spacing**: Consistent with Tailwind spacing scale
- **Shadows**: Subtle depth for elevated elements

## 🧩 LUT Processing Engine

### WebGL Shader Implementation
```glsl
// 3D LUT fragment shader with trilinear interpolation
uniform sampler2D u_image;
uniform sampler2D u_lutTexture;
uniform float u_opacity;
uniform float u_lutSize;

vec3 sampleLUT(vec3 color, sampler2D lut, float size) {
    float scale = (size - 1.0) / size;
    float offset = 1.0 / (2.0 * size);
    vec3 lutCoord = color * scale + offset;
    return texture2D(lut, lutCoord.xy).rgb;
}
```

### Quality Analysis Algorithms
```typescript
interface QualityMetrics {
  tonalRange: number;      // 0-1, color space coverage
  smoothness: number;      // 0-1, gradient quality
  artifacts: number;       // 0-10, visible distortion
  score: number;          // 0-100, overall quality
  level: 'excellent' | 'good' | 'fair' | 'poor';
}
```

### 8-bit Optimization Features
- **Dithering**: Reduces banding in gradients
- **Adaptive Opacity**: Smart opacity adjustment for JPEG compression
- **Quality Guidance**: Real-time user recommendations
- **Photoshop Compatibility**: Matching professional workflow standards

## 📋 Browser Requirements

### Minimum Requirements
- **WebGL 2.0 Support**: Required for 3D LUT processing
- **ES2020 Features**: Modern JavaScript support
- **Canvas API**: Image manipulation capabilities
- **File API**: Drag & drop functionality

### Supported Browsers
| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 90+ | Full WebGL 2.0 support |
| Firefox | 88+ | Complete compatibility |
| Safari | 14+ | iOS 14+ for mobile |
| Edge | 90+ | Chromium-based versions |

### Performance Expectations
- **4K Images**: <2 seconds processing time
- **1080p Images**: <500ms processing time
- **Mobile Devices**: Optimized for 2GB+ RAM
- **Frame Rate**: 60fps UI, 30fps preview updates

## 🔧 Configuration

### Environment Variables
```bash
# Optional: Custom plugin purchase URL
NEXT_PUBLIC_PLUGIN_PURCHASE_URL=https://your-store.com/glaze-plugin

# Development: Enable debug features
NEXT_PUBLIC_DEBUG_MODE=true
```

### LUT Library Customization
```typescript
// src/lib/constants.ts
export const LUT_PRESETS = [
  { id: 'none', name: 'なし (Original)', file: null },
  { id: 'anderson', name: 'Anderson', file: '/luts/Anderson.cube' },
  // Add custom LUTs here
];
```

### Quality Analysis Tuning
```typescript
// src/lib/lut-validator.ts
const QUALITY_THRESHOLDS = {
  excellent: { tonalRange: 0.8, smoothness: 0.9, artifacts: 2 },
  good: { tonalRange: 0.6, smoothness: 0.7, artifacts: 4 },
  fair: { tonalRange: 0.4, smoothness: 0.5, artifacts: 6 },
};
```

## 🚀 Deployment Guide

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to production
vercel --prod

# Custom domain setup
vercel domains add your-domain.com
```

### Netlify Alternative
```bash
# Build the application
npm run build

# Deploy build folder
netlify deploy --prod --dir=out
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Performance Optimization

### Core Web Vitals Targets
- **LCP (Largest Contentful Paint)**: <2.5s
- **FID (First Input Delay)**: <100ms
- **CLS (Cumulative Layout Shift)**: <0.1

### Optimization Techniques
- **Image Optimization**: Next.js automatic optimization
- **Code Splitting**: Dynamic imports for LUT processing
- **WebGL Caching**: Shader compilation caching
- **Service Worker**: Future enhancement for offline support

## 🧪 Testing & Quality Assurance

### LUT Accuracy Testing
```bash
# Run LUT accuracy validation
npm run test:lut-accuracy

# Validate against Photoshop reference
npm run test:photoshop-compatibility
```

### Quality Analysis Testing
```typescript
// Test quality metrics calculation
const metrics = TonalAnalyzer.analyzeBeforeAfter(
  originalImageData,
  processedImageData,
  opacity
);
```

### Browser Compatibility Testing
- **BrowserStack**: Cross-browser validation
- **Device Testing**: Mobile device compatibility
- **WebGL Testing**: GPU driver compatibility

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Automated formatting
- **Commit Convention**: Conventional Commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

### Documentation
- **Technical Specs**: See `/docs` folder (coming soon)
- **API Reference**: JSDoc comments in source code
- **Component Guide**: Storybook integration (planned)

### Community
- **Issues**: [GitHub Issues](https://github.com/nobphotographr/lut-webapp/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nobphotographr/lut-webapp/discussions)
- **Plugin Support**: Contact for GLAZE Photoshop plugin

---

**Built with ❤️ for professional color grading workflows**

*Part of the GLAZE ecosystem - Professional color grading tools for photographers and filmmakers*