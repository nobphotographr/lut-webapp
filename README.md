# 3D LUT Web Application

Professional color grading demo application built with Next.js and WebGL.

## 🌟 Features

- **3D LUT Color Grading**: Real-time color processing using WebGL shaders
- **Multi-Layer Support**: Apply up to 3 LUT layers with adjustable opacity
- **Professional Effects**: 5 built-in LUT presets (Cinematic, Vintage, Dramatic, Warm, Cool)
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Demo Limitations**: Watermark overlay and no download functionality (marketing strategy)

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Graphics**: WebGL 2.0 with custom shaders
- **Build**: Turbopack for fast development

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main page
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # UI components
│   │   ├── Header.tsx     # Header with plugin CTA
│   │   ├── ImageUploader.tsx  # Drag & drop uploader
│   │   ├── LUTController.tsx  # Layer controls
│   │   └── PreviewCanvas.tsx  # WebGL preview
├── hooks/
│   └── useLUTProcessor.ts # LUT processing hook
├── lib/
│   ├── types.ts           # TypeScript definitions
│   ├── constants.ts       # App constants
│   ├── lutProcessor.ts    # WebGL LUT engine
│   ├── lut-parser.ts      # .cube file parser
│   └── webgl-utils.ts     # WebGL utilities
└── public/
    └── luts/              # Sample LUT files
```

## 🎨 Features Overview

### Image Upload
- Drag & drop or click to upload
- Support for JPEG/PNG up to 10MB
- Max resolution: 4096×4096px
- Real-time validation

### LUT Processing
- WebGL-based 3D LUT processing
- Trilinear interpolation for smooth gradients
- Multi-layer blending with opacity control
- Real-time preview with debounced updates

### Marketing Integration
- Automatic watermark overlay
- Plugin purchase call-to-actions
- Feature limitation messaging
- Demo version branding

## 🧩 LUT File Format

Supports Adobe .cube format:
```
# LUT Name
LUT_3D_SIZE 17

# RGB values (0.0 to 1.0)
0.000000 0.000000 0.000000
0.062500 0.062500 0.062500
...
```

## 📱 Responsive Design

- **Desktop**: Full-width layout with side-by-side panels
- **Tablet**: Stacked layout with optimized controls
- **Mobile**: Single-column layout with touch-friendly UI

## 🔧 Configuration

### Environment Variables
```bash
NEXT_PUBLIC_PLUGIN_PURCHASE_URL=https://your-plugin-store.com
```

### Customization
- Modify `src/lib/constants.ts` for app settings
- Update LUT presets in `public/luts/`
- Customize watermark in `lutProcessor.ts`

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

## 📋 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

WebGL 2.0 support required for 3D LUT processing.
