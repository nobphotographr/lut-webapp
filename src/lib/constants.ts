export const LUT_PRESETS = [
  { id: 'none', name: 'None', file: null },
  { id: 'anderson', name: 'Anderson', file: '/luts/Anderson.cube' },
  { id: 'blue-sierra', name: 'Blue Sierra', file: '/luts/Blue sierra.cube' },
  { id: 'f-pro400h', name: 'F-PRO400H', file: '/luts/F-PRO400H.cube' },
  { id: 'k-ektar', name: 'K-Ektar', file: '/luts/k-ektar.cube' },
  { id: 'pastel-light', name: 'Pastel Light', file: '/luts/pastel-light.cube' }
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (一般的な推奨値)
export const MAX_IMAGE_DIMENSION = 4096; // 4K対応 (一般的な推奨値)
export const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp']; // WebP追加
export const FALLBACK_MAX_DIMENSION = 2048; // WebGL制限時のフォールバック

export const WEBGL_CONFIG = {
  LUT_SIZE: 17,
  MAX_TEXTURE_SIZE: 4096, // 4K対応、実際の制限は動的取得
  WATERMARK_OPACITY: 0.3,
  WATERMARK_SIZE_RATIO: 0.1
};

export const UI_CONFIG = {
  LAYER_COUNT: 3,
  OPACITY_STEP: 0.01,
  PROCESSING_DEBOUNCE: 300,
  DEFAULT_OPACITY: 0.75, // Increased to match Photoshop standard
  RECOMMENDED_OPACITY: 0.65,
  PHOTOSHOP_STANDARD_OPACITY: 0.75,
  ENHANCED_OPACITY_MULTIPLIER: 1.2 // Additional enhancement factor
};

export const MARKETING_CONFIG = {
  PLUGIN_PURCHASE_URL: 'https://glaze-psplugin.studio.site/',
  LINE_URL: 'https://line.me/R/ti/p/@922brgnj',
  WATERMARK_TEXT: 'GLAZE デモ版',
  DEMO_LIMITATIONS: [
    '処理済み画像にはウォーターマークが追加されます',
    '完全版ではTurner Blend LUTコレクションとフィルムエフェクトが利用可能です'
  ]
};